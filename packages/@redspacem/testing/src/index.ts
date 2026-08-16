// Testing helpers: a mock `mp.*` host for unit-testing gamemode resources, and
// an in-memory RPC transport pairing a client with a server.

import { RpcClient, type RpcServer } from "@redspacem/rpc";
import type {
  Mp,
  MpCommandHandler,
  MpCommands,
  MpEventHandler,
  MpEventMap,
  MpEvents,
  MpPlayer,
  MpVehicle,
} from "@redspacem/server-types";

/** Options for `createMockMp`. */
export interface MockMpOptions {
  players?: MpPlayer[];
  vehicles?: MpVehicle[];
}

/** The `mp` mock with recording and inspection helpers on top of `Mp`. */
export interface MockMp extends Mp {
  /** Log lines captured via `mp.log`. */
  logLines: Array<{ level: "info" | "warn" | "error"; msg: string }>;
  /** Emit a host event into the in-memory bus. */
  emit<K extends keyof MpEventMap>(name: K, payload: MpEventMap[K]): void;
  /** Invoke a registered command handler with the given player and args. */
  runCommand(name: string, player: MpPlayer, args: string[]): void;
  /** Clear recorded log lines. */
  clearLogs(): void;
}

/**
 * Create an `Mp`-shaped mock backed by in-memory event bus, command registry
 * and log recording — useful for unit-testing gamemode resources in Bun.
 */
export function createMockMp(options: MockMpOptions = {}): MockMp {
  const players = [...(options.players ?? [])];
  const vehicles = [...(options.vehicles ?? [])];
  const logLines: MockMp["logLines"] = [];
  const listeners = new Map<keyof MpEventMap, Set<(payload: unknown) => void>>();
  const commandHandlers = new Map<string, MpCommandHandler>();

  const events: MpEvents = {
    on<K extends keyof MpEventMap>(name: K, handler: MpEventHandler<K>): void {
      let set = listeners.get(name);
      if (set === undefined) {
        set = new Set();
        listeners.set(name, set);
      }
      set.add(handler as (payload: unknown) => void);
    },
    emit<K extends keyof MpEventMap>(name: K, payload: MpEventMap[K]): void {
      const set = listeners.get(name);
      if (set === undefined) {
        return;
      }
      for (const handler of set) {
        handler(payload);
      }
    },
  };

  const commands: MpCommands = {
    register(name: string, handler: MpCommandHandler): void {
      commandHandlers.set(name, handler);
    },
  };

  return {
    players,
    vehicles,
    events,
    commands,
    log(level, msg): void {
      logLines.push({ level, msg });
    },
    emit(name, payload) {
      events.emit(name, payload);
    },
    runCommand(name, player, args) {
      const handler = commandHandlers.get(name);
      if (handler !== undefined) {
        handler(player, args);
      }
    },
    clearLogs() {
      logLines.length = 0;
    },
    logLines,
  };
}

/** A client wired to a server over an in-memory transport. */
export interface MemoryTransport {
  server: RpcServer;
  client: RpcClient;
}

/**
 * Create an in-memory transport between a new `RpcClient` and the given
 * `RpcServer`: every `client.call` is dispatched to the server synchronously
 * and the matching response is routed back by id.
 */
export function createMemoryTransport(server: RpcServer): MemoryTransport {
  const state: { client: RpcClient | null } = { client: null };
  const client = new RpcClient({
    send(raw: string): void {
      server.handle(raw).then((res) => {
        state.client?.handleResponse(res);
      });
    },
  });
  state.client = client;
  return { server, client };
}
