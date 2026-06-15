---
status: accepted
date: 2026-06-14
title: One OS process per bot
decided-by: brennonhuff@gmail.com
supersedes: none
governs: bots/*
---

# ADR-0003 — One OS process per bot

## Status
Accepted

## Context
The monorepo (ADR-0001) hosts multiple bots. They could share one process (a Client per bot) or run
as separate processes. The charter emphasizes least-privilege per bot — each bot should hold only its
own token and minimal intents.

## Decision
Run one OS process per bot. Each bot is its own deployable Node entrypoint holding only its own token
and least-privilege intents; shared code (dice parser, config loader, storage interface) is imported
from workspace `packages/*`.

## Alternatives considered
- **Single runner, many clients** — rejected: one shared failure domain (one crash downs all bots)
  and all tokens live in one process, weakening isolation and the least-privilege story.

## Consequences
Crash isolation, independent deploy, clean per-bot token/intent least-privilege, and a mental model
that matches per-charter independence. Costs N processes to supervise and N gateway connections —
acceptable at the expected small bot count.

## Risks
Process count and supervision overhead grow linearly with bots. A bot needing to serve multiple
guilds would reopen the per-bot/single-guild assumptions here.
