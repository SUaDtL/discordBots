// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { GatewayIntentBits } from 'discord.js';
import {
  ARBITER_SELF_ASSIGN_INTENTS,
  arbiterSelfAssignStaticConfig,
  loadArbiterSelfAssignConfig,
  TOKEN_ENV_VAR,
} from './config.js';

describe('arbiter-self-assign config (AC-09, AC-11)', () => {
  it('targets the arbiterGaming guild and #roles channel', () => {
    expect(arbiterSelfAssignStaticConfig.slug).toBe('arbiter-self-assign');
    expect(arbiterSelfAssignStaticConfig.guildId).toBe('1119021914086703194');
    expect(arbiterSelfAssignStaticConfig.rolesChannelId).toBe('1515850507103633641');
  });

  it('requests EXACTLY the least-privilege intents [Guilds, GuildMembers] (AC-09)', () => {
    expect([...ARBITER_SELF_ASSIGN_INTENTS]).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ]);
    expect(arbiterSelfAssignStaticConfig.intents).toEqual([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ]);
  });

  it('requests NO other intents — never MessageContent or presences (AC-09)', () => {
    const forbidden = [
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ];
    for (const intent of forbidden) {
      expect(arbiterSelfAssignStaticConfig.intents).not.toContain(intent);
    }
    // exactly two intents, no accidental extras
    expect(arbiterSelfAssignStaticConfig.intents).toHaveLength(2);
  });

  it('derives the token env var as DISCORD_TOKEN_ARBITER_SELF_ASSIGN (AC-11)', () => {
    expect(TOKEN_ENV_VAR).toBe('DISCORD_TOKEN_ARBITER_SELF_ASSIGN');
  });

  it('loads the token from DISCORD_TOKEN_ARBITER_SELF_ASSIGN (env only) (AC-11)', () => {
    const cfg = loadArbiterSelfAssignConfig({
      DISCORD_TOKEN_ARBITER_SELF_ASSIGN: 'secret-test-token',
    });
    expect(cfg.token).toBe('secret-test-token');
    expect(cfg.guildId).toBe('1119021914086703194');
    expect(cfg.rolesChannelId).toBe('1515850507103633641');
  });

  it('throws naming the env var (NOT the value) when the token is missing (AC-11)', () => {
    let message = '';
    try {
      loadArbiterSelfAssignConfig({});
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain('DISCORD_TOKEN_ARBITER_SELF_ASSIGN');
  });

  it('does not leak a provided token value into the error when it is empty/whitespace (AC-11)', () => {
    let message = '';
    try {
      loadArbiterSelfAssignConfig({ DISCORD_TOKEN_ARBITER_SELF_ASSIGN: '   ' });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain('DISCORD_TOKEN_ARBITER_SELF_ASSIGN');
  });
});
