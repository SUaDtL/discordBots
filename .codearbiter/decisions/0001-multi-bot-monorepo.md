---
status: accepted
date: 2026-06-14
title: Multi-bot monorepo via npm workspaces
decided-by: brennonhuff@gmail.com
supersedes: none
governs: bots/*, packages/*, tools/*, package.json
---

# ADR-0001 — Multi-bot monorepo via npm workspaces

## Status
Accepted

## Context
`discordBots/` is the receiving end for discordArbiter `projectCharter` handoffs; discordArbiter
ships no bot code. More than one chartered bot is expected over time (dungeon-herald is the first).
The repo must house multiple independent bots plus shared code, without a separate repo per bot.

## Decision
Structure the repo as a multi-bot monorepo using npm workspaces (built-in, zero extra tooling). Bots
live in `bots/<slug>/`, shared code in `packages/*`, the scaffolding generator in `tools/new-bot`,
workspace state in `.codearbiter/`.

## Alternatives considered
- **One repo per bot** — rejected: duplicates shared code (dice parser, config) and tooling across
  repos; no single home for the charter pipeline.
- **Turborepo / nx** — rejected for now: build complexity not justified at a few small bots; revisit
  if scale grows.

## Consequences
Shared code lives once and is imported by every bot; one install, one lint/format/test config; new
charters drop in as sibling folders. The per-bot config convention must be designed to generalize —
mitigated by building the generator against dungeon-herald (accepted n=1 risk).

## Risks
The per-bot convention is generalized from a single bot and may need revision at bot #2. Tooling may
prove insufficient if bot count or build complexity grows (would reopen this decision toward turbo/nx).
