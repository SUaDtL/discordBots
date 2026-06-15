// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { GatewayIntentBits } from 'discord.js';
import {
  DUNGEON_HERALD_INTENTS,
  dungeonHeraldStaticConfig,
  loadDungeonHeraldConfig,
  REMINDER_LEAD_MS,
} from './config.js';

describe('dungeon-herald config', () => {
  it('targets the chartered guild, channel, and role', () => {
    expect(dungeonHeraldStaticConfig.slug).toBe('dungeon-herald');
    expect(dungeonHeraldStaticConfig.guildId).toBe('1119021914086703194');
    expect(dungeonHeraldStaticConfig.channelName).toBe('table-talk');
    expect(dungeonHeraldStaticConfig.roleName).toBe('Players');
  });

  it('requests EXACTLY the least-privilege intents [Guilds, GuildScheduledEvents] (AC-15)', () => {
    expect([...DUNGEON_HERALD_INTENTS]).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildScheduledEvents,
    ]);
    expect(dungeonHeraldStaticConfig.intents).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildScheduledEvents,
    ]);
  });

  it('requests NO privileged or management intents (AC-15)', () => {
    const privileged = [
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
    ];
    for (const intent of privileged) {
      expect(dungeonHeraldStaticConfig.intents).not.toContain(intent);
    }
  });

  it('uses a 30-minute reminder lead', () => {
    expect(REMINDER_LEAD_MS).toBe(30 * 60 * 1000);
  });

  it('loads the token from DISCORD_TOKEN_DUNGEON_HERALD (env only)', () => {
    const cfg = loadDungeonHeraldConfig({ DISCORD_TOKEN_DUNGEON_HERALD: 'test-token' });
    expect(cfg.token).toBe('test-token');
    expect(cfg.guildId).toBe('1119021914086703194');
  });

  it('throws a clear error naming the env var when the token is missing', () => {
    expect(() => loadDungeonHeraldConfig({})).toThrow(/DISCORD_TOKEN_DUNGEON_HERALD/);
  });
});
