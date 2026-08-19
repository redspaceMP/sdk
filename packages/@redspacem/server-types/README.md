# @redspacem/server-types

Typed contract for the `mp.*` scripting host API injected by the RedSpace
server core into resource sandboxes.

- `Mp`, `MpPlayer`, `MpVector3`, `MpVehicle`
- `MpEvents` / `MpEventMap`, `MpCommands`
- Helpers: `clamp`, `distance`, `isValidCommandName`

Zero runtime dependencies. Ships ESM + type declarations.

## Install

```sh
bun add @redspacem/server-types
```

## Example

```ts
import type { Mp } from "@redspacem/server-types";

// The host injects a conforming `mp` global into every resource sandbox.
declare const mp: Mp;

mp.events.on("playerJoin", (player) => {
  mp.log("info", `${player.name} joined the server`);
});

mp.commands.register("goto", (player, args) => {
  const target = mp.players.find((p) => p.name === args[0]);
  // ...
});
```

## License

MIT — see [LICENSE](./LICENSE). Part of the [RedSpace SDK](https://github.com/redspaceMP/sdk).
