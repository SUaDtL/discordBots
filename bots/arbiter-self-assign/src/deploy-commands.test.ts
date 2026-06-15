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

describe('deployCommands (AC-07)', () => {
  it('registers /post-role-menu when none exist, after a list check', async () => {
    const { rest, get, put } = mockRest([]);
    const result = await deployCommands({ rest, applicationId: APP_ID, guildId: GUILD_ID });
    expect(result.registered).toEqual(['post-role-menu']);
    expect(result.skipped).toEqual([]);
    expect(get).toHaveBeenCalledWith(Routes.applicationGuildCommands(APP_ID, GUILD_ID));
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: skips an already-registered command', async () => {
    const { rest, put } = mockRest([{ name: 'post-role-menu' }]);
    const result = await deployCommands({ rest, applicationId: APP_ID, guildId: GUILD_ID });
    expect(result.registered).toEqual([]);
    expect(result.skipped).toEqual(['post-role-menu']);
    expect(put).not.toHaveBeenCalled();
  });
});
