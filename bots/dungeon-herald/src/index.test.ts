// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { GatewayIntentBits } from 'discord.js';
import { createClient, commandBodies } from './index.js';

describe('createClient (no login / no network)', () => {
  it('builds a client with EXACTLY the least-privilege intents (AC-15)', () => {
    const client = createClient();
    // discord.js stores the resolved intents bitfield on client.options.intents.
    const bits = Number(client.options.intents.bitfield);
    const expected =
      Number(GatewayIntentBits.Guilds) | Number(GatewayIntentBits.GuildScheduledEvents);
    expect(bits).toBe(expected);
  });

  it('does NOT enable any privileged intent (AC-15)', () => {
    const client = createClient();
    const bits = Number(client.options.intents.bitfield);
    for (const privileged of [
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
    ]) {
      expect(bits & Number(privileged)).toBe(0);
    }
  });
});

describe('commandBodies', () => {
  it('exposes exactly the /roll and /nextsession JSON bodies for registration (AC-14)', () => {
    const names = commandBodies.map((c) => c.name).sort();
    expect(names).toEqual(['nextsession', 'roll']);
  });
});
