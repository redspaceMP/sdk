# @redspacem/client-types

Typed contract for the client-side scripting API injected by the RedSpace
client plugin into in-game (RED4ext-style) scripts.

- `ClientMp`, `ClientCamera`, `ClientInput`, `ClientRender`
- `ClientEventBus` / `ClientEventMap`
- Helper: `lerp`

Depends on `@redspacem/server-types` (re-exports `MpVector3`).

## Install

```sh
bun add @redspacem/client-types
```

## Example

```ts
import type { ClientMp } from "@redspacem/client-types";

declare const mp: { client: ClientMp };

mp.client.camera.lock(true);
mp.client.input.blockInput(true);
mp.client.events.on("frame", ({ deltaMs }) => {
  // ...
});
```

## License

MIT — see [LICENSE](./LICENSE). Part of the [RedSpace SDK](https://github.com/redspaceMP/sdk).
