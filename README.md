# RedSpaceM

Платформа мульти-сервера для мультиплеера Cyberpunk 2077 (аналог FiveM / RageMP / Alt:V). Серверное ядро написано на **Rust**, gamemode'ы — на **TypeScript** (исполняются в rquickjs). Каждый `rsm-server` — автономный мир; синхронизация между мирами — через платформу (`rsm-gateway` = control plane). Проводной протокол — protobuf (prost).

## Структура монорепо

- `crates/` — Rust workspace (транспорт QUIC, ECS-мир, скриптинг-хост, голос, ассеты, шлюз).
- `tools/rsm-cli` — админ-утилиты на Rust; рядом — вспомогательные TypeScript-скрипты SDK (`check-links`, `publish`, `version-bump`).
- `packages/@redspacem/*` — публичные TypeScript-пакеты SDK: `rpc`, `server-types`, `client-types`, `di`, `browser-types`, `testing`.
- `resources/freeroam` — пример gamemode-ресурса.
- `site/` — сайт документации на Vocs (redspace.online).
- `docs/` — документация: серверная (`architecture.md`, `roadmap.md`, `progress.md`, `decisions.md`) и `docs/sdk/` (справочник SDK для справки).

## Сборка

Серверное ядро (Rust):

```sh
cargo build --workspace
cargo test --workspace
```

TypeScript SDK и ресурсы:

```sh
bun install
bun run build
bun run lint
bun run typecheck
```

## Документация

- `docs/progress.md` — статус и спецификации
- `docs/decisions.md` — принятые решения
- `docs/architecture.md`, `docs/roadmap.md` — серверная архитектура и планы
- `docs/sdk/` — документация TypeScript SDK

## Лицензия

MIT — см. `LICENSE`.