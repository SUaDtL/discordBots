// SPDX-License-Identifier: MIT
//
// Per-bot static config for dungeon-herald + loader (AC-15, AC-16).
//
// LEAST-PRIVILEGE INTENTS (AC-15): exactly [Guilds, GuildScheduledEvents]. We need Guilds to resolve
// the guild/channel/role caches and route interactions, and GuildScheduledEvents to read the guild's
// scheduled events for /nextsession and the reminder poller. We do NOT request MessageContent,
// GuildMembers, or any privileged/management intent — sending messages, embedding links, and using
// application commands are channel PERMISSIONS granted by the bot's role, not gateway intents.

import { GatewayIntentBits } from 'discord.js';
import { loadBotConfig } from '@discord-bots/bot-core';
import type { BotConfig, BotStaticConfig } from '@discord-bots/bot-core';

/** Reminder lead time: post the reminder 30 minutes before an event starts (charter). */
export const REMINDER_LEAD_MS = 30 * 60 * 1000;

/** Poller cadence: re-check due reminders roughly every 60 seconds. */
export const POLL_INTERVAL_MS = 60 * 1000;

/** Least-privilege gateway intents for dungeon-herald (AC-15). EXACTLY these two — no more. */
export const DUNGEON_HERALD_INTENTS: readonly GatewayIntentBits[] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildScheduledEvents,
];

/** Static, non-secret config for dungeon-herald. Safe to commit. */
export const dungeonHeraldStaticConfig: BotStaticConfig = {
  slug: 'dungeon-herald',
  guildId: '1119021914086703194',
  channelName: 'table-talk',
  roleName: 'Players',
  intents: [...DUNGEON_HERALD_INTENTS],
};

/**
 * Load the full runtime config (static fields + env-sourced token). The token comes from
 * `DISCORD_TOKEN_DUNGEON_HERALD` only and is never logged.
 */
export function loadDungeonHeraldConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  return loadBotConfig(dungeonHeraldStaticConfig, env);
}
