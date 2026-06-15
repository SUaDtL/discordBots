// SPDX-License-Identifier: MIT
//
// Defense-in-depth test for the only-12 boundary (AC-02): the GuildMember role-editor adapter must
// refuse to add/remove any role that is not a managed role, regardless of caller — so a future
// mis-wired caller cannot mutate a tier role (Admin/Mod/etc.) through this layer.

import { describe, it, expect, vi } from 'vitest';
import type { GuildMember } from 'discord.js';
import { asMemberRoleEditor } from './index.js';

interface FakeRole {
  id: string;
  name: string;
}

function fakeMember(guildRoles: FakeRole[], memberRoles: FakeRole[]) {
  const add = vi.fn(async (_id: string) => {});
  const remove = vi.fn(async (_id: string) => {});
  const member = {
    guild: {
      roles: { cache: { find: (p: (r: FakeRole) => boolean) => guildRoles.find(p) } },
    },
    roles: {
      cache: {
        some: (p: (r: FakeRole) => boolean) => memberRoles.some(p),
        map: <T>(p: (r: FakeRole) => T) => memberRoles.map(p),
      },
      add,
      remove,
    },
  } as unknown as GuildMember;
  return { member, add, remove };
}

describe('asMemberRoleEditor — only-12 guard (AC-02 defense-in-depth)', () => {
  it('refuses to add a non-managed role even if it exists in the guild', async () => {
    const { member, add } = fakeMember([{ id: 'a', name: 'Admin' }], []);
    await asMemberRoleEditor(member).addRole('Admin');
    expect(add).not.toHaveBeenCalled();
  });

  it('refuses to remove a non-managed role the member holds', async () => {
    const { member, remove } = fakeMember(
      [{ id: 'a', name: 'Admin' }],
      [{ id: 'a', name: 'Admin' }],
    );
    await asMemberRoleEditor(member).removeRole('Admin');
    expect(remove).not.toHaveBeenCalled();
  });

  it('still adds a managed role (Blue) by id', async () => {
    const { member, add } = fakeMember([{ id: 'b', name: 'Blue' }], []);
    await asMemberRoleEditor(member).addRole('Blue');
    expect(add).toHaveBeenCalledWith('b');
  });
});
