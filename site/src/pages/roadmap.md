# Roadmap

The RedSpace SDK evolves alongside the platform's scripting host. The
**server core is closed source and ships separately**; the milestones below
are phrased from the public SDK's point of view.

The platform's arc, in one line:

```
transport → scripting host → voice → assets → gateway → anti-cheat → 1000 players
```

## M0 — Foundation ✅

- Rust core foundation (config, protocol, resource packing, metrics, HTTP
  admin surface, database, CLI).
- **This SDK**: `@redspacem/server-types` and `@redspacem/rpc` created and
  tested (16 tests), Bun workspace + Biome + CI wired up.

## M1 — Transport

Real network layer on QUIC: handshake, ping/pong, connection scaffolding,
metrics. From the SDK's perspective: nothing changes yet — resources continue
to run against the typed `mp.*` contract.

## M2 — Transport hardening

Fuller QUIC layer: auth flow, re-connect, backpressure.

## M3 — World simulation

ECS world, spatial grid, Player/Vehicle sync (snapshot + delta), interest
management. The `mp.players` / `mp.vehicles` surfaces in
`@redspacem/server-types` start to map to live simulation data.

## M4 — Scripting host ⭐

The core executes TypeScript resources (QuickJS-based). **This is the point
the SDK targets**: gamemode logic moves to TypeScript-only, resources are
packed into verified, signed bundles.

- `mp.*` becomes real at runtime (today it's a typed contract + mocks).
- `@redspacem/rpc` binds to the host's RPC channel.
- The freeroam example becomes a runnable gamemode.

## M5 — Persistence

Accounts/characters, save/load, presence. SDK-side: patterns and helpers for
saving/loading player data.

## M6 — Voice & Assets

Opus voice (jitter, mixing) and asset streaming (S3/MinIO) with a disk cache.
SDK-side: typed bindings for voice channels and asset loading, plus
`browser-types` surfaces for in-game UI that uses streamed assets.

## M7 — Gateway & platform bus

Master server (server browser), Telegram login, launcher API, plus a NATS
JetStream platform bus (heartbeats, global chat). SDK-side: typed clients for
the gateway API.

## M8 — Anti-cheat & scale

Full anti-cheat validation plus stress tests at 200→1000 players. SDK-side:
hooks for reporting and handling anti-cheat events.

## M9 — Full RP resource set

The platform ships a complete set of roleplay resources.

## M10+ — Client & UI

RED4ext bridge (in-game client plugin), custom maps, CEF UI, platform hosting.
`@redspacem/client-types` and `@redspacem/browser-types` become fully realized
at this stage.

---

Nothing here is a promise or commitment — the core's schedule is managed
inside the (closed) server project. The SDK stays **contract-first**: as the
host's capabilities land, the SDK adds typed surface for them, always with
mocks so gamemode developers can build and test ahead of the host.