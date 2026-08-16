import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLinks, scanText, walkFiles } from "./check-links.mts";

describe("scanText", () => {
  test("reports stale waveluv URLs with line and column", () => {
    const content = "see https://waveluv.github.io/redspacem and nothing else\nok";
    const matches = scanText("README.md", content);
    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({ file: "README.md", line: 1, column: 13 });
    expect(matches[1]).toMatchObject({ file: "README.md", line: 1 });
  });

  test("matches bare waveluv and github.io substrings", () => {
    const matches = scanText("docs/x.md", "npm owner waveluv hosted on github.io");
    expect(matches.map((m) => m.url)).toEqual([
      "npm owner waveluv hosted on github.io",
      "npm owner waveluv hosted on github.io",
    ]);
  });

  test("no matches on clean content", () => {
    expect(scanText("README.md", "https://github.com/redspaceMP/sdk")).toHaveLength(0);
  });
});

describe("walkFiles", () => {
  test("skips node_modules, dist and generated files", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsm-links-"));
    await mkdir(join(root, "node_modules"), { recursive: true });
    await mkdir(join(root, "dist"), { recursive: true });
    await writeFile(join(root, "README.md"), "clean\n");
    await writeFile(join(root, "node_modules", "x.md"), "waveluv\n");
    await writeFile(join(root, "dist", "index.js"), "waveluv\n");
    await writeFile(join(root, "search-index.json"), "waveluv\n");

    const files = (await walkFiles(root)).map((f) => f.replaceAll("\\", "/").split("/").at(-1));
    expect(files).toEqual(["README.md"]);
  });
});

describe("checkLinks", () => {
  test("detects stale links across a fixture tree and reports file:line", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsm-links-"));
    await mkdir(join(root, "docs"), { recursive: true });
    await mkdir(join(root, "packages"), { recursive: true });
    await writeFile(join(root, "README.md"), "clean\n");
    await writeFile(join(root, "docs", "guide.md"), "see https://waveluv.github.io/x\n");
    await writeFile(join(root, "packages", "p.json"), '{"url":"waveluv"}\n');

    const matches = await checkLinks(root);
    expect(matches).toHaveLength(3);
    expect(matches.map((m) => `${m.file}:${m.line}`).sort()).toEqual([
      "docs/guide.md:1",
      "docs/guide.md:1",
      "packages/p.json:1",
    ]);
  });

  test("clean repo yields no matches", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsm-links-"));
    await writeFile(
      join(root, "README.md"),
      "docs: https://github.com/redspaceMP/sdk and https://redspace.online\n",
    );
    expect(await checkLinks(root)).toHaveLength(0);
  });
});
