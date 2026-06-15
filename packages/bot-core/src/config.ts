// SPDX-License-Identifier: MIT
//
// Bot config loader. The bot token is the only secret (security-controls.md): it is sourced from an
// environment variable ONLY (`DISCORD_TOKEN_<SLUG_UPPER>`) and is NEVER logged, echoed, or embedded
// in source/tests/error messages. This module is the single secret source for a bot process
// (ADR-0003: one process per bot, holding only its own token).

import type { GatewayIntentBits } from 'discord.js';

/** Static, non-secret configuration for a bot. Safe to commit per-bot. */
export interface BotStaticConfig {
  slug: string;
  guildId: string;
  channelName: string;
  roleName: string;
  intents: GatewayIntentBits[];
}

/** Full runtime config: static fields plus the env-sourced token. */
export interface BotConfig extends BotStaticConfig {
  token: string;
}

/** Derive the env var name holding a bot's token, e.g. `dungeon-herald` -> `DISCORD_TOKEN_DUNGEON_HERALD`. */
export function tokenEnvVar(slug: string): string {
  return `DISCORD_TOKEN_${slug.toUpperCase().replace(/-/g, '_')}`;
}

/**
 * Load a bot's full config by merging static config with its env-sourced token.
 *
 * @param staticConfig Non-secret per-bot config.
 * @param env          Environment source (defaults to `process.env`). Tests inject a fake env.
 * @throws Error naming the expected env var when the token is missing or empty. The error NEVER
 *         includes any token value.
 */
export function loadBotConfig(
  staticConfig: BotStaticConfig,
  env: NodeJS.ProcessEnv = process.env,
): BotConfig {
  const envVar = tokenEnvVar(staticConfig.slug);
  const token = env[envVar];

  if (token === undefined || token.trim() === '') {
    throw new Error(
      `Missing bot token: set the ${envVar} environment variable for bot "${staticConfig.slug}".`,
    );
  }

  return { ...staticConfig, token };
}
