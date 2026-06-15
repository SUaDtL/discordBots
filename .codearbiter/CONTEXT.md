---
arbiter: enabled
stage: 1
---

# Project: discordBots

A **multi-bot monorepo** that houses Discord bots built from **discordArbiter `projectCharter`
handoffs**. discordArbiter administers live Discord servers and ships no bot code; when an intent
needs a real member-facing bot (its own codebase + runtime), it authors a charter and hands it here
for codeArbiter to build. Each chartered bot lives under `bots/<slug>/`; shared code lives in
`packages/*`; a generator (`tools/new-bot`) scaffolds new bots to a common convention.

## First bot — dungeon-herald
A bot for **Dot_E's Server** (`1119021914086703194`) serving its tabletop table (~3 players):
- **`/roll <dice>`** — full TTRPG dice notation (NdM±K multi-term, advantage/disadvantage,
  keep/drop highest-lowest, exploding) with unbiased RNG; clear errors and an absurd-input cap.
- **`/nextsession`** — replies with the soonest upcoming scheduled event.
- **Reminder** — ~30 min before each scheduled event, posts an embed to `#table-talk` and pings
  `@Players`, **exactly once**, with catch-up if the process was down at the fire moment.

## Problem
discordArbiter emits bot charters but cannot build bot code; those charters need a consistent home,
build, and runtime. At the bot altitude: Dot's Dungeon has no native in-server dice and no session
reminders — players roll in a third-party app and miss start times.

## Primary users
- **Operator/developer:** brennonhuff@gmail.com (builds and runs the bots; holds tokens).
- **End users:** the ~3 community members per bot who invoke commands.

## Explicitly NOT building
- No member PII stored or logged; no DMs / no mass-DM; bot accounts only; respect rate limits
  (ToS posture carried from discordArbiter, applied workspace-wide).
- Not a multi-tenant / hosted SaaS — runs only in the operator's own guild(s); no signup, billing,
  onboarding, or per-customer isolation.

## Deliberately left open (NOT ruled out)
- Becoming a reusable / public bot framework later.
- Bots that perform server-admin-style features (would overlap discordArbiter; not excluded).

## Architecture at a glance
npm workspaces · Node LTS + TypeScript (strict) + discord.js v14 · vitest. One OS process per bot
(least-privilege token + intents). Durable per-bot reminder state as flat JSON behind a
`RemindedStore` interface. See `.codearbiter/decisions/` (ADR-0001..0004) and
`.codearbiter/plans/`.

<!--INITIALIZED-->
