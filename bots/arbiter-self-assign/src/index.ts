// SPDX-License-Identifier: MIT
//
// arbiter-self-assign entrypoint (AC-07, AC-08, AC-09, AC-10, AC-11).
//
//   - `createClient()` builds a discord.js Client with EXACTLY [Guilds, GuildMembers] (AC-09) and is
//     exported so a test can assert the intent set WITHOUT logging in.
//   - On ClientReady: ensure the 12 managed roles exist (AC-01/02), register /post-role-menu
//     idempotently (AC-07), and re-bind or repost the menu from persisted state (AC-08).
//   - interactionCreate routes: string-select → color handler, ping button → ping handler,
//     chat-input → post-menu handler.
//   - The token is env-only and NEVER logged; no member PII is logged (AC-10, AC-11).
//   - `client.login(...)` runs only inside the guarded `main()`, never on import (tests stay offline).

import { pathToFileURL } from 'node:url';
import {
  Client,
  Events,
  PermissionFlagsBits,
  REST,
  type GuildMember,
  type Guild,
  type Interaction,
  type RESTPostAPIApplicationCommandsJSONBody,
  type TextChannel,
} from 'discord.js';
import { JsonValueStore, registerGuildCommands } from '@discord-bots/bot-core';
import { arbiterSelfAssignStaticConfig, loadArbiterSelfAssignConfig } from './config.js';
import { ensureManagedRoles } from './ensure-roles.js';
import type { EnsureRolesGuild, CreateRoleOptions, ExistingRoleView } from './ensure-roles.js';
import { buildRoleMenu, COLOR_SELECT_CUSTOM_ID, PING_BUTTON_PREFIX } from './menu.js';
import { isManagedRole } from './roles.js';
import { handleColorSelect } from './handlers/color.js';
import type { MemberRoleEditor } from './handlers/color.js';
import { handlePingToggle } from './handlers/ping.js';
import { handlePostMenu, postRoleMenuCommand } from './handlers/post-menu.js';
import type { PersistedMenuLocation } from './handlers/post-menu.js';

/** The slash-command JSON bodies this bot owns (used by the entrypoint and the deploy script). */
export const commandBodies: RESTPostAPIApplicationCommandsJSONBody[] = [
  postRoleMenuCommand.toJSON(),
];

/**
 * Build the discord.js client with EXACTLY the configured least-privilege intents. Pure — performs
 * no login and no network I/O, so a test can assert the intent set (AC-09).
 */
export function createClient(): Client {
  return new Client({ intents: [...arbiterSelfAssignStaticConfig.intents] });
}

/** Adapt a real discord.js Guild to the narrow EnsureRolesGuild interface (AC-01/02 boundary). */
function asEnsureRolesGuild(guild: Guild, botHighestPosition: number): EnsureRolesGuild {
  return {
    listRoles: (): ExistingRoleView[] =>
      guild.roles.cache.map((r) => ({ id: r.id, name: r.name, position: r.position })),
    botHighestRolePosition: () => botHighestPosition,
    createRole: async (options: CreateRoleOptions): Promise<ExistingRoleView> => {
      const role = await guild.roles.create({
        name: options.name,
        color: options.color,
        permissions: [],
        hoist: options.hoist,
        mentionable: options.mentionable,
        position: options.position,
        reason: options.reason,
      });
      return { id: role.id, name: role.name, position: role.position };
    },
  };
}

/**
 * Adapt a real GuildMember to the narrow MemberRoleEditor. Resolves role names within the guild.
 *
 * Defense-in-depth for the only-12 boundary (AC-02): `addRole`/`removeRole` refuse any name that is
 * not a managed role, so even a future mis-wired caller cannot mutate a non-managed role (e.g. a tier
 * role) through this adapter. Callers today only ever pass managed names; this is the last guard.
 */
export function asMemberRoleEditor(member: GuildMember): MemberRoleEditor {
  const findRoleId = (name: string): string | undefined =>
    member.guild.roles.cache.find((r) => r.name === name)?.id;
  return {
    hasRole: (name) => member.roles.cache.some((r) => r.name === name),
    currentRoleNames: () => member.roles.cache.map((r) => r.name),
    addRole: async (name) => {
      if (!isManagedRole(name)) return;
      const id = findRoleId(name);
      if (id !== undefined) await member.roles.add(id);
    },
    removeRole: async (name) => {
      if (!isManagedRole(name)) return;
      const id = findRoleId(name);
      if (id !== undefined) await member.roles.remove(id);
    },
  };
}

