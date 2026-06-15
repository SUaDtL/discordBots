# Tech Stack

Derived from Layer 4 (ADR-0001..0004).

## Runtime & language
- **Node.js** — current LTS.
- **TypeScript** — strict mode. Compiled via `tsc` (or run via `tsx` in dev).
- **discord.js v14** — major-version pinned. Re-audit before any major bump (ADR-0002; carries
  discordArbiter's pin discipline).

## Repository shape (ADR-0001)
- **npm workspaces** monorepo (no turborepo/nx).
- `packages/*` — shared libraries (`dice`, `bot-core`).
- `bots/<slug>/` — one deployable bot per folder (`dungeon-herald` first).
- `tools/new-bot` — generator scaffolding new bots to the per-bot convention.
- `tsconfig.base.json` at root; per-package `tsconfig` extends it.

## Runtime architecture (ADR-0003)
- **One OS process per bot.** Each holds only its own token + least-privilege intents.
- Shared code imported from `packages/*`; no cross-bot shared process.

## Persistence (ADR-0004)
- **Per-bot reminder state** = flat JSON file (`bots/<slug>/data/reminders.json`) behind a narrow
  `RemindedStore` interface (`get` / `markReminded` / `list` / `prune`). Swappable to SQLite later.
- No database, queue, or cache at MVP. Single writer per store (one process/bot).

## Testing
- **vitest** — fast, TS-native. The dice parser (`packages/dice`) is exhaustively unit-tested
  (+ property tests for roll invariants). This is the tdd-gate test framework.

## Tooling
- Lint/format: ESLint + Prettier (TypeScript config). See `coding-standards.md`.
- Slash-command registration via a `deploy-commands` script (REST) after a `list_commands` check.

## Hard constraints
- Discord ToS: bot accounts only, no self-bot, no mass-DM, respect rate limits.
- Least-privilege intents/permissions per bot.
- No member PII stored or logged.
- Solo maintainer; hobby budget.
- License: MIT.

## Deferred
- **Hosting/runtime target** — `[CONFIRM-01]` in `open-questions.md`. Self-host now → small cloud
  later. Couples to reminder-state persistence on ephemeral filesystems (decide together pre-deploy).
