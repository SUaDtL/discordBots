// SPDX-License-Identifier: MIT
//
// ensureManagedRoles (AC-01, AC-02 — SAFETY CRITICAL). On startup (and on demand) it makes sure each
// of the 12 managed roles exists, with the correct props, positioned below the bot's own highest
// role. An existing role with a managed NAME is adopted (never duplicated).
//
// SAFETY BOUNDARY (AC-02): this function iterates over the 12-role CATALOG, not over the guild's
// roles. It only ever calls createRole for a catalog entry that is absent by name. It NEVER edits,
// deletes, or reorders any existing role — managed or not — and so cannot touch Admin/Mod/Member or
// any other non-managed role. The guild's existing roles are read solely to decide "create vs adopt".
//
// discord.js is kept out of this module: it operates on a narrow `EnsureRolesGuild` interface so it
// is unit-tested with plain mocks (no live connection). index.ts adapts the real discord.js Guild to
// this interface.

import { MANAGED_ROLES } from './roles.js';

/** A minimal read-only view of an existing guild role (no member data). */
export interface ExistingRoleView {
  id: string;
  name: string;
  position: number;
}

/** Options passed to create a single managed role. `permissions: []` means no permissions. */
export interface CreateRoleOptions {
  name: string;
  /** RGB color for color roles; omitted for ping roles. */
  color?: number;
  /** Always `[]` for managed roles — they hold no permissions. */
  permissions: [];
  hoist: boolean;
  mentionable: boolean;
  /** Target position: strictly below the bot's own highest role so the bot can manage it. */
  position?: number;
  reason?: string;
}

/** Narrow guild abstraction so ensureManagedRoles is testable without discord.js. */
export interface EnsureRolesGuild {
  /** All existing roles in the guild (read-only). */
  listRoles(): ExistingRoleView[];
  /** The position of the bot's own highest role; created roles go strictly below this. */
  botHighestRolePosition(): number;
  /** Create exactly one role. Implementations MUST only ever be called for managed catalog roles. */
  createRole(options: CreateRoleOptions): Promise<ExistingRoleView>;
}

/** Summary of what ensureManagedRoles did, for non-PII logging. */
export interface EnsureRolesResult {
  /** Names of managed roles that were created because they were absent. */
  created: string[];
  /** Names of managed roles that already existed and were adopted (not duplicated). */
  adopted: string[];
}

/**
 * Ensure all 12 managed roles exist with the correct props, below the bot's highest role. Adopts
 * existing roles by name; creates only the missing ones. Touches NOTHING outside the 12 (AC-02).
 */
export async function ensureManagedRoles(guild: EnsureRolesGuild): Promise<EnsureRolesResult> {
  const existingByName = new Map(guild.listRoles().map((r) => [r.name, r]));
  // One slot below the bot's own highest role keeps every managed role manageable by the bot.
  const targetPosition = Math.max(1, guild.botHighestRolePosition() - 1);

  const created: string[] = [];
  const adopted: string[] = [];

  // Iterate the CATALOG, never the guild's roles — the structural guarantee of the only-12 boundary.
  for (const role of MANAGED_ROLES) {
    if (existingByName.has(role.name)) {
      adopted.push(role.name);
      continue;
    }

    const options: CreateRoleOptions = {
      name: role.name,
      permissions: [],
      hoist: false,
      mentionable: role.mentionable,
      position: targetPosition,
      reason: 'arbiter-self-assign: ensure managed self-serve role',
    };
    if (role.color !== undefined) {
      options.color = role.color;
    }

    await guild.createRole(options);
    created.push(role.name);
  }

  return { created, adopted };
}
