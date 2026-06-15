// SPDX-License-Identifier: MIT
//
// Ping toggle handler (AC-05, AC-06, AC-02). A ping/GameNight button toggles that one managed role:
// add if the member lacks it, remove if they hold it. The reply is always EPHEMERAL (AC-06).
//
// SAFETY (AC-02): the button's custom id is parsed to a catalog KEY and resolved to a managed PING
// role; anything else (a color id, an unknown/forged key) is rejected with an ephemeral message and
// touches no roles. Only the single resolved managed ping role is ever added or removed.

import { parsePingButtonCustomId } from '../menu.js';
import { roleByKey } from '../roles.js';
import type { MemberRoleEditor } from './color.js';

/** The slice of a button interaction this handler needs. */
export interface PingButtonInteraction {
  customId: string;
  reply(options: { content: string; ephemeral: boolean }): Promise<void>;
}

/** Toggle the managed ping role addressed by the button's custom id. Replies ephemerally. */
export async function handlePingToggle(
  interaction: PingButtonInteraction,
  member: MemberRoleEditor,
): Promise<void> {
  const key = parsePingButtonCustomId(interaction.customId);
  const role = key === undefined ? undefined : roleByKey(key);

  if (role === undefined || role.kind !== 'ping') {
    await interaction.reply({
      content: "That option isn't available. Please use a button from the menu.",
      ephemeral: true,
    });
    return;
  }

  if (member.hasRole(role.name)) {
    await member.removeRole(role.name);
    await interaction.reply({ content: `Removed **${role.name}**.`, ephemeral: true });
    return;
  }

  await member.addRole(role.name);
  await interaction.reply({ content: `Added **${role.name}**.`, ephemeral: true });
}
