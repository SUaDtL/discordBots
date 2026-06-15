// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import {
  MANAGED_ROLES,
  MANAGED_ROLE_NAMES,
  COLOR_ROLES,
  PING_ROLES,
  isManagedRole,
  isManagedColorRole,
  isManagedPingRole,
  roleByKey,
} from './roles.js';

describe('managed role catalog (AC-01, AC-02)', () => {
  it('contains EXACTLY 12 roles', () => {
    expect(MANAGED_ROLES).toHaveLength(12);
    expect(MANAGED_ROLE_NAMES.size).toBe(12);
  });

  it('lists the 7 cosmetic color roles with the palette hex, no perms, not hoisted, not mentionable', () => {
    const expected: Array<{ name: string; color: number }> = [
      { name: 'Red', color: 0xe74c3c },
      { name: 'Orange', color: 0xe67e22 },
      { name: 'Yellow', color: 0xf1c40f },
      { name: 'Green', color: 0x2ecc71 },
      { name: 'Cyan', color: 0x1abc9c },
      { name: 'Blue', color: 0x3498db },
      { name: 'Pink', color: 0xe84393 },
    ];
    expect(COLOR_ROLES).toHaveLength(7);
    for (const { name, color } of expected) {
      const role = COLOR_ROLES.find((r) => r.name === name);
      expect(role, `color role ${name} present`).toBeDefined();
      expect(role?.kind).toBe('color');
      expect(role?.color).toBe(color);
      expect(role?.mentionable).toBe(false);
    }
  });

  it('lists the 5 ping/GameNight roles: mentionable, no color, no perms', () => {
    const names = PING_ROLES.map((r) => r.name);
    expect(names).toContain('Helldivers');
    expect(names).toContain('GameNight');
    expect(PING_ROLES).toHaveLength(5);
    for (const role of PING_ROLES) {
      expect(role.kind).toBe('ping');
      expect(role.mentionable).toBe(true);
      expect(role.color).toBeUndefined();
    }
  });

  it('flags exactly the 3 placeholder game-ping roles for operator rename ([CONFIRM-03])', () => {
    const placeholders = MANAGED_ROLES.filter((r) => r.placeholder === true);
    expect(placeholders).toHaveLength(3);
    for (const p of placeholders) {
      expect(p.kind).toBe('ping');
    }
    // Helldivers and GameNight are fixed, never placeholders.
    expect(placeholders.map((p) => p.name)).not.toContain('Helldivers');
    expect(placeholders.map((p) => p.name)).not.toContain('GameNight');
  });

  it('every role has a stable, unique, namespaced-safe key', () => {
    const keys = MANAGED_ROLES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      // Keys are used inside `selfassign:ping:<key>` custom IDs — keep them id-safe.
      expect(key).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('MANAGED_ROLE_NAMES holds exactly the catalog names', () => {
    expect([...MANAGED_ROLE_NAMES].sort()).toEqual(MANAGED_ROLES.map((r) => r.name).sort());
  });
});

describe('role guards (AC-02 — only the 12, ever)', () => {
  it('isManagedRole is true for every managed name', () => {
    for (const role of MANAGED_ROLES) {
      expect(isManagedRole(role.name)).toBe(true);
    }
  });

  it('isManagedRole is FALSE for non-managed roles (tier/other roles never touched)', () => {
    for (const name of ['Admin', 'Mod', 'Member', 'Founding Four', 'random', '', 'red', 'BLUE']) {
      expect(isManagedRole(name)).toBe(false);
    }
  });

  it('isManagedColorRole distinguishes color roles from ping roles', () => {
    expect(isManagedColorRole('Blue')).toBe(true);
    expect(isManagedColorRole('Helldivers')).toBe(false);
    expect(isManagedColorRole('Admin')).toBe(false);
  });

  it('isManagedPingRole distinguishes ping roles from color roles', () => {
    expect(isManagedPingRole('Helldivers')).toBe(true);
    expect(isManagedPingRole('GameNight')).toBe(true);
    expect(isManagedPingRole('Blue')).toBe(false);
    expect(isManagedPingRole('Admin')).toBe(false);
  });

  it('roleByKey resolves a managed role by its stable key and is undefined otherwise', () => {
    const blue = COLOR_ROLES[0];
    expect(blue).toBeDefined();
    expect(roleByKey(blue!.key)?.name).toBe(blue!.name);
    expect(roleByKey('not-a-key')).toBeUndefined();
  });
});
