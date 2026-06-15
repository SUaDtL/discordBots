// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonRemindedStore } from './reminded-store.js';

let dir: string;
let filePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'reminded-store-'));
  filePath = join(dir, 'reminders.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('JsonRemindedStore', () => {
  it('has() is false for an unknown event and true after markReminded', async () => {
    const store = new JsonRemindedStore(filePath);
    expect(await store.has('evt-1')).toBe(false);
    await store.markReminded({ eventId: 'evt-1', startTime: 1000 });
    expect(await store.has('evt-1')).toBe(true);
  });

  it('list() returns marked events', async () => {
    const store = new JsonRemindedStore(filePath);
    await store.markReminded({ eventId: 'evt-1', startTime: 1000 });
    await store.markReminded({ eventId: 'evt-2', startTime: 2000 });
    const list = await store.list();
    expect(list).toEqual(
      expect.arrayContaining([
        { eventId: 'evt-1', startTime: 1000 },
        { eventId: 'evt-2', startTime: 2000 },
      ]),
    );
    expect(list).toHaveLength(2);
  });

  it('persists across a fresh store instance pointed at the same file (durability)', async () => {
    const first = new JsonRemindedStore(filePath);
    await first.markReminded({ eventId: 'evt-durable', startTime: 5000 });

    const second = new JsonRemindedStore(filePath);
    expect(await second.has('evt-durable')).toBe(true);
    expect(await second.list()).toEqual([{ eventId: 'evt-durable', startTime: 5000 }]);
  });

  it('creates the file/dir if missing and starts empty', async () => {
    const nested = join(dir, 'deep', 'nested', 'reminders.json');
    const store = new JsonRemindedStore(nested);
    expect(await store.list()).toEqual([]);
    await store.markReminded({ eventId: 'evt-1', startTime: 1000 });
    expect(existsSync(nested)).toBe(true);
  });

  it('tolerates a corrupt file by starting empty', async () => {
    writeFileSync(filePath, '{ this is not valid json ]');
    const store = new JsonRemindedStore(filePath);
    expect(await store.list()).toEqual([]);
    // and can still write
    await store.markReminded({ eventId: 'evt-1', startTime: 1000 });
    expect(await store.has('evt-1')).toBe(true);
  });

  it('markReminded is idempotent for the same eventId', async () => {
    const store = new JsonRemindedStore(filePath);
    await store.markReminded({ eventId: 'evt-1', startTime: 1000 });
    await store.markReminded({ eventId: 'evt-1', startTime: 1000 });
    expect(await store.list()).toHaveLength(1);
  });

  it('prune drops events whose startTime < cutoff and keeps the rest', async () => {
    const store = new JsonRemindedStore(filePath);
    await store.markReminded({ eventId: 'past', startTime: 1000 });
    await store.markReminded({ eventId: 'boundary', startTime: 2000 });
    await store.markReminded({ eventId: 'future', startTime: 3000 });
    await store.prune(2000);
    const ids = (await store.list()).map((e) => e.eventId);
    expect(ids).not.toContain('past');
    // boundary startTime == cutoff is NOT < cutoff, so it is kept
    expect(ids).toContain('boundary');
    expect(ids).toContain('future');
  });

  it('prune persists across a fresh instance', async () => {
    const store = new JsonRemindedStore(filePath);
    await store.markReminded({ eventId: 'past', startTime: 1000 });
    await store.markReminded({ eventId: 'future', startTime: 3000 });
    await store.prune(2000);
    const reopened = new JsonRemindedStore(filePath);
    expect((await reopened.list()).map((e) => e.eventId)).toEqual(['future']);
  });

  it('writes ONLY {eventId, startTime} to disk — no PII keys', async () => {
    const store = new JsonRemindedStore(filePath);
    await store.markReminded({ eventId: 'evt-1', startTime: 1000 });
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const events = Array.isArray(parsed) ? parsed : (parsed as { events: unknown[] }).events;
    for (const e of events as Array<Record<string, unknown>>) {
      expect(Object.keys(e).sort()).toEqual(['eventId', 'startTime']);
    }
    // Defensive: the raw text must not contain common PII field names.
    expect(raw).not.toMatch(/username|userId|userName|displayName|email/i);
  });
});
