# RedSpace SDK

TypeScript SDK for building **RedSpaceM** multiplayer gamemodes for
Cyberpunk 2077 & other open-world games &mdash; a FiveM / RageMP / Alt:V&ndash;style
platform with a Rust server core and TypeScript scripting.

## Install

```sh
npm i @redspacem/rpc @redspacem/server-types
```

## Quick start

A minimal server-side gamemode using the typed `mp.*` host API:

```ts
import { RpcServer } from '@redspacem/rpc';
import * as mp from '@redspacem/server-types';

const rpc = new RpcServer();

mp.on('playerJoined', (player) => {
  console.log(`Welcome, ${player.name}!`);
  player.sendChat(`Hello from RedSpaceM, ${player.name}!`);
});

rpc.listen();
```

See [docs/sdk/getting-started.md](./docs/sdk/getting-started.md) for a full
walkthrough, [docs/sdk/api.md](./docs/sdk/api.md) for the API reference, and
[resources/freeroam](./resources/freeroam) for a complete example resource.

## Packages

Published on npm under the [`@redspacem`](https://www.npmjs.com/org/redspacem) scope:

| Package | Description |
| --- | --- |
| [`@redspacem/server-types`](./packages/@redspacem/server-types) | Typed `mp.*` host API contract for server-side resources. |
| [`@redspacem/rpc`](./packages/@redspacem/rpc) | Type-safe RPC between resources and the host (`RpcServer`/`RpcClient`). |
| [`@redspacem/client-types`](./packages/@redspacem/client-types) | Types for the in-game client runtime. |
| [`@redspacem/di`](./packages/@redspacem/di) | Small dependency-injection container for resources. |
| [`@redspacem/browser-types`](./packages/@redspacem/browser-types) | Types for embedded browser / CEF UIs. |
| [`@redspacem/testing`](./packages/@redspacem/testing) | Test helpers for resources (memory transport, mocks). |

## Docs

The documentation site lives at [redspace.online/docs](https://redspace.online/docs)
and is mirrored in this repository under [`docs/sdk/`](./docs/sdk/) (EN + RU).

## Development

```sh
bun install
bun run build      # builds all packages + freeroam
bun run lint       # biome
bun run typecheck
bun test
```

## License

MIT &mdash; see [LICENSE](./LICENSE).