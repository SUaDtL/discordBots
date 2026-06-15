# Sprint Spec — dungeon-herald MVP (+ workspace foundation)

**Slug:** dungeon-herald-mvp
**Date:** 2026-06-14
**Stage:** 1
**Source:** charter `../discordArbiter/charters/dungeon-herald.md`, decompose plans/01–03, ADR-0001..0004.

## Problem
`discordBots` is a multi-bot monorepo for discordArbiter charter handoffs. This sprint stands up the
workspace foundation and builds the first chartered bot, **dungeon-herald**: in-server dice and
session reminders for Dot's Dungeon (Dot_E's Server, guild `1119021914086703194`).

## Scope (in)
- **Workspace foundation:** npm workspaces, strict TypeScript, ESLint+Prettier, vitest, MIT LICENSE,
  .gitignore.
- **`packages/dice`:** full TTRPG dice parser + unbiased evaluator + formatter (the trust crux),
  exhaustively unit-tested.
- **`packages/bot-core`:** config loader, `RemindedStore` (interface + JSON impl), idempotent command
  registration helper, pure reminder-scheduler core.
- **`bots/dungeon-herald`:** `/roll` and `/nextsession` handlers, the reminder poller (exactly-once +
  catch-up), least-privilege entrypoint, deploy-commands script.
- **`tools/new-bot`:** generator that scaffolds a new bot to the per-bot convention.

## Scope (out)
- **Live Discord operator steps** — inviting the bot, setting `DISCORD_TOKEN_DUNGEON_HERALD`, running
  deploy-commands against live Discord, and observing a real reminder fire. These need the operator's
  token + a live event; subagents build and mock-test the logic, the operator performs the live run
  post-PR. `[NEEDS-TRIAGE: operator-live-verify]`.
- **v1 backlog (T15–T18):** hosting/persistence resolution `[CONFIRM-01]`, reschedule semantics
  `[CONFIRM-02]`, onboarding a 2nd bot, SQLite store. Blocked on external inputs. `[NEEDS-TRIAGE: v1]`.
- Hosting target — deferred `[CONFIRM-01]`; does not affect MVP code (plain Node process, local JSON).

## Acceptance criteria
- **AC-01** — `/roll 2d6+3` returns two d6 results plus the +3 modifier and a correct total.
- **AC-02** — `/roll 1d20 adv` rolls 2d20 and keeps the highest; `1d20 dis` keeps the lowest.
- **AC-03** — `/roll 4d6kh3` keeps the highest 3 of 4 dice; `kl`/`dh`/`dl` keep/drop analogues work.
- **AC-04** — `/roll 3d6!` explodes a max die (re-roll and add) and terminates under a fixed cap.
- **AC-05** — multi-term notation `2d6+1d4+1` evaluates every term and sums correctly.
- **AC-06** — invalid notation (e.g. `abc`, `2x6`) returns a clear error string, never throws/crashes.
- **AC-07** — absurd input (e.g. `1000d1000`) returns a friendly cap message; evaluation is bounded
  (dice-count and sides caps enforced before rolling).
- **AC-08** — die results are unbiased and within `[1, M]` for `NdM`, produced via `crypto.randomInt`
  through an injectable RNG.
- **AC-09** — `/nextsession` returns the soonest future scheduled event's name and start time.
- **AC-10** — `/nextsession` with no upcoming events returns "no sessions scheduled".
- **AC-11** — given an event entering `[start-30min, start)`, the scheduler yields exactly one
  reminder for it; the poller posts an embed to `#table-talk` pinging `@Players` via explicit
  `allowed_mentions.roles`.
- **AC-12** — catch-up: if the fire moment passed while down but the event has not started, the
  scheduler yields the reminder on the next tick after restart.
- **AC-13** — no re-send: an event whose ID is already in the persisted `RemindedStore` is never
  reminded again, including across a process restart.
- **AC-14** — command registration is idempotent: it checks existing commands (`list_commands`
  equivalent) and does not double-register `/roll` or `/nextsession`.
- **AC-15** — the dungeon-herald client requests only least-privilege intents: Guild Scheduled Events,
  and the gateway/permission set needed to send messages + embeds + use application commands; it does
  NOT request Message Content, Guild Members, or privileged management intents.
- **AC-16** — no member PII is stored or logged: the reminder store persists only `{eventId, startTime}`;
  no usernames/user IDs are written to disk or logs.
- **AC-17** — `tools/new-bot <slug>` scaffolds `bots/<slug>/` (package.json, tsconfig, config skeleton,
  entrypoint skeleton, `data/`) that typechecks as a runnable empty bot to the per-bot convention.

## Open questions
- `[CONFIRM-01]` hosting/persistence and `[CONFIRM-02]` reschedule semantics — recorded in
  `open-questions.md`. Neither blocks this MVP (see Scope out). Reminder uses the documented default:
  once reminded never re-remind; cancelled events never fire.

## Security note (gates remain hard stops)
Secrets (bot token) come from env only (`DISCORD_TOKEN_DUNGEON_HERALD`), per `security-controls.md`.
RNG uses `crypto.randomInt` (game-dice, pre-approved as non-security-critical in `security-controls.md`).
Any reviewer CRITICAL on secrets/crypto/auth halts the sprint per hard-gate rules.
