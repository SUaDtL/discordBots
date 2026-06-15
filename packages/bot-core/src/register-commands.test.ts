// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import { Routes } from 'discord.js';
import type { REST } from 'discord.js';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { registerGuildCommands } from './register-commands.js';

const APP_ID = '111111111111111111';
const GUILD_ID = '222222222222222222';

function cmd(name: string): RESTPostAPIApplicationCommandsJSONBody {
  return { name, description: `the ${name} command` };
}

/** Build a mock REST that returns the given existing commands on GET and records PUTs. */
function mockRest(existing: Array<{ name: string }>) {
  const put = vi.fn().mockResolvedValue([]);
  const get = vi.fn().mockResolvedValue(existing);
  const rest = { get, put } as unknown as REST;
  return { rest, get, put };
}

describe('registerGuildCommands', () => {
  it('registers a command that is not already present', async () => {
    const { rest, get, put } = mockRest([]);
    const result = await registerGuildCommands({
      rest,
      applicationId: APP_ID,
      guildId: GUILD_ID,
      commands: [cmd('roll')],
    });
    expect(result.registered).toContain('roll');
    expect(result.skipped).toEqual([]);
    // It must check existing commands first (list_commands equivalent).
    expect(get).toHaveBeenCalledWith(Routes.applicationGuildCommands(APP_ID, GUILD_ID));
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('skips a command that is already present (idempotent, no duplicate)', async () => {
    const { rest, put } = mockRest([{ name: 'roll' }]);
    const result = await registerGuildCommands({
      rest,
      applicationId: APP_ID,
      guildId: GUILD_ID,
      commands: [cmd('roll')],
    });
    expect(result.skipped).toContain('roll');
    expect(result.registered).toEqual([]);
    expect(put).not.toHaveBeenCalled();
  });

  it('registers only the missing commands in a mixed set', async () => {
    const { rest, put } = mockRest([{ name: 'roll' }]);
    const result = await registerGuildCommands({
      rest,
      applicationId: APP_ID,
      guildId: GUILD_ID,
      commands: [cmd('roll'), cmd('nextsession')],
    });
    expect(result.skipped).toEqual(['roll']);
    expect(result.registered).toEqual(['nextsession']);
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('does nothing (no PUT) when all commands already exist', async () => {
    const { rest, put } = mockRest([{ name: 'roll' }, { name: 'nextsession' }]);
    const result = await registerGuildCommands({
      rest,
      applicationId: APP_ID,
      guildId: GUILD_ID,
      commands: [cmd('roll'), cmd('nextsession')],
    });
    expect(result.registered).toEqual([]);
    expect(result.skipped).toEqual(['roll', 'nextsession']);
    expect(put).not.toHaveBeenCalled();
  });
});
