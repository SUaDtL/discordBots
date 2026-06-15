// SPDX-License-Identifier: MIT
//
// Durable reminded-events store (ADR-0004). Backs exactly-once + catch-up reminders behind a narrow
// interface so the JSON backing can swap to SQLite later without touching reminder logic.
//
// PII boundary (AC-16, security-controls.md): a RemindedEvent holds ONLY {eventId, startTime}. No
// usernames, user IDs, or any member data is ever written to disk. Single-writer assumption: one OS
// process per bot (ADR-0003).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** A reminded event. Epoch ms start time. NO names / user data — PII boundary. */
export interface RemindedEvent {
  eventId: string;
  startTime: number;
}

/** Narrow storage interface for reminded events (swappable backing). */
export interface RemindedStore {
  has(eventId: string): Promise<boolean>;
  markReminded(e: RemindedEvent): Promise<void>;
  list(): Promise<RemindedEvent[]>;
  /** Drop events whose startTime < cutoff. */
  prune(beforeEpochMs: number): Promise<void>;
}

/** On-disk shape. A versioned envelope keeps room for a future format bump. */
interface FileShape {
  version: 1;
  events: RemindedEvent[];
}

/**
 * Flat-JSON `RemindedStore`. Creates the file/dir on first write; tolerates a missing or corrupt
 * file by starting empty. Each operation reads then writes the whole file — fine for the small
 * reminded-ID set under a single writer.
 */
export class JsonRemindedStore implements RemindedStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async has(eventId: string): Promise<boolean> {
    const events = await this.read();
    return events.some((e) => e.eventId === eventId);
  }

  async markReminded(e: RemindedEvent): Promise<void> {
    const events = await this.read();
    if (events.some((existing) => existing.eventId === e.eventId)) {
      return; // idempotent
    }
    // Persist ONLY the two allowed fields — never spread an arbitrary object (PII boundary).
    events.push({ eventId: e.eventId, startTime: e.startTime });
    await this.write(events);
  }

  async list(): Promise<RemindedEvent[]> {
    return this.read();
  }

  async prune(beforeEpochMs: number): Promise<void> {
    const events = await this.read();
    const kept = events.filter((e) => e.startTime >= beforeEpochMs);
    if (kept.length !== events.length) {
      await this.write(kept);
    }
  }

  /** Read and normalize the file; a missing or corrupt file yields an empty list. */
  private async read(): Promise<RemindedEvent[]> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as Partial<FileShape>;
      if (!parsed || !Array.isArray(parsed.events)) {
        return [];
      }
      // Normalize to the two allowed fields, dropping anything unexpected on disk.
      return parsed.events
        .filter(
          (e): e is RemindedEvent =>
            typeof e?.eventId === 'string' && typeof e?.startTime === 'number',
        )
        .map((e) => ({ eventId: e.eventId, startTime: e.startTime }));
    } catch {
      return [];
    }
  }

  private async write(events: RemindedEvent[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const payload: FileShape = { version: 1, events };
    await writeFile(this.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
}
