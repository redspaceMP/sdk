# Начало работы

Это руководство проведёт вас через установку пакетов RedSpaceM SDK и написание
первого гейммод-ресурса.

## Требования

- **Bun 1.3+** (SDK собирается и тестируется с Bun). Установка — на
  <https://bun.sh>. Репозиторий **не** использует npm/yarn.
- **Ядро сервера** RedSpaceM для запуска ресурса. Ядро — отдельный продукт с
  закрытым исходным кодом; для этого SDK оно нужно только на этапе развёртывания.
  Для локальной разработки и юнит-тестов SDK полностью достаточно.

## 1. Создайте проект

```sh
mkdir my-resource && cd my-resource
bun init
```

## 2. Установите нужные пакеты

```sh
bun add @redspacem/server-types @redspacem/rpc @redspacem/di
bun add -d @redspacem/testing
```

| Пакет | Когда использовать |
| --- | --- |
| `@redspacem/server-types` | Типизация доступа к внедряемому `mp.*` API |
| `@redspacem/rpc` | Type-safe вызовы «запрос/ответ» внутри гейммода |
| `@redspacem/di` | Связывание сервисов гейммода мини-контейнером |
| `@redspacem/client-types` | Типизация клиентских (в игре) скриптов |
| `@redspacem/browser-types` | CEF/NUI-мосты для интерфейсов |
| `@redspacem/testing` | Юнит-тесты ресурсов без запущенного сервера |

## 3. Напишите минимальный ресурс

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

Объект `mp` **не** создаётся вами — серверное ядро RedSpaceM внедряет
соответствующий контракту глобал `mp` в каждый песочниц-ресурс в рантайме.
Типы лишь описывают этот контракт.

## 4. Тестируйте без сервера

```ts
// server/src/index.test.ts
import { expect, test } from "bun:test";
import { createMockMp } from "@redspacem/testing";
import { main } from "./index.ts";

test("приветствует игроков при входе", () => {
  const mp = createMockMp();
  main(mp);

  mp.emit("playerJoin", { id: 1, name: "ada", pingMs: 20, connectedAt: 0 });
  expect(mp.logLines).toContainEqual({
    level: "info",
    msg: "[freeroam] ada (id=1) joined",
  });
});
```

Запуск: `bun test`.

## 5. Упакуйте ресурс

Ресурсы упаковываются в подписанные бандлы серверным тулингом (вне этого
репозитория). Локально можно собрать серверную точку входа:

```sh
bun build server/src/index.ts --target=bun --format=esm --outfile=server/dist/index.js
```

## Пример

Полный рабочий пример — [`examples/freeroam`](../examples/freeroam) в этом
репозитории: он является членом Bun workspace и проверяется в CI
(`bun run build`, `bun run typecheck`).

Дальше: [Архитектура](./architecture.ru.md) · [Справочник API](./api.ru.md)
