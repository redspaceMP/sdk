import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const REPO_URL = "git+https://github.com/redspaceMP/sdk.git";
const BUGS_URL = "https://github.com/redspaceMP/sdk/issues";

export interface PackageJson {
  name?: string;
  version?: string;
  repository?: unknown;
  homepage?: string;
  bugs?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  sideEffects?: unknown;
  engines?: Record<string, string>;
  [key: string]: unknown;
}

export interface UpdateOptions {
  /** New version to write for every package. */
  version: string;
  /** Pinned range used for cross-package @redspacem/* dependencies. */
  pin: string;
}

export interface UpdateResult {
  path: string;
  name: string;
  version: string;
  pinned: string[];
}

export function packageDirectory(name: string): string {
  return `packages/@redspacem/${name}`;
}

export function updatePackage(pkg: PackageJson, opts: UpdateOptions): PackageJson {
  const name = pkg.name ?? "";
  const bareName = name.replace(/^@redspacem\//, "");
  const next: PackageJson = {
    ...pkg,
    version: opts.version,
    repository: {
      type: "git",
      url: REPO_URL,
      directory: packageDirectory(bareName),
    },
    homepage: `https://www.npmjs.com/package/@redspacem/${bareName}`,
    bugs: {
      url: BUGS_URL,
    },
  };

  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = next[key];
    if (!deps || typeof deps !== "object") continue;
    for (const dep of Object.keys(deps)) {
      if (dep.startsWith("@redspacem/")) {
        (next[key] as Record<string, string>)[dep] = opts.pin;
      }
    }
  }

  if (pkg.sideEffects === undefined) {
    next.sideEffects = false;
  }
  const existingEngines =
    typeof pkg.engines === "object" && pkg.engines !== null
      ? { ...(pkg.engines as Record<string, string>) }
      : {};
  next.engines = {
    ...existingEngines,
    ...(existingEngines.node ? {} : { node: ">=20" }),
  };

  return next;
}

export async function listPackages(scopeDir: string): Promise<string[]> {
  const entries = await readdir(scopeDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(scopeDir, entry.name))
    .sort();
}

export async function readPackage(path: string): Promise<PackageJson> {
  const raw = await readFile(join(path, "package.json"), "utf8");
  return JSON.parse(raw) as PackageJson;
}

export async function writePackage(path: string, pkg: PackageJson): Promise<void> {
  const raw = `${JSON.stringify(pkg, null, 2)}\n`;
  await writeFile(join(path, "package.json"), raw, "utf8");
}

export async function bumpScope(scopeDir: string, opts: UpdateOptions): Promise<UpdateResult[]> {
  const results: UpdateResult[] = [];
  const paths = await listPackages(scopeDir);
  for (const path of paths) {
    const pkg = await readPackage(path);
    if (!pkg.name) continue;
    const updated = updatePackage(pkg, opts);
    await writePackage(path, updated);
    results.push({
      path,
      name: pkg.name,
      version: opts.version,
      pinned: crossPins(updated).map(([dep, range]) => `${dep}@${range}`),
    });
  }
  return results;
}

function crossPins(pkg: PackageJson): [string, string][] {
  const pins: [string, string][] = [];
  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[key];
    if (!deps || typeof deps !== "object") continue;
    for (const [dep, range] of Object.entries(deps)) {
      if (dep.startsWith("@redspacem/")) pins.push([dep, range]);
    }
  }
  return pins.sort((a, b) => a[0].localeCompare(b[0]));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const version = args.find((arg) => /^\d+\.\d+\.\d+/.test(arg));
  if (!version) {
    console.error("usage: bun tools/version-bump.mts <new-version>");
    process.exit(1);
  }
  const scope = resolve(process.cwd(), "packages/@redspacem");
  const results = await bumpScope(scope, { version, pin: `^${version}` });
  for (const result of results) {
    const dir = result.path.replace(/\\/g, "/").split("/packages/@redspacem/").pop();
    console.log(
      `${result.name} -> ${result.version} (${dir}${result.pinned.length ? `; pins: ${result.pinned.join(", ")}` : ""})`,
    );
  }
  console.log(`Updated ${results.length} package(s) to ${version}.`);
}

if (import.meta.main) {
  await main();
}
