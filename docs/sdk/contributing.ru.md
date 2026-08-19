# Участие в разработке

Спасибо, что хотите помочь с RedSpace SDK! Эта страница описывает, как
собирать, тестировать и публиковать пакеты.

## Требования

- **Bun 1.3+** — рантайм, пакетный менеджер и тест-раннер.
- **Git** для контроля версий.

## Структура репозитория

```
packages/@redspacem/
  server-types/   # типизированный контракт mp.* + хелперы
  rpc/            # type-safe RPC-слой
  client-types/   # типы клиентского API
  browser-types/  # типы CEF/NUI-моста
  di/             # мини-контейнер DI
  testing/        # моки для юнит-тестов
resources/freeroam # пример гейммод-ресурса
docs/             # документация (EN + RU)
```

## Настройка

```sh
bun install
```

## Частые команды

```sh
bun run lint        # Biome check (форматтер + линтер)
bun run format      # Biome format --write
bun run typecheck   # tsc --noEmit во всех пакетах workspace
bun test            # bun test по всему workspace
bun run build       # сборка dist/ для каждого пакета (в топологическом порядке)
```

`bun run build` компилирует каждый пакет через `tsc -p tsconfig.build.json`
в `dist/index.js` + `dist/index.d.ts`. Пакеты собираются в порядке зависимостей
(см. корневой `package.json`).

> Примечание: typecheck/test разрешают соседние пакеты через опубликованные
> `exports` (указывают на `dist/`), поэтому после свежего клонирования сначала
> выполните `bun run build`, а затем `bun run typecheck` / `bun test`.

## Конвенции кода

- Строгий TypeScript; `tsconfig.json` каждого пакета расширяет
  `../../tsconfig.base.json`.
- Biome: ширина строки 100, двойные кавычки, обязательные точки с запятой,
  импорты упорядочены, `noExplicitAny` — ошибка.
- Без комментариев, если они не добавляют ценности (doc-комментарии для
  публичного API приветствуются).
- Тесты лежат рядом с исходниками как `src/*.test.ts` и импортируют из
  `../src/index.ts` (не из `dist/`).

## Добавление или изменение пакета

1. Держите пакеты сфокусированными и с минимумом зависимостей.
2. Обновите `src/index.ts`, добавьте/поправьте `src/*.test.ts`.
3. Поддерживайте метаданные `package.json` (description, keywords, license,
   repository).
4. Прогоните весь набор: `bun run lint`, `bun run build`, `bun run typecheck`,
   `bun test`.

## Публикация

Публикация выполняется по пакетам, в порядке зависимостей, из тегового релиза
(`vX.Y.Z`). CI делает это автоматически через workflow `publish`; локально:

```sh
bun run build                    # убедитесь, что dist/ актуален
bun pm login                     # аутентификация в npm
for pkg in server-types rpc client-types di browser-types testing; do
  (cd packages/@redspacem/$pkg && bun publish --access public)
done
```

Порядок важен: `server-types → rpc → client-types → di → browser-types →
testing`.

### Чек-лист перед публикацией

- [ ] `bun run lint`, `bun run build`, `bun run typecheck`, `bun test` — всё зелёное
- [ ] `version` обновлён и создан git-тег
- [ ] `bun publish --dry-run` показывает `package.json`, `dist/*` и `LICENSE`
- [ ] В репозитории нет секретов (файлы `.env` в gitignore)