import { describe, expect, test } from "bun:test";
import { RpcServer } from "@redspacem/rpc";
import type { MpPlayer } from "@redspacem/server-types";
import { createMemoryTransport, createMockMp } from "./index.ts";

const player: MpPlayer = { id: 1, name: "ada", pingMs: 20, connectedAt: 0 };

describe("createMockMp", () => {
  test("exposes the configured players and vehicles", () => {
    const mp = createMockMp({ players: [player] });
    expect(mp.players).toEqual([player]);
    expect(mp.vehicles).toEqual([]);
  });

  test("captures log lines via mp.log", () => {
    const mp = createMockMp();
    mp.log("info", "resource loaded");
    mp.log("error", "boom");
    expect(mp.logLines).toEqual([
      { level: "info", msg: "resource loaded" },
      { level: "error", msg: "boom" },
    ]);
  });

  test("clearLogs empties the recorded log", () => {
    const mp = createMockMp();
    mp.log("warn", "something");
    mp.clearLogs();
    expect(mp.logLines).toEqual([]);
  });

  test("emit dispatches to handlers subscribed via mp.events.on", () => {
    const mp = createMockMp();
    const seen: unknown[] = [];
    mp.events.on("playerJoin", (payload) => seen.push(payload));

    mp.emit("playerJoin", player);
    expect(seen).toEqual([player]);
  });

  test("runCommand invokes a registered command handler", () => {
    const mp = createMockMp();
    const calls: Array<{ name: string; args: string[] }> = [];
    mp.commands.register("givecar", (who, args) => {
      calls.push({ name: who.name, args });
    });

    mp.runCommand("givecar", player, ["sport_r7"]);
    expect(calls).toEqual([{ name: "ada", args: ["sport_r7"] }]);
  });

  test("runCommand no-ops for unknown commands", () => {
    const mp = createMockMp();
    expect(() => mp.runCommand("missing", player, [])).not.toThrow();
  });
});

describe("createMemoryTransport", () => {
  test("routes client calls to the server and back", async () => {
    const server = new RpcServer();
    server.on("add", (req: { a: number; b: number }) => req.a + req.b);
    const { client } = createMemoryTransport(server);

    const result = await client.call<number>("add", { a: 2, b: 5 });
    expect(result).toBe(7);
  });

  test("surfaces server errors as rejected promises", async () => {
    const server = new RpcServer();
    server.on("boom", () => {
      throw new Error("kaboom");
    });
    const { client } = createMemoryTransport(server);

    await expect(client.call("boom", {})).rejects.toThrow(/kaboom/);
  });
});
