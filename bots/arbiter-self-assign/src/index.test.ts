// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { GatewayIntentBits } from 'discord.js';
import { createClient, commandBodies } from './index.js';

describe('createClient (no login / no network) (AC-09)', () => {
  it('builds a client with EXACTLY the least-privilege intents [Guilds, GuildMembers]', () => {
    const client = createClient();
    const bits = Number(client.options.intents.bitfield);
    const expected = Number(GatewayIntentBits.Guilds) | Number(GatewayIntentBits.GuildMembers);
    expect(bits).toBe(expected);
  });

  it('does NOT enable MessageContent, presences, or message intents (AC-09)', () => {
    const client = createClient();
    const bits = Number(client.options.intents.bitfield);
    for (const forbidden of [
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ]) {
      expect(bits & Number(forbidden)).toBe(0);
    }
  });
});

describe('commandBodies (AC-07)', () => {
  it('exposes exactly the /post-role-menu JSON body for registration', () => {
    const names = commandBodies.map((c) => c.name);
    expect(names).toEqual(['post-role-menu']);
  });

  it('the command is admin-gated (default_member_permissions set)', () => {
    expect(commandBodies[0]?.default_member_permissions).toBeTruthy();
  });
});
