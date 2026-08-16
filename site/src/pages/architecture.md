# Architecture

The RedSpaceM SDK is a set of small, focused TypeScript packages that sit
between your gamemode logic and the RedSpaceM platform. The platform itself is
split into two worlds:

```
┌──────────────────────────────────────────────────────────┐
│  Your gamemode (TypeScript resource)                     │
│  packages/@redspacem/*  ←  THIS REPOSITORY               │
└───────────────────────────┬──────────────────────────────┘
                            │  mp.* host API (injected at runtime)
┌───────────────────────────▼──────────────────────────────┐
│  RedSpaceM server core (Rust, closed source)             │
│  scripting host · ECS · network · voice · assets · …     │
└──────────────────────────────────────────────────────────┘
```

## SDK layering

The packages form a thin, dependency-light stack. Each layer only knows about
the layer below it:

```
        ┌─────────────────────────────────────────────┐
        │  testing  (mocks for local unit tests)      │
        │  client-types · browser-types (client/UI)   │
        │  di         (wiring)   rpc (transport)      │
        └──────────────┬──────────────────────────────┘
        ┌──────────────▼──────────────────────────────┐
        │  server-types  — the `mp.*` contract        │
        │  (players, vehicles, events, commands)      │
        └─────────────────────────────────────────────┘
```

- **`@redspacem/server-types`** — the foundation. It declares the typed
  `Mp`, `MpPlayer`, `MpVector3`, `MpVehicle`, `MpEvents`/`MpEventMap` and
  `MpCommands` contracts plus small pure helpers (`clamp`, `distance`,
  `isValidCommandName`). It has **no runtime dependencies** and is pure type
  surface + tiny utilities.

- **`@redspacem/rpc`** — a transport-agnostic RPC layer. `RpcServer` handles
  raw JSON requests, `RpcClient` sends requests through an injectable
  `RpcTransport` and matches responses by id, and `createTypedRpc` turns a
  method table into a strongly typed facade. The transport itself is abstract:
  in production it will be bound to the host's RPC channel; in tests it is the
  in-memory transport from `@redspacem/testing`.

- **`@redspacem/di`** — a tiny dependency-injection container
  (`register`/`registerValue`/`resolve`/`has`) with lazy singletons. Use it to
  wire services inside a resource without pulling in a framework.

- **`@redspacem/client-types`** — the counterpart of `server-types` for
  client-side scripts that run in the game (RED4ext-style): camera, input,
  render, event bus, plus a `lerp` helper. Depends on `server-types`
  (re-exports `MpVector3`).

- **`@redspacem/browser-types`** — types and a factory for CEF/NUI-style UI
  bridges: a typed message channel between game scripts and browser surfaces.

- **`@redspacem/testing`** — development-only helpers: `createMockMp` produces
  an `Mp`-shaped mock with an in-memory event bus, command registry and log
  recording; `createMemoryTransport` wires an `RpcClient` to an `RpcServer` in
  memory. This is how you unit-test a gamemode without a running server.

## How the SDK maps to the (closed) Rust core

The RedSpaceM core is a Rust service that owns the game world, the network
transport and the persistence. It exposes a **scripting host** to TypeScript
resources:

- When a resource loads, the host injects a global `mp` object that conforms to
  `@redspacem/server-types`. Your code never imports a runtime `mp` — it is a
  typed global provided by the sandbox.
- Host events (`playerJoin`, `playerLeave`, `chatMessage`, `playerSpawn`, …)
  arrive on `mp.events` and are typed by `MpEventMap`.
- Commands registered through `mp.commands` are dispatched by the host.
- Long-running or cross-cutting calls can go over the RPC layer, which the host
  will bridge to its internal services.

The mapping is **contract-first**: the SDK defines the shapes, the host
implements them, and `@redspacem/testing` gives you a faithful stand-in for
development.

### M4 host note

The scripting host milestone (M4 on the platform roadmap) is when the core
executes TypeScript resources. This SDK is designed to target that host: the
packages were built and tested before the host ships, so gamemodes written
today against the contracts can be unit-tested immediately and will run on the
host once it is released.

## Why Bun

The SDK is developed, linted, type-checked and tested with **Bun** (workspaces,
`bun test`, Biome, TypeScript). The packages themselves publish plain ESM
JavaScript plus `.d.ts` declarations and have no Bun-specific runtime APIs, so
they work in any modern JS environment that supports ESM.

Next: [API reference](/api) · [Roadmap](/roadmap)
