# 02 — Phased Build Plan

Maturity `stage:` for the MVP phase = **1**.

## MVP — "dungeon-herald is live and trustworthy"
**Goal:** the three demo behaviors work in Dot_E's Server, on a monorepo that obviously generalizes.

**Included:**
- Monorepo scaffold: npm workspaces, `tsconfig.base.json`, lint/format, MIT `LICENSE`, vitest.
- `packages/dice`: FULL TTRPG grammar (NdM±K multi-term, adv/dis, kh/kl/dh/dl, explode `!`, cap),
  unbiased RNG (`crypto.randomInt`), exhaustive tests. **Built test-first — the trust crux.**
- `packages/bot-core`: config loader, registration helpers, `RemindedStore` iface + JSON impl.
- `bots/dungeon-herald`: `/roll`, `/nextsession`, reminder poller (exactly-once + catch-up).
- `deploy-commands` script (registers `/roll`, `/nextsession` after `list_commands` check).
- `tools/new-bot` generator proving the per-bot convention against dungeon-herald.

**Deferred (with rationale):**
- Hosting/cloud — barely affects code; decide before deploy ([CONFIRM-01]).
- Advantage/keep-drop/exploding were considered "later" by the charter but PULLED INTO MVP by user
  choice (full grammar) — so nothing dice-related is deferred.
- A real 2nd bot — none chartered yet; generator built but exercised at n=1.

**Key risks:** R1 dice correctness; R2 reminder exactly-once/catch-up; R3 n=1 convention.

**Definition of done (measurable):**
- `/roll 2d6+3` → two d6 + 3, correct total; `1d20 adv` rolls 2d20 keep-high; `4d6kh3` drops lowest;
  `3d6!` explodes under cap; `1000d1000` → friendly cap; invalid → clear error, no crash.
- `/nextsession` → soonest future event, or "no sessions scheduled".
- Reminder posts to `#table-talk` + pings `@Players` ~30 min before an event, exactly once; a
  restart inside the window catches up; a restart after firing does not re-send.
- Bot requests only the least-privilege intents/permissions; no PII stored/logged.
- `tools/new-bot <slug>` produces a runnable empty bot to the convention.

## v1 — "robustness + a second bot"
**Goal:** harden and validate the workspace against a real second charter.
**Included:** revise the per-bot convention against bot #2; cloud hosting + persistent store decision
([CONFIRM-01]); reminder reschedule/cancel handling ([CONFIRM-02]); optional `RemindedStore` SQLite
impl if state needs grow.
**Deferred:** anything not pulled by a concrete charter.
**Risks:** convention churn (R3 realized); host FS persistence.
**DoD:** a second chartered bot runs from the generated scaffold with no bot-core rework beyond the
deliberately-provisional convention; reminders survive redeploy on the chosen host.

## v2 — "reuse / polish"
**Goal:** if the "public framework" door (left open) is taken, formalize reusable bot presets/docs.
**Included:** TBD by then — presets, contribution docs, possible npm publish.
**Deferred:** everything until there's a reason.
**DoD:** N/A until scoped.
