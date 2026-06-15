// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonRemindedStore } from '@discord-bots/bot-core';
import { runReminderTick, buildReminderMessage } from './reminder.js';

const LEAD = 30 * 60 * 1000;
const START = 2_000_000_000_000;
const PLAYERS_ROLE_ID = '333333333333333333';

let dir: string;
let storePath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dh-reminder-'));
  storePath = join(dir, 'reminders.json');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('runReminderTick', () => {
  it('sends exactly one reminder for an in-window event, then persists it (AC-11, AC-13)', async () => {
    const store = new JsonRemindedStore(storePath);
    const sendReminder = vi.fn().mockResolvedValue(undefined);
    const fetchEvents = vi.fn().mockResolvedValue([{ id: 'evt-1', startTime: START }]);

    await runReminderTick({
      now: START - 10 * 60 * 1000, // inside [start-30m, start)
      leadMs: LEAD,
      fetchEvents,
      store,
      sendReminder,
    });

    expect(sendReminder).toHaveBeenCalledTimes(1);
    expect(sendReminder.mock.calls[0]![0]).toMatchObject({ id: 'evt-1', startTime: START });
    expect(await store.has('evt-1')).toBe(true);
  });

  it('does NOT re-send on a second tick (exactly-once across ticks, AC-13)', async () => {
    const store = new JsonRemindedStore(storePath);
    const sendReminder = vi.fn().mockResolvedValue(undefined);
    const fetchEvents = vi.fn().mockResolvedValue([{ id: 'evt-1', startTime: START }]);
    const now = START - 10 * 60 * 1000;

    await runReminderTick({ now, leadMs: LEAD, fetchEvents, store, sendReminder });
    await runReminderTick({ now, leadMs: LEAD, fetchEvents, store, sendReminder });

    expect(sendReminder).toHaveBeenCalledTimes(1);
  });

  it('does NOT mark the store when the send fails — so it retries next tick', async () => {
    const store = new JsonRemindedStore(storePath);
    const fetchEvents = vi.fn().mockResolvedValue([{ id: 'evt-1', startTime: START }]);
    const now = START - 10 * 60 * 1000;

    const failing = vi.fn().mockRejectedValue(new Error('discord down'));
    await runReminderTick({ now, leadMs: LEAD, fetchEvents, store, sendReminder: failing });
    expect(await store.has('evt-1')).toBe(false);

    const ok = vi.fn().mockResolvedValue(undefined);
    await runReminderTick({ now, leadMs: LEAD, fetchEvents, store, sendReminder: ok });
    expect(ok).toHaveBeenCalledTimes(1);
    expect(await store.has('evt-1')).toBe(true);
  });

  it('catch-up: a fresh store on the same file does NOT re-send an already-marked event (AC-12, AC-13)', async () => {
    const first = new JsonRemindedStore(storePath);
    const send1 = vi.fn().mockResolvedValue(undefined);
    const fetchEvents = vi.fn().mockResolvedValue([{ id: 'evt-1', startTime: START }]);
    const now = START - 10 * 60 * 1000;
    await runReminderTick({ now, leadMs: LEAD, fetchEvents, store: first, sendReminder: send1 });
    expect(send1).toHaveBeenCalledTimes(1);

    // Simulate process restart: brand-new store pointed at the SAME file.
    const reborn = new JsonRemindedStore(storePath);
    const send2 = vi.fn().mockResolvedValue(undefined);
    await runReminderTick({ now, leadMs: LEAD, fetchEvents, store: reborn, sendReminder: send2 });
    expect(send2).not.toHaveBeenCalled();
  });

  it('catch-up: a never-marked in-window event IS sent after a restart (AC-12)', async () => {
    // Process was down during the fire moment; on restart the event is still before start.
    const reborn = new JsonRemindedStore(storePath);
    const send = vi.fn().mockResolvedValue(undefined);
    const fetchEvents = vi.fn().mockResolvedValue([{ id: 'evt-1', startTime: START }]);
    await runReminderTick({
      now: START - 60 * 1000, // still inside the window, fire moment passed while down
      leadMs: LEAD,
      fetchEvents,
      store: reborn,
      sendReminder: send,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not send before the window opens (boundary)', async () => {
    const store = new JsonRemindedStore(storePath);
    const send = vi.fn().mockResolvedValue(undefined);
    const fetchEvents = vi.fn().mockResolvedValue([{ id: 'evt-1', startTime: START }]);
    await runReminderTick({
      now: START - LEAD - 1, // one ms before the window opens
      leadMs: LEAD,
      fetchEvents,
      store,
      sendReminder: send,
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('buildReminderMessage', () => {
  it('pings @Players via explicit allowed_mentions.roles (AC-11)', () => {
    const msg = buildReminderMessage({
      event: { id: 'evt-1', name: 'Session Zero', startTime: START },
      playersRoleId: PLAYERS_ROLE_ID,
    });
    expect(msg.allowedMentions).toEqual({ roles: [PLAYERS_ROLE_ID] });
    expect(msg.content).toContain(`<@&${PLAYERS_ROLE_ID}>`);
  });

  it('contains NO member PII — no usernames or user IDs (AC-16)', () => {
    const msg = buildReminderMessage({
      event: { id: 'evt-1', name: 'Session Zero', startTime: START },
      playersRoleId: PLAYERS_ROLE_ID,
    });
    const serialized = JSON.stringify(msg);
    // Only the role mention is allowed; assert no user mention syntax leaks in.
    expect(serialized).not.toMatch(/<@\d/); // <@123 / <@!123 user mentions
    expect(msg.allowedMentions.users).toBeUndefined();
    // Embed carries event name + start time only.
    const embedJson = JSON.stringify(msg.embeds);
    expect(embedJson).toContain('Session Zero');
    expect(embedJson).toContain(String(Math.floor(START / 1000)));
  });
});
