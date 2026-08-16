# @redspacem/browser-types

CEF/NUI-style UI bridge types for RedSpaceM: a typed message channel between
game scripts and browser surfaces.

- `BrowserBridge<TIn, TOut>` — typed `on` / `off` / `emit`
- `createBrowserBridge` — factory wired to your postMessage transport
- `BrowserEventMap` — base constraint for event maps

## Install

```sh
bun add @redspacem/browser-types
```

## Example

```ts
import { createBrowserBridge } from "@redspacem/browser-types";

const bridge = createBrowserBridge<
  { speedChanged: { kmh: number } },
  { setSpeed: { kmh: number } }
>({
  postMessage: (message) => sendToBrowser(message),
  subscribe: (onMessage) => subscribeFromBrowser(onMessage),
});

bridge.on("speedChanged", ({ kmh }) => console.log(kmh));
bridge.emit("setSpeed", { kmh: 90 });
```

## License

MIT — see [LICENSE](./LICENSE). Part of the [RedSpaceM SDK](https://github.com/waveluv/redspacem).
