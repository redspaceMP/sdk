import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES_DIR = join(ROOT, "src", "pages");
const OUT_FILE = join(ROOT, "public", "search-index.json");
const CACHE_DIR = join(ROOT, ".cache", "transformers");

const MODEL = "Xenova/all-MiniLM-L6-v2";
const INDEX_VERSION = 1;
const MAX_CHUNK_WORDS = 600;
const OVERLAP_WORDS = 60;

const headingRe = /^(#{1,4})\s+(.+)$/;
const frontmatterRe = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function slugFor(filePath) {
  const rel = relative(PAGES_DIR, filePath).replaceAll("\\", "/");
  const noExt = rel.replace(/\.[^.]+$/, "");
  const parts = noExt.split("/").filter((p) => p && p !== "index");
  const url = `/${parts.join("/")}` || "/";
  return { url, rel };
}

function langFor(filePath) {
  const rel = relative(PAGES_DIR, filePath).replaceAll("\\", "/");
  return rel.startsWith("ru/") ? "ru" : "en";
}

function parseFrontmatter(content) {
  const match = content.match(frontmatterRe);
  if (!match) return { frontmatter: {}, body: content };
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fm[key] = value;
  }
  return { frontmatter: fm, body: content.slice(match[0].length) };
}

function cleanText(text) {
  return text
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^\s*[-*_]\s*$/gm, " ")
    .replace(/[#>*|_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkByHeading(filePath) {
  const { frontmatter, body } = parseFrontmatter(filePath);
  const sections = [];
  let heading = "";
  let buffer = [];
  const flush = () => {
    const text = cleanText(buffer.join("\n"));
    if (text.length > 0) sections.push({ heading, text });
    buffer = [];
  };
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(headingRe);
    if (h) {
      flush();
      heading = h[2].trim();
    } else if (line.trim()) {
      buffer.push(line);
    }
  }
  flush();
  return { frontmatter, sections };
}

function splitLong(section, maxWords, overlap) {
  const words = section.text.split(" ");
  if (words.length <= maxWords) return [section];
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const slice = words.slice(i, i + maxWords);
    chunks.push({ heading: section.heading, text: slice.join(" ") });
    i += maxWords - overlap;
  }
  return chunks;
}

function pageTitle(frontmatter, sections) {
  if (frontmatter.title) return String(frontmatter.title);
  const h1 = sections.find((s) => s.heading);
  return h1?.heading ?? "";
}

function bigrams(text) {
  const words = text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/)
    .filter((w) => w.length > 1);
  const out = new Set();
  for (let i = 0; i < words.length - 1; i++) {
    out.add(`${words[i]} ${words[i + 1]}`);
  }
  for (const w of words) out.add(w);
  return out;
}

function keywordIndex(chunks) {
  const df = new Map();
  const bigramCounts = chunks.map((chunk) => {
    const toks = [...bigrams(chunk.text)];
    for (const t of toks) df.set(t, (df.get(t) ?? 0) + 1);
    return toks;
  });
  const idf = {};
  for (const [term, count] of df) {
    idf[term] = Math.log((chunks.length + 1) / (count + 1)) + 1;
  }
  return { idf, bigramCounts };
}

async function listMd(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && [".md", ".mdx"].includes(extname(entry.name).toLowerCase())) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

async function main() {
  await mkdir(dirname(OUT_FILE), { recursive: true });
  const files = await listMd(PAGES_DIR);

  const chunks = [];
  const titles = new Map();
  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const { frontmatter, sections } = chunkByHeading(raw);
    const { url, rel } = slugFor(file);
    const lang = langFor(file);
    const title = pageTitle(frontmatter, sections);
    titles.set(url, title);
    let n = 0;
    for (const section of sections) {
      for (const piece of splitLong(section, MAX_CHUNK_WORDS, OVERLAP_WORDS)) {
        chunks.push({
          id: `${rel}-${n++}`,
          url,
          lang,
          title,
          heading: piece.heading,
          text: piece.text,
        });
      }
    }
  }

  const { idf, bigramCounts } = keywordIndex(chunks);
  const result = {
    version: INDEX_VERSION,
    model: MODEL,
    mode: "keyword",
    idf,
    chunks: chunks.map((chunk, i) => ({
      ...chunk,
      tokens: bigramCounts[i],
    })),
  };

  let embedded = false;
  try {
    const { env, pipeline } = await import("@xenova/transformers");
    env.cacheDir = CACHE_DIR;
    env.allowLocalModels = true;
    const embedder = await pipeline("feature-extraction", MODEL);
    const embedTexts = chunks.map((c) => c.text.split(" ").slice(0, 480).join(" "));
    const outputs = [];
    const BATCH = 16;
    for (let i = 0; i < embedTexts.length; i += BATCH) {
      const batch = embedTexts.slice(i, i + BATCH);
      const out = await embedder(batch, { pooling: "mean", normalize: true });
      const list =
        typeof out.tolist === "function"
          ? out.tolist()
          : Array.isArray(out)
            ? out.map((item) =>
                Array.isArray(item) ? item : Array.from(item.data ?? item.tolist?.() ?? []),
              )
            : [Array.from(out.data ?? [])];
      for (const row of list) {
        if (Array.isArray(row)) outputs.push(Array.from(row));
      }
    }
    for (let i = 0; i < chunks.length; i++) {
      result.chunks[i].embedding = outputs[i];
    }
    result.mode = "semantic";
    embedded = true;
    console.log(
      `Embedded ${chunks.length} chunks with ${MODEL} (${outputs[0]?.length ?? 0} dims).`,
    );
  } catch (err) {
    console.warn(
      `[search-index] embedding unavailable (${err?.message ?? err}); emitting keyword-only index.`,
    );
  }

  await writeFile(OUT_FILE, JSON.stringify(result), "utf8");
  const bytes = Buffer.byteLength(JSON.stringify(result));
  console.log(
    `Wrote ${OUT_FILE} (${chunks.length} chunks, ${result.mode} mode, ${(bytes / 1024 / 1024).toFixed(2)} MB, embedded=${embedded}).`,
  );
}

main().catch((err) => {
  console.error("[search-index] failed:", err);
  process.exitCode = 1;
});
