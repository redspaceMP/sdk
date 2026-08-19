# Getting Started

This guide walks you through installing the RedSpace SDK packages and writing
your first gamemode resource.

## Prerequisites

- **Bun 1.3+** (the SDK is built and tested with Bun). Install from
  [https://bun.sh](https://bun.sh). The repository does **not** use npm/yarn.
- A RedSpace **server core** to run your resource. The core is a separate,
  closed-source product — this SDK only needs it at deploy time. For local
  development and unit tests you can develop fully against the SDK's mocks.

## 1. Create a project

```sh
mkdir my-resource && cd my-resource
bun init
```

## 2. Install the packages you need

```sh
bun add @redspacem/server-types @redspacem/rpc @redspacem/di
bun add -d @redspacem/testing
```

| Package | When to use it |
| --- | --- |
| `@redspacem/server-types` | Type your access to the injected `mp.*` host API |
| `@redspacem/rpc` | Add type-safe request/response calls in your gamemode |
| `@redspacem/di` | Wire your gamemode's services with a tiny container |
| `@redspacem/client-types` | Type client-side (in-game) scripts |
| `@redspacem/browser-types` | Build CEF/NUI-style UI bridges |
| `@redspacem/testing` | Unit-test resources without a running server |

## 3. Write a minimal resource

```ts
// server/src/index.ts
import type { Mp, MpPlayer } from "@redspacem/server-types";
import { createContainer } from "@redspacem/di";

export function main(mp: Mp): void {
  const services = createContainer();
  services.registerValue("mp", mp);

  mp.events.on("playerJoin", (player) => {
    mp.log("info", `[freeroam] ${player.name} (id=${player.id}) joined`);
  });

  mp.commands.register("hello", (player: MpPlayer, args: string[]) => {
    mp.log("info", `Hello, ${player.name}!`);
  });
}
```

The `mp` object is **not** something you construct — the RedSpace server core
injects a conforming `mp` global into every resource sandbox at runtime. The
types describe that contract.

## 4. Test without a server

```ts
// server/src/index.test.ts
import { expect, test } from "bun:test";
import { createMockMp } from "@redspacem/testing";
import { main } from "./index.ts";

test("greets joining players", () => {
  const mp = createMockMp();
  main(mp);

  mp.emit("playerJoin", { id: 1, name: "ada", pingMs: 20, connectedAt: 0 });
  expect(mp.logLines).toContainEqual({
    level: "info",
    msg: "[freeroam] ada (id=1) joined",
  });
});
```

Run with `bun test`.

## 5. Package your resource

Resources are packed into signed bundles by the server tooling (outside this
repo). Locally you can build the server entrypoint:

```sh
bun build server/src/index.ts --target=bun --format=esm --outfile=server/dist/index.js
```

## Example

A complete, working example lives in
[`examples/freeroam`](https://github.com/redspaceMP/sdk/tree/main/examples/freeroam) in this repository — it is a
Bun workspace member and is verified by CI (`bun run build`, `bun run typecheck`).

Next: [Architecture](/architecture) · [API reference](/api)
