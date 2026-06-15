# Coding Standards

## Language & style
- **TypeScript strict** across all packages and bots. No implicit `any`; prefer explicit return types
  on exported functions.
- **ESLint + Prettier** (TypeScript config) enforce lint and format. Format is not hand-managed —
  Prettier owns it.
- **Module style:** ESM (`"type": "module"` / TS `module` resolution consistent across the workspace).

## Naming
- **Files:** kebab-case (`dice-parser.ts`, `reminded-store.ts`).
- **Types/interfaces/classes:** PascalCase (`RemindedStore`, `DiceRoll`, `BotConfig`).
- **Functions/variables:** camelCase.
- **Constants:** UPPER_SNAKE_CASE for true module-level constants.
- **Bot slugs / package names:** kebab-case (`dungeon-herald`, `bot-core`).
- **Per-bot env token:** `DISCORD_TOKEN_<SLUG>` convention (set by `bot-core`).

## License & file headers
- **License: MIT.** A root `LICENSE` file: "Copyright (c) 2026 Brennon Huff" (MIT text).
- **Per-file header:** SPDX identifier on the first line of each source file:
  ```ts
  // SPDX-License-Identifier: MIT
  ```
- **Copyright holder:** Brennon Huff.

## Tests
- vitest. Test files colocated as `*.test.ts` or under `__tests__/`.
- The dice parser carries exhaustive unit tests + property tests (roll invariants). Test-first per
  the tdd gate; no feature code before its failing test.

## Structure conventions
- Shared, reusable logic → `packages/*` (pure where possible; `packages/dice` has no Discord deps).
- Bot-specific wiring → `bots/<slug>/src/`. Durable state → `bots/<slug>/data/`.
- New bots are scaffolded via `tools/new-bot` to keep the per-bot convention uniform.

## Secrets & logging
- Secrets (bot tokens) come from env only — never committed, logged, or embedded in source/tests.
- No member PII in logs, errors, embeds, or fixtures.
