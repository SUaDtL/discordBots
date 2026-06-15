// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import { Routes } from 'discord.js';
import type { REST } from 'discord.js';
import { deployCommands } from './deploy-commands.js';

const APP_ID = '111111111111111111';
const GUILD_ID = '1119021914086703194';

function mockRest(existing: Array<{ name: string }>) {
  const put = vi.fn().mockResolvedValue([]);
  const get = vi.fn().mockResolvedValue(existing);
  const rest = { get, put } as unknown as REST;
  return { rest, get, put };
}

describe('deployCommands', () => {
  it('registers /roll and /nextsession when none exist, after a list check (AC-14)', async () => {
    const { rest, get, put } = mockRest([]);
    const result = await deployCommands({ rest, applicationId: APP_ID, guildId: GUILD_ID });
    expect(result.registered.sort()).toEqual(['nextsession', 'roll']);
    expect(result.skipped).toEqual([]);
    expect(get).toHaveBeenCalledWith(Routes.applicationGuildCommands(APP_ID, GUILD_ID));
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: skips already-registered commands (AC-14)', async () => {
    const { rest, put } = mockRest([{ name: 'roll' }, { name: 'nextsession' }]);
    const result = await deployCommands({ rest, applicationId: APP_ID, guildId: GUILD_ID });
    expect(result.registered).toEqual([]);
    expect(result.skipped.sort()).toEqual(['nextsession', 'roll']);
    expect(put).not.toHaveBeenCalled();
  });
});
