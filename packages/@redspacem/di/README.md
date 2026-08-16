# @redspacem/di

A tiny dependency-injection container for RedSpaceM resources.

- `register` / `registerValue` / `resolve` / `has`
- Lazy singletons: factories run at most once
- `createContainer` factory

## Install

```sh
bun add @redspacem/di
```

## Example

```ts
import { createContainer } from "@redspacem/di";

const container = createContainer();
container.register("config", () => ({ port: 4223 }));
container.registerValue("db", createPool());

const config = container.resolve<{ port: number }>("config");
```

## License

MIT — see [LICENSE](./LICENSE). Part of the [RedSpaceM SDK](https://github.com/redspaceMP/sdk).
