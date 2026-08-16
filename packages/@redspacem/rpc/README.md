# @redspacem/rpc

Dependency-free, type-safe RPC layer for RedSpaceM resources.

- `RpcServer` — dispatch raw JSON requests by method name
- `RpcClient` — call methods with id-matched responses and timeouts
- `TypedRpc` / `createTypedRpc` — strongly-typed method tables
- `RpcTransport` — injectable transport contract

## Install

```sh
bun add @redspacem/rpc
```

## Example

```ts
import { createTypedRpc, RpcServer } from "@redspacem/rpc";

const server = new RpcServer();
const api = createTypedRpc(server).define({
  greet: (req: { name: string }) => `hello ${req.name}`,
});

// From a client:
const msg = await api.call(client, "greet", { name: "red" });
```

## License

MIT — see [LICENSE](./LICENSE). Part of the [RedSpaceM SDK](https://github.com/waveluv/redspacem).
