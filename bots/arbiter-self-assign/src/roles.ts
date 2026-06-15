// SPDX-License-Identifier: MIT
//
// Single source of truth for the 12 managed roles (AC-01, AC-02). This bot may create, edit, adopt,
// and assign ONLY the roles in this catalog — matched BY NAME. Every other role in the guild
// (Admin/Mod/Member/Founding Four/anything) is out of bounds and must never be touched. The guards
// below (`isManagedRole` and friends) are the enforcement boundary every mutating code path consults.
//
// 7 cosmetic color roles (no permissions, not hoisted, not mentionable) + 4 game-ping roles + 1
// GameNight role (all mentionable, no color, no permissions). The 3 placeholder ping roles are
// config-driven and flagged for the operator to rename before live deploy ([CONFIRM-03]).

/** A managed role is either a cosmetic color or a mentionable ping/GameNight role. */
export type ManagedRoleKind = 'color' | 'ping';

/** One entry in the managed-role catalog. The single source of truth for name/props/custom-id key. */
export interface ManagedRole {
  /** Exact Discord role name. Roles are matched/adopted by this name (AC-01). */
  readonly name: string;
  /** Cosmetic color vs. mentionable ping. */
  readonly kind: ManagedRoleKind;
  /** Stable, id-safe key used inside namespaced component custom IDs (`selfassign:ping:<key>`). */
  readonly key: string;
  /** RGB color for color roles; undefined for ping roles (no color). */
  readonly color?: number;
  /** Whether the role is mentionable: true for pings, false for cosmetic colors. */
  readonly mentionable: boolean;
  /**
   * True for the 3 placeholder game-ping roles the operator renames before live deploy ([CONFIRM-03]).
   * Helldivers and GameNight are fixed and never placeholders.
   */
  readonly placeholder?: boolean;
}

/**
 * The 7 cosmetic color roles. Palette hex from the spec. Color roles carry NO permissions, are NOT
 * hoisted, and are NOT mentionable — purely cosmetic.
 */
export const COLOR_ROLES: readonly ManagedRole[] = [
  { name: 'Red', kind: 'color', key: 'color-red', color: 0xe74c3c, mentionable: false },
  { name: 'Orange', kind: 'color', key: 'color-orange', color: 0xe67e22, mentionable: false },
  { name: 'Yellow', kind: 'color', key: 'color-yellow', color: 0xf1c40f, mentionable: false },
  { name: 'Green', kind: 'color', key: 'color-green', color: 0x2ecc71, mentionable: false },
  { name: 'Cyan', kind: 'color', key: 'color-cyan', color: 0x1abc9c, mentionable: false },
  { name: 'Blue', kind: 'color', key: 'color-blue', color: 0x3498db, mentionable: false },
  { name: 'Pink', kind: 'color', key: 'color-pink', color: 0xe84393, mentionable: false },
];

/**
 * The game-ping + GameNight roles: mentionable, no color, no permissions.
 *
 * Helldivers and GameNight are fixed. The 3 placeholders below are config defaults — the operator
 * MUST rename them (and their `key` is fine to keep stable) before the live deploy.
 *
 * TODO [CONFIRM-03]: operator renames the 3 placeholder ping roles ('Game Slot 2/3/4') before live deploy.
 */
export const PING_ROLES: readonly ManagedRole[] = [
  { name: 'Helldivers', kind: 'ping', key: 'ping-helldivers', mentionable: true },
  { name: 'Game Slot 2', kind: 'ping', key: 'ping-slot-2', mentionable: true, placeholder: true },
  { name: 'Game Slot 3', kind: 'ping', key: 'ping-slot-3', mentionable: true, placeholder: true },
  { name: 'Game Slot 4', kind: 'ping', key: 'ping-slot-4', mentionable: true, placeholder: true },
  { name: 'GameNight', kind: 'ping', key: 'ping-gamenight', mentionable: true },
];

/** The full 12-role catalog: colors first, then pings/GameNight. The ONLY roles this bot governs. */
export const MANAGED_ROLES: readonly ManagedRole[] = [...COLOR_ROLES, ...PING_ROLES];

/** The exact set of managed role NAMES — the membership test for the only-12 boundary (AC-02). */
export const MANAGED_ROLE_NAMES: ReadonlySet<string> = new Set(MANAGED_ROLES.map((r) => r.name));

const COLOR_ROLE_NAMES: ReadonlySet<string> = new Set(COLOR_ROLES.map((r) => r.name));
const PING_ROLE_NAMES: ReadonlySet<string> = new Set(PING_ROLES.map((r) => r.name));
const ROLES_BY_KEY: ReadonlyMap<string, ManagedRole> = new Map(
  MANAGED_ROLES.map((r) => [r.key, r]),
);

/** True iff `name` is one of the 12 managed role names. The gate for any create/edit/assign op. */
export function isManagedRole(name: string): boolean {
  return MANAGED_ROLE_NAMES.has(name);
}

/** True iff `name` is one of the 7 managed cosmetic color roles. */
export function isManagedColorRole(name: string): boolean {
  return COLOR_ROLE_NAMES.has(name);
}

/** True iff `name` is one of the 5 managed ping/GameNight roles. */
export function isManagedPingRole(name: string): boolean {
  return PING_ROLE_NAMES.has(name);
}

/** Resolve a managed role by its stable custom-id key, or undefined if unknown. */
export function roleByKey(key: string): ManagedRole | undefined {
  return ROLES_BY_KEY.get(key);
}
