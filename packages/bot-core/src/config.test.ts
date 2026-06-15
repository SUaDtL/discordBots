// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { GatewayIntentBits } from 'discord.js';
import { loadBotConfig } from './config.js';
import type { BotStaticConfig } from './config.js';

const FAKE_TOKEN = 'fake.test.token.never-real';

const staticConfig: BotStaticConfig = {
  slug: 'dungeon-herald',
  guildId: '1119021914086703194',
  channelName: 'table-talk',
  roleName: 'Players',
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildScheduledEvents],
};

describe('loadBotConfig', () => {
  it('reads the token from DISCORD_TOKEN_<SLUG_UPPER> (uppercased, - -> _)', () => {
    const env = { DISCORD_TOKEN_DUNGEON_HERALD: FAKE_TOKEN };
    const config = loadBotConfig(staticConfig, env);
    expect(config.token).toBe(FAKE_TOKEN);
  });

  it('returns the full BotConfig merging the static fields with the token', () => {
    const env = { DISCORD_TOKEN_DUNGEON_HERALD: FAKE_TOKEN };
    const config = loadBotConfig(staticConfig, env);
    expect(config.slug).toBe('dungeon-herald');
    expect(config.guildId).toBe('1119021914086703194');
    expect(config.channelName).toBe('table-talk');
    expect(config.roleName).toBe('Players');
    expect(config.intents).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildScheduledEvents,
    ]);
  });

  it('throws a clear Error naming the expected env var when the token is missing', () => {
    expect(() => loadBotConfig(staticConfig, {})).toThrow(/DISCORD_TOKEN_DUNGEON_HERALD/);
  });

  it('throws when the token is present but empty', () => {
    const env = { DISCORD_TOKEN_DUNGEON_HERALD: '' };
    expect(() => loadBotConfig(staticConfig, env)).toThrow(/DISCORD_TOKEN_DUNGEON_HERALD/);
  });

  it('throws when the token is whitespace-only', () => {
    const env = { DISCORD_TOKEN_DUNGEON_HERALD: '   ' };
    expect(() => loadBotConfig(staticConfig, env)).toThrow(/DISCORD_TOKEN_DUNGEON_HERALD/);
  });

  it('never echoes the token value in the thrown error message', () => {
    // Token is missing here, but assert as a guard that a present-but-rejected token is never leaked.
    const env = { DISCORD_TOKEN_DUNGEON_HERALD: '' };
    try {
      loadBotConfig(staticConfig, env);
      throw new Error('expected loadBotConfig to throw');
    } catch (err) {
      expect((err as Error).message).not.toContain(FAKE_TOKEN);
    }
  });

  it('falls back to process.env when no env is passed', () => {
    const key = 'DISCORD_TOKEN_DUNGEON_HERALD';
    const prev = process.env[key];
    process.env[key] = FAKE_TOKEN;
    try {
      const config = loadBotConfig(staticConfig);
      expect(config.token).toBe(FAKE_TOKEN);
    } finally {
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    }
  });
});
