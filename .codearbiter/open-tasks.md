# Open tasks

In-flight and queued work. One `- ` bullet per task (the statusline and
SessionStart hook count these). Full detail + estimates + deps in
`.codearbiter/plans/03-task-backlog.md`.

## MVP (dungeon-herald + monorepo)
- T1 — Monorepo scaffold: npm workspaces, tsconfig.base, lint/format, vitest, MIT LICENSE + SPDX (INFRA, 1d)
- T2 — S2 design: dice grammar spec (precedence, adv/kh/explode composition) (BE, 0.5d)
- T3 — packages/dice: tokenizer + parser → AST, full grammar, test-first (BE, 2d; dep T2)
- T4 — packages/dice: evaluator — crypto.randomInt, adv/dis, kh/kl/dh/dl, explode+cap, absurd cap (BE, 2d; dep T3)
- T5 — packages/dice: formatter (per-die + total) (BE, 0.5d; dep T4)
- T6 — packages/bot-core: config loader + registration helpers (BE, 1d; dep T1)
- T7 — packages/bot-core: RemindedStore interface + JSON impl (get/markReminded/list/prune) (BE, 1d; dep T6)
- T8 — S1 spike (foldable): discord.js v14 list_events + embed w/ allowed_mentions role ping (BE, 0.5d; dep T6)
- T9 — dungeon-herald: /roll handler (dice → reply) (BE, 0.5d; dep T4,T5,T6)
- T10 — dungeon-herald: /nextsession handler (list_events → soonest) (BE, 0.5d; dep T6,T8)
- T11 — dungeon-herald: reminder poller, window + exactly-once + catch-up (BE, 2d; dep T7,T8)
- T12 — deploy-commands script (register after list_commands check) (INFRA, 0.5d; dep T9,T10)
- T13 — tools/new-bot generator: scaffold bots/<slug>/ to the convention (INFRA, 1.5d; dep T6)
- T14 — End-to-end live verify in Dot_E's Server; least-privilege + no-PII check (BE, 0.5d; dep T9–T12)

## v1 (deferred — pulled by 2nd charter / pre-deploy)
- T15 — Resolve [CONFIRM-01] hosting + reminder-state persistence (INFRA, 1d; dep T11)
- T16 — Resolve [CONFIRM-02] reschedule/cancel semantics + implement (BE, 1d; dep T11)
- T17 — Onboard 2nd chartered bot; revise per-bot convention (BE/INFRA, 2–3d; dep T13)
- T18 — Optional RemindedStore SQLite impl behind the interface (BE, 1d; dep T7)
