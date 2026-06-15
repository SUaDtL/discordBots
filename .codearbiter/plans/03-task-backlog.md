# 03 — Task Backlog

Flat, prioritized, MVP-first. Estimates in days (1–5). Role: BE=backend/bot, INFRA=tooling/build.
Deps flagged. Spikes time-boxed.

## MVP

| # | Task | Role | Est | Deps | Verification (→ tdd obligation) |
|---|---|---|---|---|---|
| T1 | Monorepo scaffold: npm workspaces root, `tsconfig.base.json`, lint/format, vitest, MIT `LICENSE` + SPDX header convention | INFRA | 1 | — | `npm install` clean; `npm test` runs; lint passes |
| T2 | **S2 design:** write dice grammar spec (precedence, adv/kh/explode composition) | BE | 0.5 | T1 | spec doc committed; reviewed |
| T3 | `packages/dice` tokenizer + parser → AST (full grammar) **test-first** | BE | 2 | T2 | unit tests: every grammar form parses; invalid → typed parse error |
| T4 | `packages/dice` evaluator: unbiased RNG (`crypto.randomInt`), adv/dis, kh/kl/dh/dl, explode+cap, absurd-input cap | BE | 2 | T3 | property tests: total==sum(kept)+mods; |kept| correct; explode terminates; `1000d1000`→cap |
| T5 | `packages/dice` formatter: per-die + total render string | BE | 0.5 | T4 | unit tests on formatted output |
| T6 | `packages/bot-core`: config loader (env token + per-bot config), registration helpers | BE | 1 | T1 | unit tests: loads config; missing token → clear error |
| T7 | `packages/bot-core`: `RemindedStore` interface + JSON file impl (get/markReminded/list/prune) | BE | 1 | T6 | unit tests: mark→list persists; prune ages out; survives reload |
| T8 | **S1 spike (foldable):** discord.js v14 list_events + post embed w/ `allowed_mentions` role ping | BE | 0.5 | T6 | manual smoke in Dot_E's Server |
| T9 | `bots/dungeon-herald`: `/roll` handler wiring dice → interaction reply | BE | 0.5 | T4,T5,T6 | `/roll` behaviors per DoD live |
| T10 | `bots/dungeon-herald`: `/nextsession` handler (list_events → soonest) | BE | 0.5 | T6,T8 | returns soonest / "no sessions scheduled" |
| T11 | `bots/dungeon-herald`: reminder poller — window `[start-30m,start)`, exactly-once + catch-up via RemindedStore | BE | 2 | T7,T8 | tests w/ injected clock + fake events: fires once; catch-up; no re-send after restart |
| T12 | `deploy-commands` script: register `/roll`,`/nextsession` after `list_commands` check | INFRA | 0.5 | T9,T10 | commands appear once; no double-register |
| T13 | `tools/new-bot <slug>` generator: scaffold bots/<slug>/ to the bot-core convention | INFRA | 1.5 | T6 | `new-bot test` yields a runnable empty bot |
| T14 | End-to-end live verify in Dot_E's Server; least-privilege intents confirmed; no PII in logs | BE | 0.5 | T9–T12 | full MVP DoD demonstrated |

**MVP critical path:** T1→T2→T3→T4→(T9/T11)→T14. Estimate ≈ 15.5 person-days.

## v1 (deferred — pulled by a real 2nd charter / pre-deploy)

| # | Task | Role | Est | Deps |
|---|---|---|---|---|
| T15 | Resolve [CONFIRM-01] hosting + persistence (persistent volume/store for reminders.json) | INFRA | 1 | T11 |
| T16 | Resolve [CONFIRM-02] reschedule/cancel semantics; implement chosen behavior | BE | 1 | T11 |
| T17 | Onboard 2nd chartered bot; revise per-bot convention as needed (R3) | BE/INFRA | 2–3 | T13 |
| T18 | Optional `RemindedStore` SQLite impl behind existing interface | BE | 1 | T7 |

## Spikes (time-boxed, in-line above)
- **S1** (T8, 0.5d): discord.js v14 events+send smoke — can fold into MVP, not throwaway.
- **S2** (T2, 0.5d): dice grammar spec — design task, output is the test contract.
