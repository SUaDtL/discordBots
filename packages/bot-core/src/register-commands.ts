// SPDX-License-Identifier: MIT
//
// Idempotent guild slash-command registration (AC-14). Fetches existing guild commands first
// (`list_commands` equivalent) and only PUTs commands that are not already registered, so re-running
// deploy never creates duplicates. Network access is entirely via the injected discord.js `REST`
// instance, so tests drive it with a mock and never hit Discord.

import { Routes } from 'discord.js';
import type { REST, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

export interface RegisterGuildCommandsOptions {
  rest: REST;
  applicationId: string;
  guildId: string;
  commands: RESTPostAPIApplicationCommandsJSONBody[];
}

export interface RegisterGuildCommandsResult {
  registered: string[];
  skipped: string[];
}

/** Minimal shape we read from each existing command returned by the GET. */
interface ExistingCommand {
  name: string;
}

/**
 * Register the given guild commands idempotently. A command whose name already exists is skipped; a
 * missing one is registered via a single PUT of the full desired set (only when there is at least
 * one new command). Returns the names that were registered vs. skipped.
 */
export async function registerGuildCommands(
  opts: RegisterGuildCommandsOptions,
): Promise<RegisterGuildCommandsResult> {
  const { rest, applicationId, guildId, commands } = opts;
  const route = Routes.applicationGuildCommands(applicationId, guildId);

  const existing = (await rest.get(route)) as ExistingCommand[];
  const existingNames = new Set(existing.map((c) => c.name));

  const registered: string[] = [];
  const skipped: string[] = [];
  for (const command of commands) {
    if (existingNames.has(command.name)) {
      skipped.push(command.name);
    } else {
      registered.push(command.name);
    }
  }

  if (registered.length > 0) {
    // PUT the full desired set so the guild ends up with exactly the intended commands; only done
    // when something is new, keeping the all-present case a pure no-op (no write).
    await rest.put(route, { body: commands });
  }

  return { registered, skipped };
}
