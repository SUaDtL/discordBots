// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import { handleColorSelect } from './color.js';
import type { ColorSelectInteraction, MemberRoleEditor } from './color.js';

/**
 * A mock member-role editor backed by a Set of role names. Records add/remove so tests assert the
 * exact ops and prove non-managed roles are never touched.
 */
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

function mockInteraction(values: string[]) {
  const replies: Array<{ content: string; ephemeral: boolean }> = [];
  const interaction: ColorSelectInteraction = {
    values,
    reply: vi.fn(async (opts: { content: string; ephemeral: boolean }) => {
      replies.push(opts);
    }),
  };
  return { interaction, replies };
}

describe('handleColorSelect (AC-04, AC-06, AC-02)', () => {
  it('assigns the chosen color role to a member who had none', async () => {
    const { editor, added } = mockEditor(['Member', 'Admin']);
    const { interaction, replies } = mockInteraction(['color-blue']);

    await handleColorSelect(interaction, editor);

    expect(added).toEqual(['Blue']);
    expect(replies[0]?.ephemeral).toBe(true); // AC-06
    expect(replies[0]?.content).toContain('Blue');
  });

  it('removes any OTHER managed color the member already holds (single color, AC-04)', async () => {
    const { editor, added, removed } = mockEditor(['Red', 'Member']);
    const { interaction } = mockInteraction(['color-green']);

    await handleColorSelect(interaction, editor);

    expect(added).toEqual(['Green']);
    expect(removed).toEqual(['Red']); // old managed color removed
  });

  it('NEVER removes non-color or non-managed roles when switching colors (AC-02)', async () => {
    const { editor, removed } = mockEditor([
      'Red',
      'Admin',
      'Mod',
      'Member',
      'Helldivers',
      'random',
    ]);
    const { interaction } = mockInteraction(['color-cyan']);

    await handleColorSelect(interaction, editor);

    // Only the previously-held managed color (Red) is removed; the ping role and tier roles survive.
    expect(removed).toEqual(['Red']);
    expect(editor.hasRole('Admin')).toBe(true);
    expect(editor.hasRole('Mod')).toBe(true);
    expect(editor.hasRole('Member')).toBe(true);
    expect(editor.hasRole('Helldivers')).toBe(true);
    expect(editor.hasRole('random')).toBe(true);
  });

  it('clearing the select (no value) removes the member’s current managed color and adds none', async () => {
    const { editor, added, removed } = mockEditor(['Pink', 'Member']);
    const { interaction, replies } = mockInteraction([]);

    await handleColorSelect(interaction, editor);

    expect(added).toEqual([]);
    expect(removed).toEqual(['Pink']);
    expect(replies[0]?.ephemeral).toBe(true);
  });

  it('is a near no-op when the chosen color is already the member’s only color', async () => {
    const { editor, added, removed } = mockEditor(['Blue', 'Member']);
    const { interaction, replies } = mockInteraction(['color-blue']);

    await handleColorSelect(interaction, editor);

    expect(added).toEqual([]); // already has Blue
    expect(removed).toEqual([]); // no other managed color to remove
    expect(replies[0]?.content).toContain('Blue');
  });

  it('rejects an unknown color key without touching any role (defensive, AC-02)', async () => {
    const { editor, added, removed } = mockEditor(['Member']);
    const { interaction, replies } = mockInteraction(['not-a-color']);

    await handleColorSelect(interaction, editor);

    expect(added).toEqual([]);
    expect(removed).toEqual([]);
    expect(replies[0]?.ephemeral).toBe(true);
  });
});
