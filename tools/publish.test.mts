import { describe, expect, test } from "bun:test";
import { type PublishPackage, publishOrder } from "./publish.mts";

function pkg(name: string, deps: string[] = []): PublishPackage {
  return { name, path: `/pkg/${name}`, version: "0.1.2", deps };
}

const ALL = [
  pkg("@redspacem/server-types"),
  pkg("@redspacem/rpc"),
  pkg("@redspacem/di"),
  pkg("@redspacem/client-types", ["@redspacem/server-types"]),
  pkg("@redspacem/browser-types"),
  pkg("@redspacem/testing", ["@redspacem/rpc", "@redspacem/server-types"]),
];

describe("publishOrder", () => {
  test("puts dependencies before dependents", () => {
    const order = publishOrder(ALL);
    const idx = (name: string) => order.indexOf(name);
    expect(order).toHaveLength(6);
    expect(idx("@redspacem/server-types")).toBeLessThan(idx("@redspacem/client-types"));
    expect(idx("@redspacem/server-types")).toBeLessThan(idx("@redspacem/testing"));
    expect(idx("@redspacem/rpc")).toBeLessThan(idx("@redspacem/testing"));
  });

  test("starts with the dependency-free packages", () => {
    const order = publishOrder(ALL);
    const first = order.slice(0, 4);
    expect(first).toContain("@redspacem/server-types");
    expect(first).toContain("@redspacem/rpc");
    expect(first).toContain("@redspacem/di");
    expect(first).toContain("@redspacem/browser-types");
    expect(order.at(-1)).toBe("@redspacem/testing");
  });

  test("ignores unknown package names and unknown dependencies", () => {
    const order = publishOrder(ALL, { order: ["@redspacem/testing", "bogus"] });
    expect(order).not.toContain("bogus");
    expect(order[0]).toBe("@redspacem/server-types");
    expect(order.at(-1)).toBe("@redspacem/testing");
  });

  test("handles diamond dependencies without infinite recursion", () => {
    const diamond = [pkg("a"), pkg("b", ["a"]), pkg("c", ["a"]), pkg("d", ["b", "c"])];
    const order = publishOrder(diamond);
    const idx = (name: string) => order.indexOf(name);
    expect(idx("a")).toBeLessThan(idx("b"));
    expect(idx("a")).toBeLessThan(idx("c"));
    expect(idx("b")).toBeLessThan(idx("d"));
    expect(idx("c")).toBeLessThan(idx("d"));
  });
});
