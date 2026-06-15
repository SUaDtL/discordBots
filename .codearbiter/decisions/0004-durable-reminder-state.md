---
status: accepted
date: 2026-06-14
title: Durable reminder state via per-bot JSON file behind a storage interface
decided-by: brennonhuff@gmail.com
supersedes: none
governs: packages/bot-core/**, bots/*/src/**, bots/*/data/**
---

# ADR-0004 — Durable reminder state via per-bot JSON file behind a storage interface

## Status
Accepted

## Context
dungeon-herald's reminder must fire exactly once per event and catch up within the window: if the
process was down at the 30-min mark but the event has not yet started, send a late reminder on
restart; never re-send for an event already reminded. This requires durable state — contradicting the
charter's "State: none persistent... No database needed."

## Decision
Persist a per-bot reminded-events store: a flat JSON file (e.g. `bots/dungeon-herald/data/reminders.json`)
recording each reminded event's ID and start time, accessed through a narrow `RemindedStore`
interface (get/markReminded/list/prune) so the backing store can swap to SQLite later without
touching reminder logic.

## Alternatives considered
- **Fully stateless (charter's literal "no state")** — rejected: a restart inside the fire window
  re-posts the reminder, violating exactly-once.
- **SQLite / external DB now** — rejected: overkill for a small reminded-ID set at one writer; the
  interface preserves it as a later swap.

## Consequences
Exactly-once + catch-up with zero external dependencies, trivial to inspect/debug, and a preserved
swap point behind the interface. Supersedes the charter's stateless claim (recorded as a resolved
deviation in open-questions). Requires aging out old event IDs.

## Risks
On an ephemeral-filesystem host, `reminders.json` is lost on redeploy and exactly-once/catch-up
breaks — couples to the deferred hosting decision ([CONFIRM-01]); a persistent volume or external
store must be chosen before any cloud deploy.
