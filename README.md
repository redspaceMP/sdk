# RedSpace SDK

TypeScript SDK for building **RedSpaceM** multiplayer gamemodes for
Cyberpunk 2077 & other open-world games — a FiveM / RageMP / Alt:V style
platform with a Rust server core and TypeScript scripting.

## Packages

The SDK is published on npm under the [`@redspacem`](https://www.npmjs.com/org/redspacem) scope:

| Package | Description |
| --- | --- |
| [`@redspacem/server-types`](./packages/@redspacem/server-types) | Typed `mp.*` host API contract for server-side resources. |
| [`@redspacem/rpc`](./packages/@redspacem/rpc) | Type-safe RPC between resources and the host (`RpcServer`/`RpcClient`). |
| [`@redspacem/client-types`](./packages/@redspacem/client-types) | Types for the in-game client runtime. |
| [`@redspacem/di`](./packages/@redspacem/di) | Small dependency-injection container for resources. |
| [`@redspacem/browser-types`](./packages/@redspacem/browser-types) | Types for embedded browser / CEF UIs. |
| [`@redspacem/testing`](./packages/@redspacem/testing) | Test helpers for resources (memory transport, mocks). |

## Getting started

```sh
npm i @redspacem/server-types @redspacem/rpc
```

See [docs/sdk/getting-started.md](./docs/sdk/getting-started.md) for a
walkthrough, [docs/sdk/api.md](./docs/sdk/api.md) for the reference, and
[resources/freeroam](./resources/freeroam) for a complete example resource.

## Docs

The documentation site lives at [redspace.online](https://redspace.online) and
is mirrored in this repository under [`docs/sdk/`](./docs/sdk/) (EN + RU).

## Development

```sh
bun install
bun run build      # builds all packages + freeroam
bun run lint       # biome
bun run typecheck
bun test
```

## License

MIT — see [LICENSE](./LICENSE).