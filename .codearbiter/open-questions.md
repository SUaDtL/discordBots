# Open questions

Unresolved `[CONFIRM-NN]` items. Each blocks dependent work until resolved.
The SessionStart hook and statusline count `CONFIRM-NN` occurrences here.

## [CONFIRM-01] Hosting / runtime target
Where the always-on bot processes run. User direction: self-host (home machine / Pi) now → small
cloud (Fly.io / Railway) "when this is more serious." **Coupled to reminder-state persistence**: on an
ephemeral-filesystem host, `bots/<slug>/data/reminders.json` is wiped on redeploy and exactly-once /
catch-up reminders silently break. Decide the host **and** a persistent volume / external store
together, before any cloud deploy. Does not block MVP code (plain Node process).

## [CONFIRM-02] Event reschedule / cancel semantics
How the reminder behaves when a scheduled event is moved or cancelled. Proposed default: once an
event has been reminded, never re-remind even if rescheduled later; cancelled events simply never
fire. Confirm before building the reminder if a different behavior is wanted.

---

## Resolved deviations (not open — recorded for traceability)
- **Charter "State: none persistent / No database needed" → superseded.** The catch-up + exactly-once
  reminder decision requires durable state; resolved by ADR-0004 (per-bot JSON behind `RemindedStore`).
