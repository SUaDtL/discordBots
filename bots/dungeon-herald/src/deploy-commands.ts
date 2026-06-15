// SPDX-License-Identifier: MIT
//
// Standalone deploy-commands script (AC-14). Registers /roll and /nextsession idempotently via
// bot-core's `registerGuildCommands` (which lists existing commands first, then PUTs only when
// something is missing). The testable core (`deployCommands`) takes an injected REST so tests never
// hit Discord; `main()` is guarded so importing this file does NOT perform network calls.

import { REST } from 'discord.js';
import { registerGuildCommands } from '@discord-bots/bot-core';
import type { RegisterGuildCommandsResult } from '@discord-bots/bot-core';
import { commandBodies } from './index.js';
import { loadDungeonHeraldConfig } from './config.js';

export interface DeployCommandsDeps {
  rest: REST;
  applicationId: string;
  guildId: string;
}

/** Idempotently register dungeon-herald's slash commands into the guild. */
export function deployCommands(deps: DeployCommandsDeps): Promise<RegisterGuildCommandsResult> {
  return registerGuildCommands({
    rest: deps.rest,
    applicationId: deps.applicationId,
    guildId: deps.guildId,
    commands: commandBodies,
  });
}

/**
 * CLI entry: build a real REST from the env-sourced token and register against the chartered guild.
 * The application id comes from `DISCORD_APPLICATION_ID`. Never logs the token.
 */
async function main(): Promise<void> {
  const config = loadDungeonHeraldConfig();
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  if (applicationId === undefined || applicationId.trim() === '') {
    throw new Error('Missing DISCORD_APPLICATION_ID environment variable.');
  }

  const rest = new REST().setToken(config.token);
  const result = await deployCommands({ rest, applicationId, guildId: config.guildId });
  // Log only command NAMES — no token, no member data.
  console.log(
    `dungeon-herald: registered [${result.registered.join(', ')}], skipped [${result.skipped.join(
      ', ',
    )}]`,
  );
}

// Run only when invoked directly (node dist/deploy-commands.js), never on import (tests/index reuse).
if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error('deploy-commands failed:', err instanceof Error ? err.message : 'unknown error');
    process.exitCode = 1;
  });
}
