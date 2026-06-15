// SPDX-License-Identifier: MIT
//
// Pure reminder-scheduler core (AC-11, AC-12, AC-13). NO discord.js — fully testable with an
// injected `now` and any RemindedStore.
//
// An event is "due" when it sits in the window [startTime - leadMs, startTime) AND its id is not
// already in the store. This yields three properties for free:
//   - exactly-once: combined with the caller marking the store after a successful send, an event is
//     returned at most once (subsequent ticks see it in the store).
//   - catch-up: if the process was down at the fire moment but the event has not started yet, the
//     event is still in-window on the next tick and is returned (AC-12).
//   - no past sends: at/after startTime the event leaves the window and is excluded.

import type { RemindedStore } from './reminded-store.js';

/** An event the scheduler can reason about. Epoch ms start time. */
export interface SchedulableEvent {
  id: string;
  startTime: number;
}

export interface DueParams {
  now: number;
  events: SchedulableEvent[];
  store: RemindedStore;
  leadMs: number;
}

/**
 * Return the events currently due for a reminder: in-window `[start-lead, start)` and not already
 * recorded in the store. Pure with respect to its inputs (it only reads the store).
 */
export async function dueReminders(p: DueParams): Promise<SchedulableEvent[]> {
  const { now, events, store, leadMs } = p;
  const due: SchedulableEvent[] = [];

  for (const event of events) {
    const windowOpen = event.startTime - leadMs;
    const inWindow = now >= windowOpen && now < event.startTime;
    if (!inWindow) {
      continue;
    }
    if (await store.has(event.id)) {
      continue; // already reminded — never re-send (AC-13)
    }
    due.push(event);
  }

  return due;
}
