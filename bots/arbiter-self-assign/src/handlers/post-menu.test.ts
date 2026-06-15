// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import {
  handlePostMenu,
  postRoleMenuCommand,
  type PostMenuInteraction,
  type MenuPoster,
  type MenuLocationStore,
  type PersistedMenuLocation,
} from './post-menu.js';

function mockInteraction(opts: { hasManageRoles: boolean; guildId: string | null }): {
  interaction: PostMenuInteraction;
  replies: Array<{ content: string; ephemeral: boolean }>;
} {
  const replies: Array<{ content: string; ephemeral: boolean }> = [];
  const interaction: PostMenuInteraction = {
    guildId: opts.guildId,
    memberHasManageRoles: () => opts.hasManageRoles,
    reply: vi.fn(async (o: { content: string; ephemeral: boolean }) => {
      replies.push(o);
    }),
  };
  return { interaction, replies };
}

function mockStore() {
  let saved: PersistedMenuLocation | undefined;
  const store: MenuLocationStore = {
    write: vi.fn(async (v: PersistedMenuLocation) => {
      saved = v;
    }),
  };
  return { store, getSaved: () => saved };
}

const CHANNEL_ID = '1515850507103633641';

describe('postRoleMenuCommand (AC-07)', () => {
  it('is named post-role-menu and gates on Manage Roles at the command level', () => {
    const json = postRoleMenuCommand.toJSON();
    expect(json.name).toBe('post-role-menu');
    // default_member_permissions is the ManageRoles bit as a string; non-null = admin-gated.
    expect(json.default_member_permissions).not.toBeNull();
    expect(json.default_member_permissions).toBeDefined();
  });
});

describe('handlePostMenu (AC-07, AC-08)', () => {
  it('an admin (Manage Roles) posts the menu and persists {guildId, channelId, messageId}', async () => {
    const { interaction, replies } = mockInteraction({ hasManageRoles: true, guildId: 'g1' });
    const { store, getSaved } = mockStore();
    const poster: MenuPoster = vi.fn(async () => 'msg-123');

    await handlePostMenu(interaction, { poster, store, channelId: CHANNEL_ID });

    expect(poster).toHaveBeenCalledOnce();
    const saved = getSaved();
    expect(saved).toEqual({ guildId: 'g1', channelId: CHANNEL_ID, messageId: 'msg-123' });
    expect(replies[0]?.ephemeral).toBe(true);
  });

  it('persists ONLY the three ids — no member PII (AC-10)', async () => {
    const { interaction } = mockInteraction({ hasManageRoles: true, guildId: 'g1' });
    const { store, getSaved } = mockStore();
    const poster: MenuPoster = vi.fn(async () => 'msg-9');

    await handlePostMenu(interaction, { poster, store, channelId: CHANNEL_ID });

    expect(Object.keys(getSaved() ?? {}).sort()).toEqual(['channelId', 'guildId', 'messageId']);
  });

  it('a non-admin is rejected ephemerally and nothing is posted or persisted (AC-07)', async () => {
    const { interaction, replies } = mockInteraction({ hasManageRoles: false, guildId: 'g1' });
    const { store, getSaved } = mockStore();
    const poster: MenuPoster = vi.fn(async () => 'msg-x');

    await handlePostMenu(interaction, { poster, store, channelId: CHANNEL_ID });

    expect(poster).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
    expect(getSaved()).toBeUndefined();
    expect(replies[0]?.ephemeral).toBe(true);
    expect(replies[0]?.content.toLowerCase()).toContain('manage roles');
  });

  it('rejects use outside a guild (defensive)', async () => {
    const { interaction, replies } = mockInteraction({ hasManageRoles: true, guildId: null });
    const { store } = mockStore();
    const poster: MenuPoster = vi.fn(async () => 'msg-x');

    await handlePostMenu(interaction, { poster, store, channelId: CHANNEL_ID });

    expect(poster).not.toHaveBeenCalled();
    expect(store.write).not.toHaveBeenCalled();
    expect(replies[0]?.ephemeral).toBe(true);
  });
});
