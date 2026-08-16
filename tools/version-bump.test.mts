import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bumpScope, type PackageJson, updatePackage } from "./version-bump.mts";

function fixturePkg(overrides: Record<string, unknown> = {}): PackageJson {
  return {
    name: "@redspacem/testing",
    version: "0.1.1",
    description: "fixture",
    license: "MIT",
    type: "module",
    main: "./dist/index.js",
    dependencies: {
      "@redspacem/rpc": "^0.1.1",
      "@redspacem/server-types": "^0.1.1",
    },
    scripts: { build: "tsc" },
    ...overrides,
  };
}

describe("updatePackage", () => {
  test("bumps version and pins cross-package dependencies", () => {
    const updated = updatePackage(fixturePkg(), { version: "0.1.2", pin: "^0.1.2" });
    expect(updated.version).toBe("0.1.2");
    expect(updated.dependencies?.["@redspacem/rpc"]).toBe("^0.1.2");
    expect(updated.dependencies?.["@redspacem/server-types"]).toBe("^0.1.2");
  });

  test("writes redspaceMP repository metadata with scoped directory", () => {
    const updated = updatePackage(fixturePkg(), { version: "0.1.2", pin: "^0.1.2" });
    expect(updated.repository).toEqual({
      type: "git",
      url: "git+https://github.com/redspaceMP/sdk.git",
      directory: "packages/@redspacem/testing",
    });
    expect(updated.homepage).toBe("https://www.npmjs.com/package/@redspacem/testing");
    expect(updated.bugs).toEqual({ url: "https://github.com/redspaceMP/sdk/issues" });
  });

  test("adds sideEffects false and node >=20 engines", () => {
    const updated = updatePackage(fixturePkg(), { version: "0.1.2", pin: "^0.1.2" });
    expect(updated.sideEffects).toBe(false);
    expect(updated.engines).toEqual({ node: ">=20" });
  });

  test("preserves existing engines and user-supplied sideEffects", () => {
    const updated = updatePackage(fixturePkg({ engines: { node: ">=22" }, sideEffects: true }), {
      version: "0.1.2",
      pin: "^0.1.2",
    });
    expect(updated.engines).toEqual({ node: ">=22" });
    expect(updated.sideEffects).toBe(true);
  });
});

describe("bumpScope", () => {
  test("updates every package on disk with correct pins", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rsm-bump-"));
    await mkdir(join(dir, "server-types"), { recursive: true });
    await mkdir(join(dir, "testing"), { recursive: true });
    await writeFile(
      join(dir, "server-types", "package.json"),
      JSON.stringify(
        { ...fixturePkg({ name: "@redspacem/server-types", dependencies: undefined }) },
        null,
        2,
      ),
    );
    await writeFile(join(dir, "testing", "package.json"), JSON.stringify(fixturePkg(), null, 2));

    const results = await bumpScope(dir, { version: "0.1.2", pin: "^0.1.2" });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.name).sort()).toEqual([
      "@redspacem/server-types",
      "@redspacem/testing",
    ]);

    const testing = JSON.parse(
      await readFile(join(dir, "testing", "package.json"), "utf8"),
    ) as PackageJson;
    expect(testing.version).toBe("0.1.2");
    expect(testing.dependencies?.["@redspacem/rpc"]).toBe("^0.1.2");
    expect(testing.repository).toEqual({
      type: "git",
      url: "git+https://github.com/redspaceMP/sdk.git",
      directory: "packages/@redspacem/testing",
    });
    expect(testing.homepage).toBe("https://www.npmjs.com/package/@redspacem/testing");
    expect(testing.sideEffects).toBe(false);
    expect(testing.engines?.node).toBe(">=20");
  });
});
