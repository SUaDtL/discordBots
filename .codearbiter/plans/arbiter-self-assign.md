# Plan — arbiter-self-assign

Spec: `.codearbiter/specs/arbiter-self-assign.md`. Stack: Node + TS strict + discord.js v14 + vitest.
Reuses `@discord-bots/bot-core`. Bot package: `@discord-bots/arbiter-self-assign`; token env
`DISCORD_TOKEN_ARBITER_SELF_ASSIGN`. Component interactions tested with mocked discord.js objects (no
live connection). Verification cites tech-stack.md commands.

## AC ledger
AC-01..AC-12 per spec. Bijective coverage proven at end.

## Task table

| id | path(s) | verification | maps-to | covers | depends-on | status |
|---|---|---|---|---|---|---|
| T-01 | (scaffold) `bots/arbiter-self-assign/{package.json,tsconfig.json,src/index.ts,data/.gitkeep}` via `tools/new-bot` then customize | `node tools/new-bot ... ` produces folder; `npx tsc -b` clean with bot in references | scaffold convention | AC-12 | — | ACCEPTED |
| T-02 | `packages/bot-core/src/json-value-store.ts` + `.test.ts`; export from `index.ts` | `vitest run packages/bot-core` — read/write persists one JSON value across reload; missing/corrupt → undefined | generic state store | AC-08,AC-10 | — | ACCEPTED |
| T-03 | `bots/arbiter-self-assign/src/roles.ts` + `.test.ts` (the 12 role defs: colors+hex, Helldivers+3 placeholders, GameNight; managed-name set + guards) | tests: managed set = exactly 12; `isManaged`/partition correct; placeholders flagged | role catalog + guard | AC-01,AC-02 | T-01 | ACCEPTED |
| T-04 | `bots/arbiter-self-assign/src/config.ts` + `.test.ts` | tests: intents == `[Guilds, GuildMembers]` (no MessageContent); guild `1119021914086703194`, channel `1515850507103633641`; token via env | config/intents | AC-09,AC-11 | T-01 | ACCEPTED |
| T-05 | `bots/arbiter-self-assign/src/ensure-roles.ts` + `.test.ts` (mocked guild.roles) | tests: creates only missing managed roles w/ correct props (color/no-perm/not-hoist; ping/GameNight mentionable); adopts existing by name; ZERO ops on a non-managed role present in the guild | ensure-roles + only-12 | AC-01,AC-02 | T-03 | ACCEPTED |
| T-06 | `bots/arbiter-self-assign/src/menu.ts` + `.test.ts` | tests: builds 1 string-select (7 colors, min0/max1) + button row(s) (pings+GameNight); custom IDs stable + namespaced (`selfassign:color`, `selfassign:ping:<slug>`) | menu builder | AC-03,AC-08 | T-03 | ACCEPTED |
| T-07 | `bots/arbiter-self-assign/src/handlers/color.ts` + `.test.ts` (mock select interaction + member roles) | tests: assigns chosen color, removes other managed colors only, ephemeral reply; non-managed roles untouched | color single-select | AC-04,AC-06,AC-02 | T-05,T-06 | ACCEPTED |
| T-08 | `bots/arbiter-self-assign/src/handlers/ping.ts` + `.test.ts` | tests: toggles ping/GameNight (add if absent, remove if held), ephemeral reply; only managed roles touched | ping toggle | AC-05,AC-06,AC-02 | T-05,T-06 | ACCEPTED |
| T-09 | `bots/arbiter-self-assign/src/handlers/post-menu.ts` + `.test.ts` (+ command builder) | tests: admin-gated (Manage Roles) check; posts menu to #roles; persists message id; non-admin rejected ephemerally | /post-role-menu | AC-07,AC-08 | T-06,T-02 | ACCEPTED |
| T-10 | `bots/arbiter-self-assign/src/index.ts` + `.test.ts` | tests: client intents == `[Guilds,GuildMembers]`; registers `/post-role-menu` idempotently; ready→ensure roles + load-or-post menu; interaction routing; guarded main; no token/PII log | entrypoint wiring | AC-07,AC-08,AC-09,AC-10,AC-11 | T-04,T-05,T-07,T-08,T-09 | ACCEPTED |
| T-11 | `bots/arbiter-self-assign/src/deploy-commands.ts` + `.test.ts` | tests (mock REST): idempotent register of `/post-role-menu` | deploy script | AC-07 | T-09 | ACCEPTED |
| T-12 | `bots/arbiter-self-assign/README.md` | doc covers app setup, role-hierarchy (bot role above the 12), Manage Roles + GuildMembers intent, env token, placeholder-rename `[CONFIRM-03]`, live-verify | operator handoff | (docs) | T-10 | ACCEPTED |

## Order & MVP slice
Order via depends-on (no cycles): T-01,T-02 → T-03,T-04 → T-05,T-06 → T-07,T-08,T-09 → T-10 → T-11 → T-12.
**MVP slice = T-01..T-11** (functional, tested bot + deploy script). T-12 (operator README) is the tail.

## Out-of-scope (tagged)
- `[NEEDS-TRIAGE: operator-live-verify]` — app creation, role-hierarchy placement (bot role above the
  12), Manage Roles invite, set `DISCORD_TOKEN_ARBITER_SELF_ASSIGN`, run, click the menu. Operator, post-PR.
- `[CONFIRM-03]` — names of the 3 placeholder game-ping roles (config-driven; rename before live).

## Coverage proof (bijective)
AC-01→T-03,T-05 · AC-02→T-03,T-05,T-07,T-08 · AC-03→T-06 · AC-04→T-07 · AC-05→T-08 · AC-06→T-07,T-08 ·
AC-07→T-09,T-10,T-11 · AC-08→T-02,T-06,T-09,T-10 · AC-09→T-04,T-10 · AC-10→T-02,T-10 · AC-11→T-04,T-10 ·
AC-12→T-01. Every task covers ≥1 AC; every AC covered. (T-12 is the documented operator handoff.)
