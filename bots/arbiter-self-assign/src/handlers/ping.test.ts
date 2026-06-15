// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import { handlePingToggle } from './ping.js';
import type { PingButtonInteraction } from './ping.js';
import type { MemberRoleEditor } from './color.js';

function mockEditor(initial: string[]) {
  const roles = new Set(initial);
  const added: string[] = [];
  const removed: string[] = [];
  const editor: MemberRoleEditor = {
    hasRole: (name) => roles.has(name),
    currentRoleNames: () => [...roles],
    addRole: vi.fn(async (name: string) => {
      roles.add(name);
      added.push(name);
    }),
    removeRole: vi.fn(async (name: string) => {
      roles.delete(name);
      removed.push(name);
    }),
  };
  return { editor, roles, added, removed };
}

function mockInteraction(customId: string) {
  const replies: Array<{ content: string; ephemeral: boolean }> = [];
  const interaction: PingButtonInteraction = {
    customId,
    reply: vi.fn(async (opts: { content: string; ephemeral: boolean }) => {
      replies.push(opts);
    }),
  };
  return { interaction, replies };
}

describe('handlePingToggle (AC-05, AC-06, AC-02)', () => {
  it('adds a ping role the member lacks ("Added Helldivers"), ephemerally', async () => {
    const { editor, added, removed } = mockEditor(['Member']);
    const { interaction, replies } = mockInteraction('selfassign:ping:ping-helldivers');

    await handlePingToggle(interaction, editor);

    expect(added).toEqual(['Helldivers']);
    expect(removed).toEqual([]);
    expect(replies[0]?.ephemeral).toBe(true);
    expect(replies[0]?.content).toContain('Added');
    expect(replies[0]?.content).toContain('Helldivers');
  });

  it('removes a ping role the member holds ("Removed GameNight"), ephemerally', async () => {
    const { editor, added, removed } = mockEditor(['GameNight', 'Member']);
    const { interaction, replies } = mockInteraction('selfassign:ping:ping-gamenight');

    await handlePingToggle(interaction, editor);

    expect(removed).toEqual(['GameNight']);
    expect(added).toEqual([]);
    expect(replies[0]?.content).toContain('Removed');
    expect(replies[0]?.content).toContain('GameNight');
  });

  it('toggling a ping NEVER touches any other (managed or tier) role (AC-02)', async () => {
    const { editor, added, removed } = mockEditor(['Admin', 'Mod', 'Blue', 'Member']);
    const { interaction } = mockInteraction('selfassign:ping:ping-helldivers');

    await handlePingToggle(interaction, editor);

    expect(added).toEqual(['Helldivers']);
    expect(removed).toEqual([]);
    expect(editor.hasRole('Admin')).toBe(true);
    expect(editor.hasRole('Blue')).toBe(true);
  });

  it('rejects a color custom id without touching any role (defensive, AC-02)', async () => {
    const { editor, added, removed } = mockEditor(['Member']);
    const { interaction, replies } = mockInteraction('selfassign:color');

    await handlePingToggle(interaction, editor);

    expect(added).toEqual([]);
    expect(removed).toEqual([]);
    expect(replies[0]?.ephemeral).toBe(true);
  });

  it('rejects an unknown ping key without touching any role (defensive, AC-02)', async () => {
    const { editor, added, removed } = mockEditor(['Member']);
    const { interaction, replies } = mockInteraction('selfassign:ping:not-a-real-key');

    await handlePingToggle(interaction, editor);

    expect(added).toEqual([]);
    expect(removed).toEqual([]);
    expect(replies[0]?.ephemeral).toBe(true);
  });
});
