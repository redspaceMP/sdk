import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

export const STALE_PATTERNS: RegExp[] = [/waveluv/g, /github\.io/g, /redspacem\.github\.io/g];

export const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  ".vocs",
  ".cache",
  ".github",
]);

export const IGNORED_FILES = new Set([
  "search-index.json",
  "pages.gen.ts",
  "bun.lock",
  "bun.lockb",
]);

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".toml",
  ".yaml",
  ".yml",
  ".txt",
  ".html",
  ".css",
]);

export interface LinkMatch {
  file: string;
  line: number;
  column: number;
  url: string;
}

export function scanText(
  filePath: string,
  content: string,
  patterns: RegExp[] = STALE_PATTERNS,
): LinkMatch[] {
  const matches: LinkMatch[] = [];
  const lines = content.split(/\r?\n/);
  for (const pattern of patterns) {
    const re = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
    );
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      re.lastIndex = 0;
      for (const hit of line.matchAll(re)) {
        if (hit.index === undefined) continue;
        const start = Math.max(0, hit.index - 60);
        const end = Math.min(line.length, hit.index + hit[0].length + 120);
        matches.push({
          file: filePath,
          line: i + 1,
          column: hit.index + 1,
          url: line.slice(start, end),
        });
      }
    }
  }
  return matches;
}

export async function walkFiles(
  root: string,
  ignoredDirs: Set<string> = IGNORED_DIRS,
  ignoredFiles: Set<string> = IGNORED_FILES,
): Promise<string[]> {
  const files: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) continue;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) stack.push(join(dir, entry.name));
      } else if (entry.isFile()) {
        if (ignoredFiles.has(entry.name)) continue;
        const ext = extname(entry.name).toLowerCase();
        if (!TEXT_EXTENSIONS.has(ext)) continue;
        files.push(join(dir, entry.name));
      }
    }
  }
  return files;
}

export async function checkLinks(
  root: string,
  patterns: RegExp[] = STALE_PATTERNS,
): Promise<LinkMatch[]> {
  const files = await walkFiles(root);
  const all: LinkMatch[] = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const rel = relative(root, file).replace(/\\/g, "/");
    all.push(...scanText(rel, content, patterns));
  }
  return all.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

async function main(): Promise<void> {
  const root = resolve(process.argv[2] ?? process.cwd());
  const matches = await checkLinks(root);
  if (matches.length === 0) {
    console.log("No stale URLs found. Clean.");
    return;
  }
  for (const match of matches) {
    console.log(`${match.file}:${match.line}:${match.column} -> ${match.url}`);
  }
  console.error(`Found ${matches.length} stale URL reference(s).`);
  process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
