# Справочник API

Курируемый справочник публичной поверхности каждого пакета. Полные декларации —
в `dist/index.d.ts` каждого пакета или в `src/index.ts` в этом репозитории.

---

## `@redspacem/server-types`

Типизированный контракт `mp.*` плюс чистые хелперы. Без рантайм-зависимостей.

### Интерфейсы

```ts
interface MpPlayer {
  id: number;
  name: string;
  pingMs: number;
  ip?: string;
  connectedAt: number;
}

interface MpVector3 {
  x: number;
  y: number;
  z: number;
}

interface MpVehicle {
  id: number;
  model: string;
  position: MpVector3;
  health: number;
}
```

### События

```ts
interface MpEventMap {
  playerJoin: MpPlayer;
  playerLeave: { id: number; reason: string };
  chatMessage: { from: number; text: string };
  playerSpawn: { id: number; position: MpVector3 };
}

type MpEventHandler<T extends keyof MpEventMap> = (payload: MpEventMap[T]) => void;

interface MpEvents {
  on<T extends keyof MpEventMap>(name: T, handler: MpEventHandler<T>): void;
  emit<T extends keyof MpEventMap>(name: T, payload: MpEventMap[T]): void;
}
```

### Команды

```ts
type MpCommandHandler = (player: MpPlayer, args: string[]) => void;

interface MpCommands {
  register(name: string, handler: MpCommandHandler): void;
}
```

### Глобал `mp`

```ts
interface Mp {
  players: MpPlayer[];
  vehicles: MpVehicle[];
  events: MpEvents;
  commands: MpCommands;
  log(level: "info" | "warn" | "error", msg: string): void;
}
```

### Хелперы

```ts
clamp(value: number, min: number, max: number): number;      // инклюзивно [min, max]
distance(a: MpVector3, b: MpVector3): number;                // евклидово расстояние
isValidCommandName(name: string): boolean;                   // ^[a-z][a-z0-9_-]*$
```

---

## `@redspacem/rpc`

Type-safe RPC без зависимостей. Транспорт внедряемый и абстрактный.

```ts
type RpcRequest<Req = unknown, Res = unknown> = { id: number; method: string; req: Req };
type RpcResponse<Res = unknown> =
  | { id: number; ok: true; res: Res }
  | { id: number; ok: false; error: string };
type RpcHandler<Req = unknown, Res = unknown> = (req: Req) => Res | Promise<Res>;
```

### `RpcServer`

```ts
class RpcServer {
  on<Req = unknown, Res = unknown>(method: string, handler: RpcHandler<Req, Res>): void;
  handle(raw: string): Promise<string>; // возвращает сырой JSON-ответ
}
```

`handle` возвращает id запроса в ответе; неизвестные методы и исключения в
хендлерах возвращаются как `{ ok: false, error }`.

### `RpcClient` и транспорт

```ts
interface RpcTransport {
  send(raw: string): void;
}

class RpcClient {
  constructor(transport: RpcTransport);
  call<T = unknown>(method: string, req: unknown): Promise<T>;
  handleResponse(raw: string): void;
}
```

`call` назначает id и резолвится, когда приходит ответ с этим id. Для таймаутов
оберните промис (например, `Promise.race` с таймером).

### `TypedRpc` / `createTypedRpc`

```ts
type RpcMethodTable = Record<string, (req: never) => unknown>;

interface TypedRpc<T extends RpcMethodTable> {
  call<K extends keyof T & string>(
    client: RpcClient,
    method: K,
    req: Parameters<T[K]>[0],
  ): Promise<Awaited<ReturnType<T[K]>>>;
}

createTypedRpc(server: RpcServer): {
  define<T extends RpcMethodTable>(methods: T): TypedRpc<T>;
};
```

---

## `@redspacem/di`

Мини-контейнер DI с ленивыми синглтонами.

```ts
type Factory<T> = () => T;

class Container {
  register<T>(token: string, factory: Factory<T>): void;
  registerValue<T>(token: string, value: T): void;
  resolve<T = unknown>(token: string): T;   // бросает, если не зарегистрировано
  has(token: string): boolean;
}

createContainer(): Container;
```

Фабрики запускаются не более одного раза — первый `resolve` создаёт и кэширует.

---

## `@redspacem/client-types`

Клиентское API скриптов (в игре, в стиле RED4ext). Зависит от `server-types`
и реэкспортирует `MpVector3`.

```ts
interface ClientCamera {
  setPosition(position: MpVector3): void;
  getPosition(): MpVector3;
  setRotation(yaw: number, pitch: number): void;
  isLocked(): boolean;
  lock(state: boolean): void;
}

interface ClientInput {
  isKeyPressed(key: string): boolean;
  isControlPressed(control: string): boolean;
  getMousePosition(): { x: number; y: number };
  blockInput(state: boolean): void;
}

interface ClientRender {
  drawText(text: string, x: number, y: number, size?: number, color?: string): void;
  drawRect(x: number, y: number, width: number, height: number, color: string): void;
}

interface ClientEventMap {
  keyDown: { key: string };
  keyUp: { key: string };
  mouseMove: { x: number; y: number };
  frame: { deltaMs: number };
}

interface ClientEventBus {
  on<T extends keyof ClientEventMap>(name: T, handler: (payload: ClientEventMap[T]) => void): void;
  emit<T extends keyof ClientEventMap>(name: T, payload: ClientEventMap[T]): void;
}

interface ClientMp {
  camera: ClientCamera;
  input: ClientInput;
  render: ClientRender;
  events: ClientEventBus;
  log(level: "info" | "warn" | "error", msg: string): void;
}

lerp(a: number, b: number, t: number): number; // линейная интерполяция, t в [0, 1]
```

---

## `@redspacem/browser-types`

CEF/NUI-мост для интерфейсов.

```ts
type BrowserEventMap = Record<string, unknown>;

interface BrowserBridge<TIn extends BrowserEventMap, TOut extends BrowserEventMap> {
  on<K extends keyof TIn & string>(event: K, handler: (payload: TIn[K]) => void): void;
  off<K extends keyof TIn & string>(event: K, handler: (payload: TIn[K]) => void): void;
  emit<K extends keyof TOut & string>(event: K, payload: TOut[K]): void;
}

interface BrowserBridgeOptions {
  postMessage(message: unknown): void;
  subscribe?(onMessage: (message: unknown) => void): () => void;
}

createBrowserBridge<TIn extends BrowserEventMap, TOut extends BrowserEventMap>(
  options: BrowserBridgeOptions,
): BrowserBridge<TIn, TOut>;
```

Входящие сообщения должны быть конвертами `{ event: string, payload: unknown }`;
битые сообщения игнорируются.

---

## `@redspacem/testing`

Dev-хелперы для юнит-тестов.

```ts
interface MockMpOptions {
  players?: MpPlayer[];
  vehicles?: MpVehicle[];
}

interface MockMp extends Mp {
  logLines: Array<{ level: "info" | "warn" | "error"; msg: string }>;
  emit<K extends keyof MpEventMap>(name: K, payload: MpEventMap[K]): void;
  runCommand(name: string, player: MpPlayer, args: string[]): void;
  clearLogs(): void;
}

createMockMp(options?: MockMpOptions): MockMp;

interface MemoryTransport {
  server: RpcServer;
  client: RpcClient;
}

createMemoryTransport(server: RpcServer): MemoryTransport;
```

---

Дальше: [Участие в разработке](./contributing.ru.md) · [Дорожная карта](./roadmap.ru.md)