# @redspacem/testing

Testing helpers for RedSpace resources.

- `createMockMp` — an `Mp`-shaped mock with in-memory event bus, command
  registry and log recording, for unit-testing gamemode logic
- `createMemoryTransport` — wires an `RpcClient` to an `RpcServer` in memory

Depends on `@redspacem/server-types` and `@redspacem/rpc`.

## Install

```sh
bun add -d @redspacem/testing
```

## Example

```ts
import { createMemoryTransport, createMockMp } from "@redspacem/testing";
import { RpcServer } from "@redspacem/rpc";

const mp = createMockMp();
mp.events.on("playerJoin", (player) => mp.log("info", `welcome ${player.name}`));
mp.emit("playerJoin", { id: 1, name: "ada", pingMs: 20, connectedAt: 0 });
console.log(mp.logLines);

const server = new RpcServer();
server.on("add", (req: { a: number; b: number }) => req.a + req.b);
const { client } = createMemoryTransport(server);
const sum = await client.call<number>("add", { a: 2, b: 3 });
```

## License

MIT — see [LICENSE](./LICENSE). Part of the [RedSpace SDK](https://github.com/redspaceMP/sdk).
