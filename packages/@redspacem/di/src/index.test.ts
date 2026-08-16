import { describe, expect, test } from "bun:test";
import { Container, createContainer } from "./index.ts";

describe("Container", () => {
  test("resolve instantiates a registered factory", () => {
    const container = createContainer();
    container.register("config", () => ({ port: 4223 }));
    expect(container.resolve<{ port: number }>("config")).toEqual({ port: 4223 });
  });

  test("factory runs once (lazy singleton)", () => {
    const container = createContainer();
    let calls = 0;
    container.register("db", () => {
      calls += 1;
      return { ping: true };
    });

    const first = container.resolve("db");
    const second = container.resolve("db");
    expect(calls).toBe(1);
    expect(first).toBe(second);
  });

  test("factory is lazy: not invoked until first resolve", () => {
    const container = createContainer();
    let calls = 0;
    container.register("db", () => {
      calls += 1;
      return {};
    });
    expect(calls).toBe(0);
    container.resolve("db");
    expect(calls).toBe(1);
  });

  test("registerValue resolves the same value", () => {
    const container = createContainer();
    const value = { ready: true };
    container.registerValue("config", value);
    expect(container.resolve<{ ready: boolean }>("config")).toBe(value);
  });

  test("has reports bindings", () => {
    const container = createContainer();
    container.register("a", () => 1);
    container.registerValue("b", 2);
    expect(container.has("a")).toBe(true);
    expect(container.has("b")).toBe(true);
    expect(container.has("missing")).toBe(false);
  });

  test("resolve throws for unbound tokens", () => {
    const container = new Container();
    expect(() => container.resolve("missing")).toThrow(/No binding/);
  });

  test("re-registering overrides the previous binding", () => {
    const container = createContainer();
    container.registerValue("version", "0.1.0");
    container.registerValue("version", "0.2.0");
    expect(container.resolve<string>("version")).toBe("0.2.0");
  });
});
