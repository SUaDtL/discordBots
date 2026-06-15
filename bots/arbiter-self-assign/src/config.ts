// SPDX-License-Identifier: MIT
//
// Per-bot static config for arbiter-self-assign + loader (AC-09, AC-11).
//
// LEAST-PRIVILEGE INTENTS (AC-09): EXACTLY [Guilds, GuildMembers]. Guilds resolves the guild cache
// and routes interactions; GuildMembers (a privileged intent) is REQUIRED to read and modify a
// member's roles for self-assign. We request NOTHING else — never MessageContent, presences, or
// message intents. (Manage Roles is a PERMISSION granted by the bot's role, not a gateway intent.)
//
// CONFIG SHAPE: bot-core's BotStaticConfig models a single {channelName, roleName} bot (dungeon-herald).
// This bot manages 12 roles and targets a channel by ID, so its shape does not fit; we define a local
// static config here and reuse ONLY bot-core's token convention (tokenEnvVar) so the token still comes
// from env and is never logged.

import { GatewayIntentBits } from 'discord.js';
import { tokenEnvVar } from '@discord-bots/bot-core';

/** Least-privilege gateway intents for arbiter-self-assign (AC-09). EXACTLY these two — no more. */
export const ARBITER_SELF_ASSIGN_INTENTS: readonly GatewayIntentBits[] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
];

/** Static, non-secret config for arbiter-self-assign. Safe to commit. */
export interface ArbiterSelfAssignStaticConfig {
  slug: string;
  guildId: string;
  /** The #roles channel id where the self-assign menu is posted (AC-03). */
  rolesChannelId: string;
  intents: GatewayIntentBits[];
}

/** Full runtime config: static fields plus the env-sourced token (never committed/logged). */
export interface ArbiterSelfAssignConfig extends ArbiterSelfAssignStaticConfig {
  token: string;
}

export const arbiterSelfAssignStaticConfig: ArbiterSelfAssignStaticConfig = {
  slug: 'arbiter-self-assign',
  guildId: '1119021914086703194',
  rolesChannelId: '1515850507103633641',
  intents: [...ARBITER_SELF_ASSIGN_INTENTS],
};

/** The env var holding this bot's token (bot-core convention): DISCORD_TOKEN_ARBITER_SELF_ASSIGN. */
export const TOKEN_ENV_VAR: string = tokenEnvVar(arbiterSelfAssignStaticConfig.slug);

/**
 * Load the full runtime config (static fields + env-sourced token). The token comes from
 * `DISCORD_TOKEN_ARBITER_SELF_ASSIGN` only and is NEVER logged. On a missing/empty token this throws
 * an Error that names the env var but never includes any token value (AC-11).
 */
export function loadArbiterSelfAssignConfig(
  env: NodeJS.ProcessEnv = process.env,
): ArbiterSelfAssignConfig {
  const token = env[TOKEN_ENV_VAR];
  if (token === undefined || token.trim() === '') {
    throw new Error(
      `Missing bot token: set the ${TOKEN_ENV_VAR} environment variable for bot ` +
        `"${arbiterSelfAssignStaticConfig.slug}".`,
    );
  }
  return { ...arbiterSelfAssignStaticConfig, token };
}
