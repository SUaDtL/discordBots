// SPDX-License-Identifier: MIT
//
// /nextsession handler (AC-09, AC-10). Reads the guild's scheduled events via an injected
// `fetchEvents` (no discord.js here), picks the soonest event strictly after `now`, and replies with
// its name + a Discord timestamp. No member data is read or echoed — event name + start time only.

import { SlashCommandBuilder } from 'discord.js';

/** Slash-command shape: `/nextsession`, no options. */
export const nextSessionCommand = new SlashCommandBuilder()
  .setName('nextsession')
  .setDescription('Show the soonest upcoming scheduled session.');

/** Minimal event shape this handler needs. Epoch ms start time. No member fields. */
export interface SessionEvent {
  name: string;
  startTime: number;
}

export interface NextSessionDeps {
  now: number;
  fetchEvents(): Promise<SessionEvent[]>;
  reply(message: string): Promise<void>;
}

/** Format an epoch-ms instant as a Discord long-date-time timestamp. */
function discordTimestamp(epochMs: number): string {
  return `<t:${Math.floor(epochMs / 1000)}:F>`;
}

/** Reply with the soonest future scheduled session, or a friendly "none" message. */
export async function handleNextSession(deps: NextSessionDeps): Promise<void> {
  const { now, fetchEvents, reply } = deps;
  const events = await fetchEvents();

  const upcoming = events
    .filter((e) => e.startTime > now)
    .sort((a, b) => a.startTime - b.startTime);

  const next = upcoming[0];
  if (next === undefined) {
    await reply('There are no sessions scheduled.');
    return;
  }

  await reply(`Next session: **${next.name}** — ${discordTimestamp(next.startTime)}`);
}
