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
