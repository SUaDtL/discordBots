# Plan — dungeon-herald-mvp

Spec: `.codearbiter/specs/dungeon-herald-mvp.md`. Stack: Node LTS + TypeScript (strict) + discord.js
v14 + vitest (npm workspaces). Verification commands cite `tech-stack.md`.

## Acceptance-criterion ledger (AC-01..AC-17)
See spec. Every task below `covers` at least one AC; every AC is covered by ≥1 task (proof at end).

## Task table

| id | path(s) | verification | maps-to (tdd obligation) | covers | depends-on | status |
|---|---|---|---|---|---|---|
| T-01 | `package.json` | `npm install` exits 0; `npm pkg get workspaces` lists `bots/*,packages/*,tools/*` | workspace resolves | foundation | — | ACCEPTED |
| T-02 | `tsconfig.base.json` | a package extending it typechecks (proven at T-08) with `strict:true` | strict TS baseline | foundation | T-01 | ACCEPTED |
| T-03 | `eslint.config.js`, `.prettierrc`, `package.json` (scripts: lint/format/test/typecheck) | `npm run lint` exits 0 on empty tree | lint baseline | foundation | T-01 | ACCEPTED |
| T-04 | `vitest.config.ts`, `package.json` (test script) | `npm test` exits 0 (no tests yet) | test runner | foundation | T-01 | ACCEPTED |
| T-05 | `LICENSE` | file contains `MIT License` and `Brennon Huff` | MIT license | AC-16(posture) | — | ACCEPTED |
| T-06 | `.gitignore` | contains `node_modules/`, `dist/`, `.env` (keeps existing `.decompose-draft/`) | ignore build/secret artifacts | AC-16 | — | ACCEPTED |
| T-07 | `packages/dice/package.json`, `packages/dice/tsconfig.json` | `npm test -w packages/dice` runs; typecheck passes | dice pkg resolves | foundation | T-01,T-02,T-04 | ACCEPTED |
| T-08 | `packages/dice/src/types.ts`, `src/tokenize.ts`, `src/tokenize.test.ts` | `npm test -w packages/dice tokenize` passes; invalid chars → typed lexer error | tokenizer obligations | AC-05,AC-06 | T-07 | ACCEPTED |
| T-09 | `packages/dice/src/parse.ts`, `src/parse.test.ts` | parse tests pass: every grammar form → AST; bad notation → typed ParseError | parser obligations | AC-02,AC-03,AC-04,AC-05,AC-06 | T-08 | ACCEPTED |
| T-10 | `packages/dice/src/rng.ts`, `src/rng.test.ts` | rng tests pass: results in `[1,M]`; injectable; default uses `crypto.randomInt` | unbiased RNG obligation | AC-08 | T-07 | ACCEPTED |
| T-11 | `packages/dice/src/caps.ts`, `src/caps.test.ts` | `1000d1000` and over-cap counts → cap error before rolling | input-cap obligation | AC-07 | T-09 | ACCEPTED |
| T-12 | `packages/dice/src/evaluate.ts`, `src/evaluate.basic.test.ts` | basic+multi-term eval: `total == sum(dice)+mods`; uses injected RNG | basic eval obligations | AC-01,AC-05,AC-08 | T-09,T-10,T-11 | ACCEPTED |
| T-13 | `packages/dice/src/evaluate.ts`, `src/evaluate.advantage.test.ts` | `1d20 adv`→2d20 keep-high; `dis`→keep-low | advantage obligation | AC-02 | T-12 | ACCEPTED |
| T-14 | `packages/dice/src/evaluate.ts`, `src/evaluate.keepdrop.test.ts` | `4d6kh3` keeps top 3; `kl/dh/dl` correct kept-count | keep/drop obligation | AC-03 | T-12 | ACCEPTED |
| T-15 | `packages/dice/src/evaluate.ts`, `src/evaluate.explode.test.ts` | `3d6!` re-rolls max and adds; terminates under fixed cap | exploding obligation | AC-04 | T-12 | ACCEPTED |
| T-16 | `packages/dice/src/format.ts`, `src/format.test.ts` | format string shows each die + total | formatter obligation | AC-01 | T-12 | ACCEPTED |
| T-17 | `packages/dice/src/index.ts`, `src/api.test.ts` | `roll('2d6+3')` returns result; `roll('abc')` returns error result (no throw) | public API obligation | AC-01,AC-06,AC-07 | T-13,T-14,T-15,T-16 | ACCEPTED |
| T-18 | `packages/bot-core/package.json`, `tsconfig.json` | `npm test -w packages/bot-core` runs; typecheck passes | bot-core resolves | T-01,T-02,T-04 | T-01 | ACCEPTED |
| T-19 | `packages/bot-core/src/config.ts`, `src/config.test.ts` | loads `{token,guildId,channel,role,intents}`; missing token → clear Error | config obligations | AC-15,AC-16 | T-18 | ACCEPTED |
| T-20 | `packages/bot-core/src/reminded-store.ts`, `src/reminded-store.test.ts` | `markReminded`→`list` persists across reload (temp file); `prune` drops past events; stores only `{eventId,startTime}` | store obligations | AC-13,AC-16 | T-18 | ACCEPTED |
| T-21 | `packages/bot-core/src/reminder-scheduler.ts`, `src/reminder-scheduler.test.ts` | injected clock+events+store: in-window→one due event; restart-after-fire→none; down-then-restart-before-start→due (catch-up) | scheduler obligations | AC-11,AC-12,AC-13 | T-20 | ACCEPTED |
| T-22 | `packages/bot-core/src/register-commands.ts`, `src/register-commands.test.ts` | mock REST: existing command not re-created; missing one created | idempotent-register obligation | AC-14 | T-18 | ACCEPTED |
| T-23 | `bots/dungeon-herald/package.json`, `tsconfig.json`, `src/config.ts` | typecheck passes; config yields guild `1119021914086703194`, `#table-talk`, `@Players`, least-privilege intents | bot config obligation | AC-15 | T-07,T-18,T-19 | ACCEPTED |
| T-24 | `bots/dungeon-herald/src/commands/roll.ts`, `src/commands/roll.test.ts` | mock interaction: valid dice → reply with per-die+total; invalid → error reply (ephemeral) | /roll handler obligations | AC-01,AC-02,AC-03,AC-04,AC-05,AC-06,AC-07 | T-17,T-23 | ACCEPTED |
| T-25 | `bots/dungeon-herald/src/commands/nextsession.ts`, `src/commands/nextsession.test.ts` | mock scheduled events: soonest future returned; empty → "no sessions scheduled" | /nextsession handler obligations | AC-09,AC-10 | T-23 | ACCEPTED |
| T-26 | `bots/dungeon-herald/src/reminder.ts`, `src/reminder.test.ts` | mock channel.send + fake events + temp store: posts one embed with `allowed_mentions.roles=[Players]`; catch-up; no re-send; no PII in payload | reminder-poller obligations | AC-11,AC-12,AC-13,AC-16 | T-21,T-23 | ACCEPTED |
| T-27 | `bots/dungeon-herald/src/index.ts`, `src/index.test.ts` | intents asserted == least-privilege set (no MessageContent/GuildMembers); wires register+poller; no token logged | entrypoint obligations | AC-14,AC-15,AC-16 | T-22,T-24,T-25,T-26 | ACCEPTED |
| T-28 | `bots/dungeon-herald/src/deploy-commands.ts`, `src/deploy-commands.test.ts` | mock REST: registers `/roll`,`/nextsession` after existing-check; idempotent | deploy-script obligation | AC-14 | T-22,T-24,T-25 | ACCEPTED |
| T-29 | `tools/new-bot/package.json`, `tsconfig.json`, `src/index.ts`, `src/new-bot.test.ts` | run generator for `test-bot` into a temp dir → folder typechecks as a runnable empty bot to the convention | generator obligations | AC-17 | T-18,T-19 | ACCEPTED |

