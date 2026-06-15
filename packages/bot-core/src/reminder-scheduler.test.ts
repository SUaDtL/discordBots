// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { dueReminders } from './reminder-scheduler.js';
import type { SchedulableEvent } from './reminder-scheduler.js';
import type { RemindedEvent, RemindedStore } from './reminded-store.js';

const LEAD = 30 * 60 * 1000; // 30 minutes

/** Minimal in-memory store for pure scheduler tests. */
class MemoryStore implements RemindedStore {
  private readonly map = new Map<string, RemindedEvent>();
  async has(eventId: string): Promise<boolean> {
    return this.map.has(eventId);
  }
  async markReminded(e: RemindedEvent): Promise<void> {
    this.map.set(e.eventId, e);
  }
  async list(): Promise<RemindedEvent[]> {
    return [...this.map.values()];
  }
  async prune(beforeEpochMs: number): Promise<void> {
    for (const [id, e] of this.map) {
      if (e.startTime < beforeEpochMs) this.map.delete(id);
    }
  }
}

const START = 1_000_000_000_000;

function eventAt(id: string, startTime: number): SchedulableEvent {
  return { id, startTime };
}

describe('dueReminders', () => {
  it('returns an event currently in the window [start-lead, start)', async () => {
    const store = new MemoryStore();
    const events = [eventAt('e1', START)];
    const now = START - LEAD + 1; // inside window
    const due = await dueReminders({ now, events, store, leadMs: LEAD });
    expect(due.map((e) => e.id)).toEqual(['e1']);
  });

  it('returns the event at the exact lower edge (now === start - lead)', async () => {
    const store = new MemoryStore();
    const now = START - LEAD;
    const due = await dueReminders({ now, events: [eventAt('e1', START)], store, leadMs: LEAD });
    expect(due.map((e) => e.id)).toEqual(['e1']);
  });

  it('does NOT return an event before its window (now < start - lead)', async () => {
    const store = new MemoryStore();
    const now = START - LEAD - 1;
    const due = await dueReminders({ now, events: [eventAt('e1', START)], store, leadMs: LEAD });
    expect(due).toEqual([]);
  });

  it('does NOT return an event whose id is already in the store (no re-send across restart)', async () => {
    const store = new MemoryStore();
    await store.markReminded({ eventId: 'e1', startTime: START });
    const now = START - LEAD + 1;
    const due = await dueReminders({ now, events: [eventAt('e1', START)], store, leadMs: LEAD });
    expect(due).toEqual([]);
  });

  it('catch-up: fire moment passed while down but event has not started (now < start) -> returned', async () => {
    const store = new MemoryStore();
    // now is well past start-lead but still before start: the reminder was missed during downtime.
    const now = START - 60_000; // 1 minute before start, lead is 30 min
    const due = await dueReminders({ now, events: [eventAt('e1', START)], store, leadMs: LEAD });
    expect(due.map((e) => e.id)).toEqual(['e1']);
  });

  it('does NOT return an event at or after its start (now >= start)', async () => {
    const store = new MemoryStore();
    const atStart = await dueReminders({
      now: START,
      events: [eventAt('e1', START)],
      store,
      leadMs: LEAD,
    });
    expect(atStart).toEqual([]);
    const afterStart = await dueReminders({
      now: START + 1,
      events: [eventAt('e1', START)],
      store,
      leadMs: LEAD,
    });
    expect(afterStart).toEqual([]);
  });

  it('returns each in-window event exactly once and filters a mixed batch correctly', async () => {
    const store = new MemoryStore();
    await store.markReminded({ eventId: 'already', startTime: START });
    const now = START - LEAD + 1;
    const events = [
      eventAt('in-window', START), // due
      eventAt('already', START), // in store -> excluded
      eventAt('too-early', START + LEAD * 2), // before window -> excluded
      eventAt('started', now - 1), // already started -> excluded
    ];
    const due = await dueReminders({ now, events, store, leadMs: LEAD });
    expect(due.map((e) => e.id)).toEqual(['in-window']);
  });
});
