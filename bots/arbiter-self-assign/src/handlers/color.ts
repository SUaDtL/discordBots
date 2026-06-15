// SPDX-License-Identifier: MIT
//
// Color string-select handler (AC-04, AC-06, AC-02). Selecting a color assigns that color role and
// removes any OTHER managed color the member holds (single color at a time). Clearing the select
// removes the member's current managed color. The reply is always EPHEMERAL (AC-06).
//
// SAFETY (AC-02): removal is scoped to MANAGED COLOR roles only — it walks the member's current
// roles and removes the ones that are managed colors and not the chosen one. Tier roles, ping roles,
// and any other role are never added or removed here. The handler takes narrow interfaces so it is
// unit-tested without discord.js.

import { isManagedColorRole, roleByKey } from '../roles.js';

/** The slice of a string-select interaction this handler needs. `values` are color catalog keys. */
export interface ColorSelectInteraction {
  values: string[];
  reply(options: { content: string; ephemeral: boolean }): Promise<void>;
}

/** Narrow member-role editor: read current roles and add/remove by NAME. No member PII beyond roles. */
export interface MemberRoleEditor {
  hasRole(name: string): boolean;
  currentRoleNames(): string[];
  addRole(name: string): Promise<void>;
  removeRole(name: string): Promise<void>;
}

/**
 * Handle a color select: assign the chosen color (if any), and remove every OTHER managed color the
 * member currently holds so they end up with at most one color. Replies ephemerally.
 */
export async function handleColorSelect(
  interaction: ColorSelectInteraction,
  member: MemberRoleEditor,
): Promise<void> {
  const chosenKey = interaction.values[0];

  // Resolve the chosen color name (if a value was selected). Defensive: ignore unknown keys.
  let chosenName: string | undefined;
  if (chosenKey !== undefined) {
    const role = roleByKey(chosenKey);
    if (role === undefined || role.kind !== 'color') {
      await interaction.reply({
        content: "That color isn't available. Please pick one from the menu.",
        ephemeral: true,
      });
      return;
    }
    chosenName = role.name;
  }

  // Remove every managed color the member holds that is NOT the chosen one (only managed colors).
  for (const name of member.currentRoleNames()) {
    if (isManagedColorRole(name) && name !== chosenName) {
      await member.removeRole(name);
    }
  }

  // Add the chosen color if the member doesn't already have it.
  if (chosenName !== undefined && !member.hasRole(chosenName)) {
    await member.addRole(chosenName);
  }

  const content =
    chosenName === undefined ? 'Cleared your color.' : `You're now **${chosenName}**.`;
  await interaction.reply({ content, ephemeral: true });
}
