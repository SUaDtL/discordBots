// SPDX-License-Identifier: MIT
//
// @discord-bots/bot-core — shared scaffolding for Discord bots.
//
// Public API is STABLE: bots/dungeon-herald depends on these exact shapes.

export { loadBotConfig, tokenEnvVar } from './config.js';
export type { BotConfig, BotStaticConfig } from './config.js';

export { JsonRemindedStore } from './reminded-store.js';
export type { RemindedEvent, RemindedStore } from './reminded-store.js';

export { dueReminders } from './reminder-scheduler.js';
export type { DueParams, SchedulableEvent } from './reminder-scheduler.js';

export { registerGuildCommands } from './register-commands.js';
export type {
  RegisterGuildCommandsOptions,
  RegisterGuildCommandsResult,
} from './register-commands.js';