/** Guarded process entry: wire the client and log in. Never logs the token or member data. */
async function main(): Promise<void> {
  const config = loadArbiterSelfAssignConfig();
  const client = createClient();

  // Persisted menu location (AC-08, AC-10): only {guildId, channelId, messageId} — no member PII.
  const store = new JsonValueStore<PersistedMenuLocation>(
    new URL('../data/menu-location.json', import.meta.url).pathname,
  );

  /** Post the menu to #roles and return the new message id. */
  const postMenu = async (): Promise<string> => {
    const channel = await client.channels.fetch(config.rolesChannelId);
    if (channel === null || !channel.isTextBased() || !('send' in channel)) {
      throw new Error('#roles channel is not sendable');
    }
    const message = await (channel as TextChannel).send({
      content: 'Pick a color and opt into game pings:',
      components: buildRoleMenu(),
    });
    return message.id;
  };

  client.once(Events.ClientReady, async (ready) => {
    try {
      const guild = await ready.guilds.fetch(config.guildId);
      const fullGuild = await guild.fetch();
      await fullGuild.roles.fetch();

      // The bot's own highest role position bounds where managed roles can sit (AC-01).
      const botMember = await fullGuild.members.fetchMe();
      const botHighestPosition = botMember.roles.highest.position;

      const result = await ensureManagedRoles(asEnsureRolesGuild(fullGuild, botHighestPosition));
      // Log COUNTS only — no role-by-role member data.
      console.log(
        `arbiter-self-assign: ensured roles (created ${result.created.length}, adopted ${result.adopted.length}).`,
      );

      const rest = new REST().setToken(config.token);
      await registerGuildCommands({
        rest,
        applicationId: ready.user.id,
        guildId: config.guildId,
        commands: commandBodies,
      });

      // Re-bind the menu: if the persisted message is gone (or none saved), repost cleanly (AC-08).
      const saved = await store.read();
      let messageOk = false;
      if (saved !== undefined && saved.channelId === config.rolesChannelId) {
        try {
          const channel = await client.channels.fetch(saved.channelId);
          if (channel !== null && channel.isTextBased()) {
            await (channel as TextChannel).messages.fetch(saved.messageId);
            messageOk = true;
          }
        } catch {
          messageOk = false;
        }
      }
      if (!messageOk) {
        const messageId = await postMenu();
        await store.write({
          guildId: config.guildId,
          channelId: config.rolesChannelId,
          messageId,
        });
      }

      console.log('arbiter-self-assign is ready.');
    } catch (err: unknown) {
      console.error('startup failed:', err instanceof Error ? err.message : 'unknown error');
    }
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isStringSelectMenu() && interaction.customId === COLOR_SELECT_CUSTOM_ID) {
        const member = interaction.member;
        if (member === null || !('roles' in member)) return;
        await handleColorSelect(
          {
            values: interaction.values,
            reply: async (opts) => {
              await interaction.reply({ content: opts.content, ephemeral: opts.ephemeral });
            },
          },
          asMemberRoleEditor(member as GuildMember),
        );
        return;
      }

      if (interaction.isButton() && interaction.customId.startsWith(PING_BUTTON_PREFIX)) {
        const member = interaction.member;
        if (member === null || !('roles' in member)) return;
        await handlePingToggle(
          {
            customId: interaction.customId,
            reply: async (opts) => {
              await interaction.reply({ content: opts.content, ephemeral: opts.ephemeral });
            },
          },
          asMemberRoleEditor(member as GuildMember),
        );
        return;
      }

      if (interaction.isChatInputCommand() && interaction.commandName === 'post-role-menu') {
        await handlePostMenu(
          {
            guildId: interaction.guildId,
            memberHasManageRoles: () =>
              interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles) ?? false,
            reply: async (opts) => {
              await interaction.reply({ content: opts.content, ephemeral: opts.ephemeral });
            },
          },
          { poster: postMenu, store, channelId: config.rolesChannelId },
        );
        return;
      }
    } catch (err: unknown) {
      // Never log member identity — only a generic failure note.
      console.error('interaction handling failed:', err instanceof Error ? err.message : 'error');
    }
  });

  await client.login(config.token);
}

// Run only when invoked directly (node dist/index.js), never on import (keeps tests off the network).
// Use pathToFileURL so the guard is robust on Windows and to relative argv (see new-bot [NEEDS-TRIAGE]).
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(
      'arbiter-self-assign failed to start:',
      err instanceof Error ? err.message : 'error',
    );
    process.exitCode = 1;
  });
}