## Order & dependencies
Dependency order is encoded in `depends-on`. No cycles. Topological layers:
1. **Foundation:** T-01 → T-02/T-03/T-04; T-05, T-06 (independent).
2. **dice:** T-07 → T-08 → T-09; T-10, T-11; T-12 → {T-13,T-14,T-15,T-16} → T-17.
3. **bot-core:** T-18 → {T-19, T-20→T-21, T-22}.
4. **dungeon-herald:** T-23 → {T-24, T-25, T-26} → T-27; T-28.
5. **generator:** T-29.

## MVP slice
**Core MVP slice = T-01 … T-28** (a fully-built, unit-tested dungeon-herald + deploy script —
shippable on its own). **T-29 (new-bot generator)** is the incremental tail in this same sprint
(decompose put the generator in MVP). Both are in sprint scope.

## Out-of-scope (tagged)
- `[NEEDS-TRIAGE: operator-live-verify]` — invite bot, set `DISCORD_TOKEN_DUNGEON_HERALD`, run
  deploy-commands live, observe a real reminder. Operator action post-PR (needs token + live event).
- `[NEEDS-TRIAGE: v1]` — `[CONFIRM-01]` hosting/persistence, `[CONFIRM-02]` reschedule semantics,
  2nd-bot onboarding, SQLite store.

## Coverage proof (bijective)
- AC-01 → T-12,T-16,T-17,T-24 · AC-02 → T-09,T-13,T-24 · AC-03 → T-09,T-14,T-24 ·
  AC-04 → T-09,T-15,T-24 · AC-05 → T-08,T-09,T-12,T-24 · AC-06 → T-08,T-09,T-17,T-24 ·
  AC-07 → T-11,T-17,T-24 · AC-08 → T-10,T-12 · AC-09 → T-25 · AC-10 → T-25 ·
  AC-11 → T-21,T-26 · AC-12 → T-21,T-26 · AC-13 → T-20,T-21,T-26 · AC-14 → T-22,T-27,T-28 ·
  AC-15 → T-19,T-23,T-27 · AC-16 → T-19,T-20,T-26,T-27 (+T-05/T-06 posture) · AC-17 → T-29.
- Every task covers ≥1 AC (foundation tasks T-01..T-04 enable the suite; T-05/T-06 cover AC-16 posture).
  No uncovered AC; no coverage-less task.
