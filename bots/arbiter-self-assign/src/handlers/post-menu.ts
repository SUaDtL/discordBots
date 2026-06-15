// SPDX-License-Identifier: MIT
//
// /post-role-menu handler (AC-07, AC-08). An admin-gated slash command that (re)posts the self-assign
// menu into #roles and persists its location so the menu re-binds after a restart.
//
// ADMIN GATE (AC-07): the command sets default_member_permissions to ManageRoles (Discord hides it
// from non-admins) AND the handler re-checks `memberHasManageRoles()` at runtime as defense in depth —
// a non-admin is rejected ephemerally and nothing is posted or persisted.
//
// NO PII (AC-10): the only thing persisted is {guildId, channelId, messageId} — three Discord ids,
// no member data. The handler takes narrow interfaces (poster + store) so it is unit-tested without
// discord.js or the filesystem.

import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

/** Persisted menu location — exactly three ids, no member PII (AC-10). */
export interface PersistedMenuLocation {
  guildId: string;
  channelId: string;
  messageId: string;
}

/** Posts the menu to the target channel and returns the new message id. */
export type MenuPoster = () => Promise<string>;

/** Narrow store: persists the menu location (backed by bot-core JsonValueStore at runtime). */
export interface MenuLocationStore {
  write(value: PersistedMenuLocation): Promise<void>;
}

/** The slice of the chat-input interaction this handler needs. */
export interface PostMenuInteraction {
  guildId: string | null;
  /** True iff the invoking member has the Manage Roles permission. */
  memberHasManageRoles(): boolean;
  reply(options: { content: string; ephemeral: boolean }): Promise<void>;
}

export interface PostMenuDeps {
  poster: MenuPoster;
  store: MenuLocationStore;
  channelId: string;
}

/** Slash-command shape: `/post-role-menu`, admin-gated via default_member_permissions = ManageRoles. */
export const postRoleMenuCommand = new SlashCommandBuilder()
  .setName('post-role-menu')
  .setDescription('(Admin) Post or refresh the self-assign role menu in #roles.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

/**
 * Handle `/post-role-menu`: verify the caller has Manage Roles, post the menu, and persist its
 * location. Always replies ephemerally; rejects non-admins and non-guild use without side effects.
 */
export async function handlePostMenu(
  interaction: PostMenuInteraction,
  deps: PostMenuDeps,
): Promise<void> {
  if (interaction.guildId === null) {
    await interaction.reply({
      content: 'This command can only be used in the server.',
      ephemeral: true,
    });
    return;
  }

  if (!interaction.memberHasManageRoles()) {
    await interaction.reply({
      content: 'You need the **Manage Roles** permission to post the role menu.',
      ephemeral: true,
    });
    return;
  }

  const messageId = await deps.poster();
  await deps.store.write({
    guildId: interaction.guildId,
    channelId: deps.channelId,
    messageId,
  });

  await interaction.reply({
    content: 'Posted the role menu in the channel.',
    ephemeral: true,
  });
}
