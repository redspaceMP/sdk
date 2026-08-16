<div align="center">

# RedSpaceM SDK

**Build multiplayer gamemodes for Cyberpunk 2077 servers**

The official TypeScript SDK for RedSpaceM — a FiveM-inspired platform for
Cyberpunk 2077 roleplay servers. A high-performance **Rust core** (closed
source, ships separately) injects a typed `mp.*` scripting API into your
resources; this repository contains everything you need on the TypeScript side.

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Bun](https://img.shields.io/badge/runtime-Bun%201.3+-black?logo=bun)
![Docs](https://img.shields.io/badge/docs-redspace.online-blue?logo=readthedocs)
![GitHub](https://img.shields.io/badge/github-redspaceMP%2Fsdk-2da44e?logo=github)

</div>

---

## Packages

| Package | Description | Status |
| --- | --- | --- |
| [`@redspacem/server-types`](https://www.npmjs.com/package/@redspacem/server-types) | Typed contract for the `mp.*` host API (players, vehicles, events, commands) | Stable |
| [`@redspacem/rpc`](https://www.npmjs.com/package/@redspacem/rpc) | Dependency-free, type-safe RPC layer (`RpcServer`, `RpcClient`, `TypedRpc`) | Stable |
| [`@redspacem/client-types`](https://www.npmjs.com/package/@redspacem/client-types) | Client-side script API types (camera, input, render, events) | Stable |
| [`@redspacem/browser-types`](https://www.npmjs.com/package/@redspacem/browser-types) | CEF/NUI-style UI bridge types + `createBrowserBridge` | Stable |
| [`@redspacem/di`](https://www.npmjs.com/package/@redspacem/di) | Tiny dependency-injection container (lazy singletons) | Stable |
| [`@redspacem/testing`](https://www.npmjs.com/package/@redspacem/testing) | `createMockMp` + `createMemoryTransport` for unit tests | Stable |

All packages are **dependency-free** (except the small inter-package links),
ship **ESM + type declarations**, and are written in strict TypeScript.

---

## Quick start

```sh
# The SDK uses Bun workspaces.
bun add @redspacem/server-types @redspacem/rpc @redspacem/di
```

A tiny freeroam-style resource:

```ts
import type { Mp } from "@redspacem/server-types";
import { createContainer } from "@redspacem/di";

// `mp` is injected by the RedSpaceM server core at runtime.
export function main(mp: Mp): void {
  const container = createContainer();
  container.registerValue("mp", mp);

  mp.events.on("playerJoin", (player) => {
    mp.log("info", `${player.name} (id=${player.id}) joined`);
  });

  mp.commands.register("hello", (player, args) => {
    mp.log("info", `Hello, ${player.name}!`);
  });
}
```

Unit-test your gamemode without a server:

```ts
import { createMockMp } from "@redspacem/testing";

const mp = createMockMp();
mp.events.on("playerJoin", (p) => mp.log("info", `${p.name} joined`));
mp.emit("playerJoin", { id: 1, name: "ada", pingMs: 20, connectedAt: 0 });

console.log(mp.logLines); // [{ level: "info", msg: "ada joined" }]
```

Try the full example resource in [`examples/freeroam`](./examples/freeroam).

---

## Documentation

The full documentation site lives at
**[<https://redspace.online/>](https://redspace.online/)**
— a Vocs-powered site (dark theme, English + Russian sidebar). Markdown sources
stay in `docs/` as the source of truth:

- [Getting started](./docs/getting-started.md) — install, setup, first resource
- [Architecture](./docs/architecture.md) — SDK layering and how it maps to the Rust core
- [API reference](./docs/api.md) — types and function signatures per package
- [Contributing](./docs/contributing.md) — build, test, publish
- [Roadmap](./docs/roadmap.md) — where the platform is heading
- [Русская документация](./README.ru.md) — README на русском

### Documentation & AI search

The docs site ships with built-in **RAG search** and **Ask AI**:

- Press **Ctrl+K** (or use the floating search button) to open AI search. Queries
  are embedded at build time with a local transformer model
  (`all-MiniLM-L6-v2`, ONNX) and matched by cosine similarity over precomputed
  embeddings — plus a keyword fallback when the embedding model is unavailable.
- **Ask AI** answers questions with citations: paste your own Anthropic / OpenAI /
  DeepSeek API key (stored in `localStorage`, sent only to the provider), and the
  site retrieves the top matching doc chunks and streams a cited answer.
- The index (`search-index.json`) is generated at build time by
  `bun run index:search` in `site/`; it is never committed to the repository.

---

## Roadmap

The TypeScript SDK targets the platform's scripting host milestone. The
closed-source Rust core ships separately; the SDK evolves alongside it:

`transport → scripting host → voice → assets → gateway`

See [docs/roadmap.md](./docs/roadmap.md) for details.

## License

MIT — see [LICENSE](./LICENSE). Copyright © 2026 RedSpaceM contributors.

The RedSpaceM **server core is closed source** and is **not** part of this
repository.
