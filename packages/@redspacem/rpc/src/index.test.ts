import { describe, expect, test } from "bun:test";
import { createTypedRpc, RpcClient, RpcServer } from "./index.ts";

/** Pair a client and server over an in-memory transport. */
function makeClient(server: RpcServer): RpcClient {
  let client: RpcClient;
  client = new RpcClient({
    send(raw: string): void {
      server.handle(raw).then((res) => {
        client.handleResponse(res);
      });
    },
  });
  return client;
}

describe("RpcServer + RpcClient over an in-memory transport", () => {
  test("calls a registered method", async () => {
    const server = new RpcServer();
    server.on("add", (req: { a: number; b: number }) => req.a + req.b);
    const client = makeClient(server);

    const result = await client.call<number>("add", { a: 2, b: 3 });
    expect(result).toBe(5);
  });

  test("rejects unknown methods", async () => {
    const server = new RpcServer();
    const client = makeClient(server);

    await expect(client.call("nope", {})).rejects.toThrow(/unknown method/);
  });

  test("rejects handler exceptions with the error message", async () => {
    const server = new RpcServer();
    server.on("boom", () => {
      throw new Error("kaboom");
    });
    const client = makeClient(server);

    await expect(client.call("boom", {})).rejects.toThrow(/kaboom/);
  });

  test("resolves concurrent calls to the right ids out of order", async () => {
    const server = new RpcServer();
    server.on("echo", async (req: { v: number }) => {
      await Bun.sleep(10 - req.v);
      return req.v;
    });
    const client = makeClient(server);

    const results = await Promise.all([
      client.call<number>("echo", { v: 1 }),
      client.call<number>("echo", { v: 2 }),
      client.call<number>("echo", { v: 3 }),
    ]);
    expect(results).toEqual([1, 2, 3]);
  });

  test("createTypedRpc registers a typed method table", async () => {
    const server = new RpcServer();
    const api = createTypedRpc(server).define({
      greet: (req: { name: string }) => `hello ${req.name}`,
      add: (req: { a: number; b: number }) => req.a + req.b,
    });
    const client = makeClient(server);

    const greeting = await api.call(client, "greet", { name: "red" });
    expect(greeting).toBe("hello red");
    const sum = await api.call(client, "add", { a: 1, b: 2 });
    expect(sum).toBe(3);
  });
});

describe("RpcServer.handle malformed input", () => {
  test("returns an error response for invalid JSON", async () => {
    const server = new RpcServer();
    expect(await server.handle("{not json")).toBe(
      JSON.stringify({ id: 1, ok: false, error: "invalid JSON" }),
    );
  });

  test("returns an error response for a null payload instead of crashing", async () => {
    const server = new RpcServer();
    expect(await server.handle("null")).toBe(
      JSON.stringify({ id: 1, ok: false, error: "invalid request" }),
    );
  });

  test("returns an error response for a non-string method", async () => {
    const server = new RpcServer();
    expect(await server.handle('{"id": 7, "method": 42, "req": null}')).toBe(
      JSON.stringify({ id: 7, ok: false, error: "invalid method" }),
    );
  });

  test("echoes a numeric id from the request", async () => {
    const server = new RpcServer();
    server.on("pong", () => "pong");
    const raw = await server.handle(JSON.stringify({ id: 42, method: "pong", req: null }));
    expect(JSON.parse(raw)).toEqual({ id: 42, ok: true, res: "pong" });
  });

  test("assigns a fresh id when the request has no numeric id", async () => {
    const server = new RpcServer();
    const raw = await server.handle(JSON.stringify({ method: "nope", req: null }));
    expect(JSON.parse(raw)).toEqual({ id: 1, ok: false, error: "unknown method: nope" });
  });
});

describe("RpcClient serialization and timeouts", () => {
  test("round-trips nested request payloads through JSON", async () => {
    const server = new RpcServer();
    server.on("echo", (req: unknown) => req);
    const client = makeClient(server);
    const payload = { nested: { list: [1, 2, { deep: true }] }, str: "x" };

    const echoed = await client.call("echo", payload);
    expect(echoed).toEqual(payload);
  });

  test("rejects a call that exceeds timeoutMs and frees the pending slot", async () => {
    const server = new RpcServer();
    server.on("slow", async () => {
      await Bun.sleep(50);
      return "done";
    });
    const client = makeClient(server);

    await expect(client.call("slow", {}, 5)).rejects.toThrow(/timed out/);
    const again = await client.call<string>("slow", {}, 100);
    expect(again).toBe("done");
  });

  test("resolves before the timeout and clears the timer", async () => {
    const server = new RpcServer();
    server.on("fast", () => "ok");
    const client = makeClient(server);

    await expect(client.call("fast", {}, 5)).resolves.toBe("ok");
  });

  test("rejects when the transport throws synchronously", async () => {
    const client = new RpcClient({
      send(): void {
        throw new Error("transport down");
      },
    });

    await expect(client.call("x", {})).rejects.toThrow(/transport down/);
  });

  test("ignores malformed and unknown responses", async () => {
    const server = new RpcServer();
    server.on("pong", () => "pong");
    const client = makeClient(server);

    const promise = client.call("pong", {});
    client.handleResponse("not json");
    client.handleResponse("null");
    client.handleResponse(JSON.stringify({ id: 999, ok: true, res: 1 }));
    await expect(promise).resolves.toBe("pong");
  });
});
