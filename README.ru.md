<div align="center">

# RedSpaceM SDK

**Создавайте мультиплеерные гейммоды для серверов Cyberpunk 2077**

Официальный TypeScript SDK для RedSpaceM — платформы для мультиплеерных
RP-серверов Cyberpunk 2077 в духе FiveM. Высокопроизводительное **Rust-ядро**
(закрытый исходный код, поставляется отдельно) внедряет типизированное
`mp.*` скриптовое API в ваши ресурсы; этот репозиторий содержит всё, что
нужно на стороне TypeScript.

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Bun](https://img.shields.io/badge/runtime-Bun%201.3+-black?logo=bun)
![Docs](https://img.shields.io/badge/docs-redspace.online-blue?logo=readthedocs)
![GitHub](https://img.shields.io/badge/github-redspaceMP%2Fsdk-2da44e?logo=github)

</div>

---

## Пакеты

| Пакет | Описание | Статус |
| --- | --- | --- |
| [`@redspacem/server-types`](https://www.npmjs.com/package/@redspacem/server-types) | Типизированный контракт `mp.*` (игроки, транспорт, события, команды) | Stable |
| [`@redspacem/rpc`](https://www.npmjs.com/package/@redspacem/rpc) | Type-safe RPC-слой без зависимостей (`RpcServer`, `RpcClient`, `TypedRpc`) | Stable |
| [`@redspacem/client-types`](https://www.npmjs.com/package/@redspacem/client-types) | Типы клиентского API (camera, input, render, события) | Stable |
| [`@redspacem/browser-types`](https://www.npmjs.com/package/@redspacem/browser-types) | Типы CEF/NUI-моста + `createBrowserBridge` | Stable |
| [`@redspacem/di`](https://www.npmjs.com/package/@redspacem/di) | Мини-контейнер dependency injection (ленивые синглтоны) | Stable |
| [`@redspacem/testing`](https://www.npmjs.com/package/@redspacem/testing) | `createMockMp` + `createMemoryTransport` для юнит-тестов | Stable |

Все пакеты **не имеют зависимостей** (кроме небольших связей между собой),
поставляются как **ESM + декларации типов** и написаны на строгом TypeScript.

---

## Быстрый старт

```sh
# SDK использует Bun workspaces.
bun add @redspacem/server-types @redspacem/rpc @redspacem/di
```

Мини-ресурс в стиле freeroam:

```ts
import type { Mp } from "@redspacem/server-types";
import { createContainer } from "@redspacem/di";

// `mp` внедряется серверным ядром RedSpaceM в рантайме.
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

Юнит-тестируйте гейммод без сервера:

```ts
import { createMockMp } from "@redspacem/testing";

const mp = createMockMp();
mp.events.on("playerJoin", (p) => mp.log("info", `${p.name} joined`));
mp.emit("playerJoin", { id: 1, name: "ada", pingMs: 20, connectedAt: 0 });

console.log(mp.logLines); // [{ level: "info", msg: "ada joined" }]
```

Полный пример ресурса — в [`examples/freeroam`](./examples/freeroam).

---

## Документация

Полный сайт документации — на
**[<https://redspace.online/>](https://redspace.online/)**
(сайт на Vocs: тёмная тема, сайдбар на английском и русском).
Markdown-исходники лежат в `docs/` как источник истины:

- [Начало работы](./docs/getting-started.ru.md) — установка, настройка, первый ресурс
- [Архитектура](./docs/architecture.ru.md) — слои SDK и связь с Rust-ядром
- [Справочник API](./docs/api.ru.md) — типы и сигнатуры функций по пакетам
- [Участие в разработке](./docs/contributing.ru.md) — сборка, тесты, публикация
- [Дорожная карта](./docs/roadmap.ru.md) — куда движется платформа
- [English README](./README.md) — README на английском

### Документация и AI-поиск

На сайте документации есть встроенные **RAG-поиск** и **Ask AI**:

- Нажмите **Ctrl+K** (или используйте плавающую кнопку поиска), чтобы открыть
  AI-поиск. Запросы эмбедятся во время сборки локальной трансформерной моделью
  (`all-MiniLM-L6-v2`, ONNX) и сравниваются по косинусной близости с
  предвычисленными эмбеддингами — плюс keyword-fallback, когда модель недоступна.
- **Ask AI** отвечает с цитатами: вставьте свой API-ключ Anthropic / OpenAI /
  DeepSeek (хранится только в `localStorage` и уходит только провайдеру), и сайт
  подберёт релевантные фрагменты документации и стримит ответ с источниками.
- Индекс (`search-index.json`) генерируется при сборке командой
  `bun run index:search` в `site/` и не коммитится в репозиторий.

---

## Дорожная карта

TypeScript SDK нацелен на милстоун скриптового хоста платформы. Закрытое
Rust-ядро поставляется отдельно; SDK развивается вместе с ним:

`транспорт → скриптовый хост → голос → ассеты → gateway`

Подробнее — в [docs/roadmap.ru.md](./docs/roadmap.ru.md).

## Лицензия

MIT — см. [LICENSE](./LICENSE). Copyright © 2026 RedSpaceM contributors.

**Ядро сервера RedSpaceM — закрытый исходный код** и **не входит** в этот
репозиторий.
