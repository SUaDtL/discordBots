---
status: accepted
date: 2026-06-14
title: Node.js + TypeScript + discord.js v14 stack
decided-by: brennonhuff@gmail.com
supersedes: none
governs: bots/**, packages/**, tools/**
---

# ADR-0002 — Node.js + TypeScript + discord.js v14 stack

## Status
Accepted

## Context
The bots need a runtime and Discord library. The user has no language preference (charter). The
trust-critical dice parser benefits from static types and a strong test story. The surrounding
Discord tooling (discordArbiter's MCP) is already pinned to discord.js v14.

## Decision
Node.js (current LTS), TypeScript (strict), discord.js v14 (major-version pinned), vitest as the
test framework. The dice parser is unit-tested exhaustively.

## Alternatives considered
- **Node + plain JavaScript** — rejected: loses static types on the dice AST, exactly where the
  trust-critical parser benefits most.
- **Python + discord.py** — rejected: no stated reason to prefer it; would split the Discord
  toolchain across two ecosystems.

## Consequences
First-class slash commands, scheduled-events reads, and embeds; large community; types on the dice
AST catch parser bugs early; ecosystem-consistent with discordArbiter. Adds a TypeScript build step
(tsc/tsx) to maintain.

## Risks
A discord.js v14 → future-major bump could force API changes — re-audit before any major bump. The
TS build toolchain is one more moving part for a solo maintainer.
