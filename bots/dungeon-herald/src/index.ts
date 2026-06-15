// SPDX-License-Identifier: MIT
//
// dungeon-herald entrypoint (AC-14, AC-15, AC-16).
//
//   - `createClient()` builds a discord.js Client with EXACTLY the least-privilege intents from
//     config (AC-15) and is exported so a test can assert the intent set WITHOUT logging in.
//   - On ClientReady: resolve channelId (#table-talk) + roleId (@Players), register the two commands
//     idempotently (AC-14), and start a ~60s reminder poller (AC-11/12/13).
//   - The token is loaded from env only and NEVER logged; no member data is logged (AC-16).
//   - `client.login(...)` runs only inside the guarded `main()`, never on import (keeps the unit
//     tests off the network).

import {
  Client,
  Events,
  GuildScheduledEventStatus,
  REST,
  type Guild,
  type Interaction,
  type RESTPostAPIApplicationCommandsJSONBody,
  type TextChannel,
} from 'discord.js';
import { JsonRemindedStore, registerGuildCommands } from '@discord-bots/bot-core';
import { handleRoll, rollCommand } from './commands/roll.js';
import { handleNextSession, nextSessionCommand } from './commands/nextsession.js';
import { buildReminderMessage, runReminderTick } from './reminder.js';
import {
  POLL_INTERVAL_MS,
  REMINDER_LEAD_MS,
  dungeonHeraldStaticConfig,
  loadDungeonHeraldConfig,
} from './config.js';

/** The slash-command JSON bodies this bot owns (used by the entrypoint and the deploy script). */
export const commandBodies: RESTPostAPIApplicationCommandsJSONBody[] = [
  rollCommand.toJSON(),
  nextSessionCommand.toJSON(),
];

/**
 * Build the discord.js client with EXACTLY the configured least-privilege intents. Pure — performs
 * no login and no network I/O, so a test can assert the intent set.
 */
export function createClient(): Client {
  return new Client({ intents: [...dungeonHeraldStaticConfig.intents] });
}

/** Resolve the #table-talk channel id by name within the guild. */
function resolveChannelId(guild: Guild, channelName: string): string {
  const channel = guild.channels.cache.find(
    (c): c is TextChannel => c.isTextBased() && 'name' in c && c.name === channelName,
  );
  if (channel === undefined) {
    throw new Error(`Channel #${channelName} not found in guild ${guild.id}.`);
  }
  return channel.id;
}

/** Resolve the @Players role id by name within the guild. */
function resolveRoleId(guild: Guild, roleName: string): string {
  const role = guild.roles.cache.find((r) => r.name === roleName);
  if (role === undefined) {
    throw new Error(`Role @${roleName} not found in guild ${guild.id}.`);
  }
  return role.id;
}

/** Read the guild's scheduled events as {name, startTime} — no member data. */
async function fetchScheduledEvents(guild: Guild): Promise<{ name: string; startTime: number }[]> {
  const events = await guild.scheduledEvents.fetch();
  const out: { name: string; startTime: number }[] = [];
  for (const event of events.values()) {
    if (event.status === GuildScheduledEventStatus.Canceled) {
      continue;
    }
    const ts = event.scheduledStartTimestamp;
    if (ts !== null) {
      out.push({ name: event.name, startTime: ts });
    }
  }
  return out;
}

/** Guarded process entry: wire the client and log in. Never logs the token or member data. */
async function main(): Promise<void> {
  const config = loadDungeonHeraldConfig();
  const client = createClient();

  // Reminder state file lives under the bot's data/ dir (ADR-0004). Holds only {eventId, startTime}.
  const store = new JsonRemindedStore(new URL('../data/reminders.json', import.meta.url).pathname);

  client.once(Events.ClientReady, async (ready) => {
    try {
      const guild = await ready.guilds.fetch(config.guildId);
      const fullGuild = await guild.fetch();
      await fullGuild.channels.fetch();
      await fullGuild.roles.fetch();

      const channelId = resolveChannelId(fullGuild, config.channelName);
      const playersRoleId = resolveRoleId(fullGuild, config.roleName);

      // Idempotent command registration (AC-14).
      const rest = new REST().setToken(config.token);
      await registerGuildCommands({
        rest,
        applicationId: ready.user.id,
        guildId: config.guildId,
        commands: commandBodies,
      });

      // Real sendReminder: post the embed to #table-talk, pinging @Players via explicit
      // allowed_mentions. No member PII in the payload (AC-16).
      const sendReminder = async (event: { id: string; startTime: number }): Promise<void> => {
        const channel = await client.channels.fetch(channelId);
        if (channel === null || !channel.isTextBased() || !('send' in channel)) {
          throw new Error('reminder channel is not sendable');
        }
        const live = await fullGuild.scheduledEvents.fetch(event.id);
        const message = buildReminderMessage({
          event: { id: event.id, name: live.name, startTime: event.startTime },
          playersRoleId,
        });
        await (channel as TextChannel).send(message);
      };

      const tick = async (): Promise<void> => {
        await runReminderTick({
          now: Date.now(),
          leadMs: REMINDER_LEAD_MS,
          fetchEvents: async () => {
            const evs = await fullGuild.scheduledEvents.fetch();
            const out: { id: string; startTime: number }[] = [];
            for (const e of evs.values()) {
              if (e.status === GuildScheduledEventStatus.Canceled) continue;
              if (e.scheduledStartTimestamp !== null) {
                out.push({ id: e.id, startTime: e.scheduledStartTimestamp });
              }
            }
            return out;
          },
          store,
          sendReminder,
        });
      };

      await tick();
      setInterval(() => {
        void tick().catch((err: unknown) => {
          console.error(
            'reminder tick failed:',
            err instanceof Error ? err.message : 'unknown error',
          );
        });
      }, POLL_INTERVAL_MS);
      console.log('dungeon-herald is ready.');
    } catch (err: unknown) {
      console.error('startup failed:', err instanceof Error ? err.message : 'unknown error');
    }
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    try {
      if (interaction.commandName === 'roll') {
        await handleRoll({
          getDice: () => interaction.options.getString('dice', true),
          reply: async (message, opts) => {
            await interaction.reply({ content: message, ephemeral: opts?.ephemeral ?? false });
          },
        });
      } else if (interaction.commandName === 'nextsession') {
        const guild = interaction.guild;
        await handleNextSession({
          now: Date.now(),
          fetchEvents: async () => (guild === null ? [] : fetchScheduledEvents(guild)),
          reply: async (message) => {
            await interaction.reply({ content: message });
          },
        });
      }
    } catch (err: unknown) {
      console.error(
        `interaction "${interaction.commandName}" failed:`,
        err instanceof Error ? err.message : 'unknown error',
      );
    }
  });

  await client.login(config.token);
}

// Run only when invoked directly (node dist/index.js), never on import (keeps tests off the network).
if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error('dungeon-herald failed to start:', err instanceof Error ? err.message : 'error');
    process.exitCode = 1;
  });
}
