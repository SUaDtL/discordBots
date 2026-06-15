// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import { ensureManagedRoles } from './ensure-roles.js';
import type { EnsureRolesGuild, CreateRoleOptions, ExistingRoleView } from './ensure-roles.js';
import { MANAGED_ROLES, COLOR_ROLES, PING_ROLES, MANAGED_ROLE_NAMES } from './roles.js';

/**
 * Build a mock guild whose role set includes the given existing roles plus the bot's own role at a
 * high position. Records every create call and lets us assert nothing touches non-managed roles.
 */
function mockGuild(existing: ExistingRoleView[], botHighestPosition = 100) {
  const created: CreateRoleOptions[] = [];
  const createRole = vi.fn(async (opts: CreateRoleOptions): Promise<ExistingRoleView> => {
    created.push(opts);
    return { id: `new-${opts.name}`, name: opts.name, position: opts.position ?? 1 };
  });
  const guild: EnsureRolesGuild = {
    listRoles: () => existing,
    botHighestRolePosition: () => botHighestPosition,
    createRole,
  };
  return { guild, created, createRole };
}

const NON_MANAGED: ExistingRoleView[] = [
  { id: 'a', name: 'Admin', position: 90 },
  { id: 'm', name: 'Mod', position: 80 },
  { id: 'mem', name: 'Member', position: 10 },
  { id: 'ff', name: 'Founding Four', position: 95 },
  { id: 'rnd', name: 'random', position: 5 },
];

describe('ensureManagedRoles (AC-01, AC-02 — SAFETY CRITICAL)', () => {
  it('creates all 12 managed roles when none exist', async () => {
    const { guild, created } = mockGuild([...NON_MANAGED]);
    const result = await ensureManagedRoles(guild);

    expect(created).toHaveLength(12);
    expect(created.map((c) => c.name).sort()).toEqual([...MANAGED_ROLE_NAMES].sort());
    expect(result.created.sort()).toEqual([...MANAGED_ROLE_NAMES].sort());
    expect(result.adopted).toEqual([]);
  });

  it('NEVER creates, edits, or deletes a non-managed role — only the 12 (AC-02)', async () => {
    const { guild, created, createRole } = mockGuild([...NON_MANAGED]);
    await ensureManagedRoles(guild);

    // Every created role name MUST be in the managed set; nothing else.
    for (const opts of created) {
      expect(MANAGED_ROLE_NAMES.has(opts.name)).toBe(true);
    }
    // Not one create call carries a non-managed name.
    for (const nonManaged of NON_MANAGED) {
      expect(createRole).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: nonManaged.name }),
      );
    }
  });

  it('creates color roles with the palette hex, no permissions, not hoisted, not mentionable (AC-01)', async () => {
    const { guild, created } = mockGuild([...NON_MANAGED]);
    await ensureManagedRoles(guild);

    for (const colorRole of COLOR_ROLES) {
      const opts = created.find((c) => c.name === colorRole.name);
      expect(opts, `created ${colorRole.name}`).toBeDefined();
      expect(opts?.color).toBe(colorRole.color);
      expect(opts?.permissions).toEqual([]);
      expect(opts?.hoist).toBe(false);
      expect(opts?.mentionable).toBe(false);
    }
  });

  it('creates ping/GameNight roles as mentionable, no color, no permissions (AC-01)', async () => {
    const { guild, created } = mockGuild([...NON_MANAGED]);
    await ensureManagedRoles(guild);

    for (const pingRole of PING_ROLES) {
      const opts = created.find((c) => c.name === pingRole.name);
      expect(opts, `created ${pingRole.name}`).toBeDefined();
      expect(opts?.color).toBeUndefined();
      expect(opts?.permissions).toEqual([]);
      expect(opts?.hoist).toBe(false);
      expect(opts?.mentionable).toBe(true);
    }
  });

  it('positions every created role BELOW the bot’s own highest role (AC-01)', async () => {
    const botPos = 100;
    const { guild, created } = mockGuild([...NON_MANAGED], botPos);
    await ensureManagedRoles(guild);

    for (const opts of created) {
      expect(opts.position).toBeDefined();
      expect(opts.position!).toBeLessThan(botPos);
    }
  });

  it('adopts an existing role with a managed name instead of duplicating it (AC-01)', async () => {
    const existingBlue: ExistingRoleView = { id: 'blue-1', name: 'Blue', position: 7 };
    const { guild, created, createRole } = mockGuild([...NON_MANAGED, existingBlue]);
    const result = await ensureManagedRoles(guild);

    // Blue already exists → adopted, not created.
    expect(createRole).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'Blue' }));
    expect(created.map((c) => c.name)).not.toContain('Blue');
    expect(result.adopted).toContain('Blue');
    expect(result.created).not.toContain('Blue');
    // The other 11 are created.
    expect(created).toHaveLength(11);
  });

  it('is a no-op (creates nothing) when all 12 managed roles already exist', async () => {
    const allManaged: ExistingRoleView[] = MANAGED_ROLES.map((r, i) => ({
      id: `id-${i}`,
      name: r.name,
      position: i + 1,
    }));
    const { guild, created } = mockGuild([...NON_MANAGED, ...allManaged]);
    const result = await ensureManagedRoles(guild);

    expect(created).toHaveLength(0);
    expect(result.created).toEqual([]);
    expect(result.adopted.sort()).toEqual([...MANAGED_ROLE_NAMES].sort());
  });
});
