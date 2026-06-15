// SPDX-License-Identifier: MIT
//
// Reminder poller (AC-11, AC-12, AC-13, AC-16). The pure scheduling decision lives in bot-core's
// `dueReminders` (in-window + not-already-reminded). This module wires that to a send + persist:
//
//   - send THEN mark, and mark ONLY after a successful send, so a send failure is retried on the next
//     tick (exactly-once + catch-up; AC-11/AC-12/AC-13).
//   - the reminder payload pings @Players via EXPLICIT allowed_mentions.roles — never relying on the
//     role being mentionable (AC-11).
//   - the payload carries event name + start time ONLY — no member PII (AC-16).

import { EmbedBuilder } from 'discord.js';
import { dueReminders } from '@discord-bots/bot-core';
import type { RemindedStore, SchedulableEvent } from '@discord-bots/bot-core';

/** An event the poller can fetch. Epoch ms start time. No member fields. */
export interface ReminderEvent {
  id: string;
  startTime: number;
}

/** A named event used to build the reminder body (name added for the embed; still no member data). */
export interface NamedReminderEvent extends ReminderEvent {
  name: string;
}

export interface ReminderTickDeps {
  now: number;
  leadMs: number;
  fetchEvents(): Promise<ReminderEvent[]>;
  store: RemindedStore;
  sendReminder(event: ReminderEvent): Promise<void>;
}

/**
 * Run one poll tick: find due events, send each reminder, then mark it reminded. Marking happens
 * only after a successful `sendReminder`, so a failing send is retried next tick. A failure for one
 * event does not block the others.
 */
export async function runReminderTick(deps: ReminderTickDeps): Promise<void> {
  const { now, leadMs, fetchEvents, store, sendReminder } = deps;

  const events = await fetchEvents();
  const schedulable: SchedulableEvent[] = events.map((e) => ({ id: e.id, startTime: e.startTime }));
  const due = await dueReminders({ now, events: schedulable, store, leadMs });

  for (const event of due) {
    try {
      await sendReminder(event);
    } catch {
      // Send failed — do NOT mark, so the next tick retries while still in-window. Do not log member
      // data; the event id/startTime carry no PII.
      continue;
    }
    await store.markReminded({ eventId: event.id, startTime: event.startTime });
  }
}

/** The shape a Discord channel.send accepts for the reminder (subset). No member PII. */
export interface ReminderMessage {
  content: string;
  embeds: ReturnType<EmbedBuilder['toJSON']>[];
  allowedMentions: { roles: string[] };
}

/** Build the reminder message: a role ping + an embed with event name + start time only (AC-16). */
export function buildReminderMessage(opts: {
  event: NamedReminderEvent;
  playersRoleId: string;
}): ReminderMessage {
  const { event, playersRoleId } = opts;
  const startSeconds = Math.floor(event.startTime / 1000);

  const embed = new EmbedBuilder()
    .setTitle('Session starting soon')
    .setDescription(`**${event.name}** starts <t:${startSeconds}:R> (<t:${startSeconds}:F>)`);

  return {
    // Explicit role mention text PLUS explicit allowedMentions so the ping resolves without the role
    // needing to be mentionable, and so NOTHING else (users/everyone) can be pinged.
    content: `<@&${playersRoleId}> a session is starting soon!`,
    embeds: [embed.toJSON()],
    allowedMentions: { roles: [playersRoleId] },
  };
}
