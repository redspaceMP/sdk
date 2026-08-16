import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { PackageJson } from "./version-bump.mts";

const DEFAULT_SCOPE = "packages/@redspacem";
const DEFAULT_ORDER = [
  "@redspacem/server-types",
  "@redspacem/rpc",
  "@redspacem/di",
  "@redspacem/client-types",
  "@redspacem/browser-types",
  "@redspacem/testing",
];

export interface PublishPackage {
  name: string;
  path: string;
  version: string;
  deps: string[];
}

export interface OrderOptions {
  order?: string[];
}

/**
 * Topologically sorts packages so every dependency publishes before its
 * dependents. The explicit `order` seeds the queue (falling back to the
 * canonical order); known transitive dependencies are pulled in automatically.
 */
export function publishOrder(packages: PublishPackage[], opts: OrderOptions = {}): string[] {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const known = new Set(byName.keys());
  const explicit = (opts.order ?? DEFAULT_ORDER).filter((name) => known.has(name));
  const seed = explicit.length > 0 ? explicit : [...known];
  const baseIndex = new Map<string, number>();
  DEFAULT_ORDER.forEach((name, i) => {
    baseIndex.set(name, i);
  });
  explicit.forEach((name, i) => {
    baseIndex.set(name, i);
  });

  const closure = new Set<string>();
  const visit = (name: string): void => {
    if (closure.has(name)) return;
    closure.add(name);
    const pkg = byName.get(name);
    if (!pkg) return;
    for (const dep of pkg.deps) {
      if (known.has(dep)) visit(dep);
    }
  };
  for (const name of seed) visit(name);

  const rank = new Map<string, number>();
  const depth = (name: string, stack: Set<string>): number => {
    const cached = rank.get(name);
    if (cached !== undefined) return cached;
    if (stack.has(name)) return 0;
    stack.add(name);
    const pkg = byName.get(name);
    let max = 0;
    if (pkg) {
      for (const dep of pkg.deps) {
        if (!known.has(dep)) continue;
        max = Math.max(max, depth(dep, stack) + 1);
      }
    }
    stack.delete(name);
    rank.set(name, max);
    return max;
  };
  for (const name of closure) depth(name, new Set());

  const sorted = [...closure].sort((a, b) => {
    const byDepth = (rank.get(a) ?? 0) - (rank.get(b) ?? 0);
    if (byDepth !== 0) return byDepth;
    return (
      (baseIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (baseIndex.get(b) ?? Number.MAX_SAFE_INTEGER)
    );
  });
  return sorted;
}

export async function loadPackages(scopeDir: string): Promise<PublishPackage[]> {
  const { listPackages, readPackage } = await import("./version-bump.mts");
  const paths = await listPackages(scopeDir);
  const packages: PublishPackage[] = [];
  for (const path of paths) {
    const pkg = (await readPackage(path)) as PackageJson;
    if (!pkg.name || !pkg.version) continue;
    packages.push({
      name: pkg.name,
      path,
      version: pkg.version,
      deps: Object.keys(pkg.dependencies ?? {}).filter((dep) => dep.startsWith("@redspacem/")),
    });
  }
  return packages;
}

export async function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  const command = [cmd, ...args].join(" ");
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, { cwd, stdio: "inherit", shell: true });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`command "${command}" exited with code ${code}`));
    });
  });
}

export async function publishPackages(opts: {
  scopeDir: string;
  dryRun?: boolean;
  npmrcPath?: string;
  order?: string[];
}): Promise<string[]> {
  const packages = await loadPackages(opts.scopeDir);
  const order = publishOrder(packages, { order: opts.order });

  if (opts.dryRun) {
    console.log("Publish order (dry run):");
    for (const name of order) {
      const pkg = packages.find((p) => p.name === name);
      console.log(`  ${name}@${pkg?.version}`);
    }
    return order;
  }

  const env = { ...process.env };
  if (opts.npmrcPath) {
    env.NPM_CONFIG_USERCONFIG = resolve(opts.npmrcPath);
  }

  for (const name of order) {
    const pkg = packages.find((p) => p.name === name);
    if (!pkg) continue;
    console.log(`\nPublishing ${name}@${pkg.version} from ${pkg.path}`);
    await runCommand("bun", ["run", "build"], pkg.path);
    await runCommand("bun", ["publish", "--access", "public"], pkg.path);
  }
  return order;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const scopeDir = resolve(process.cwd(), DEFAULT_SCOPE);
  const npmrcPath = args.find((arg) => arg.startsWith("--npmrc="))?.split("=")[1];
  const dryRun = args.includes("--dry-run");
  await publishPackages({ scopeDir, dryRun, npmrcPath });
}

if (import.meta.main) {
  await main();
}
