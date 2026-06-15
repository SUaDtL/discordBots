// SPDX-License-Identifier: MIT
//
// new-bot generator core (T-29, AC-17). `scaffoldBot` is a pure-ish, testable function: given a slug
// and a target root, it writes a new `bots/<slug>/` folder reproducing the per-bot convention proven
// by `bots/dungeon-herald` (package.json / tsconfig.json / src/config.ts / src/index.ts / data/.gitkeep).
//
// Depends only on Node built-ins (fs/path) — no third-party runtime deps. The CLI argv-parsing lives
// in `cli.ts`; this module performs only validation + file emission so it can be unit-tested without
// a process.

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Input to {@link scaffoldBot}. */
export interface ScaffoldOptions {
  /** Kebab-case bot slug, e.g. `test-bot`. Becomes the folder name and `@discord-bots/<slug>` package. */
  slug: string;
  /** Repo root under which `bots/<slug>/` is created. */
  targetDir: string;
}

/** Result of {@link scaffoldBot}: the absolute paths of every file written. */
export interface ScaffoldResult {
  created: string[];
}

/**
 * Kebab-case slug: lowercase letters/digits in hyphen-separated segments, no leading/trailing hyphen,
 * no path separators or `..`. Anchored to forbid traversal (`../evil`), spaces, and uppercase.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate a bot slug or throw a clear Error. Guards against path traversal and non-kebab input. */
export function assertValidSlug(slug: string): void {
  if (typeof slug !== 'string' || slug.length === 0) {
    throw new Error('Invalid slug: a non-empty bot slug is required.');
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `Invalid slug ${JSON.stringify(slug)}: use kebab-case (lowercase letters, digits, single ` +
        `hyphens), e.g. "my-cool-bot". No spaces, slashes, dots, or path traversal.`,
    );
  }
}

/** `dungeon-herald` -> `DUNGEON_HERALD` (matches bot-core's `tokenEnvVar`). */
function slugUpper(slug: string): string {
  return slug.toUpperCase().replace(/-/g, '_');
}

/** True when `dir` does not exist or exists and contains no entries. */
function isEmptyOrAbsent(dir: string): boolean {
  if (!existsSync(dir)) {
    return true;
  }
  return readdirSync(dir).length === 0;
}

function renderPackageJson(slug: string): string {
  const pkg = {
    name: `@discord-bots/${slug}`,
    version: '0.0.0',
    private: true,
    type: 'module',
    description: `${slug} — scaffolded by @discord-bots/new-bot. Fill in config.ts and add handlers.`,
    license: 'MIT',
    author: 'Brennon Huff',
    main: './dist/index.js',
    scripts: {
      start: 'node dist/index.js',
      test: 'vitest run',
      typecheck: 'tsc -b',
    },
    dependencies: {
      '@discord-bots/bot-core': '*',
      '@discord-bots/dice': '*',
      'discord.js': '^14.26.4',
    },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

function renderTsconfig(): string {
  const tsconfig = {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      composite: true,
      rootDir: './src',
      outDir: './dist',
      tsBuildInfoFile: './dist/.tsbuildinfo',
      types: ['node'],
    },
    include: ['src/**/*.ts'],
    exclude: ['dist', 'node_modules', 'src/**/*.test.ts'],
    references: [{ path: '../../packages/dice' }, { path: '../../packages/bot-core' }],
  };
  return JSON.stringify(tsconfig, null, 2) + '\n';
}

function renderConfigTs(slug: string): string {
  const envVar = `DISCORD_TOKEN_${slugUpper(slug)}`;
  return `// SPDX-License-Identifier: MIT
//
// Per-bot static config for ${slug} + loader. Scaffolded by @discord-bots/new-bot.
//
// LEAST-PRIVILEGE INTENTS: starts at exactly [Guilds] — the minimum to resolve guild caches and
// route interactions. Add ONLY the intents this bot actually needs (e.g. GuildScheduledEvents) and
// document why; never request MessageContent or GuildMembers unless justified and approved.
//
// TODO: replace the REPLACE_ME placeholders below with this bot's real guild id, channel, and role.

import { GatewayIntentBits } from 'discord.js';
import { loadBotConfig } from '@discord-bots/bot-core';
import type { BotConfig, BotStaticConfig } from '@discord-bots/bot-core';

/** Least-privilege gateway intents for ${slug}. Add only what this bot needs. */
export const ${camelConst(slug)}_INTENTS: readonly GatewayIntentBits[] = [GatewayIntentBits.Guilds];

/** Static, non-secret config for ${slug}. Safe to commit. */
export const ${camelVar(slug)}StaticConfig: BotStaticConfig = {
  slug: '${slug}',
  // TODO: REPLACE_ME — set this bot's Discord guild (server) id.
  guildId: 'REPLACE_ME',
  // TODO: REPLACE_ME — set the channel this bot posts to (by name, no leading #).
  channelName: 'REPLACE_ME',
  // TODO: REPLACE_ME — set the role this bot mentions/targets (by name, no leading @).
  roleName: 'REPLACE_ME',
  intents: [...${camelConst(slug)}_INTENTS],
};

/**
 * Load the full runtime config (static fields + env-sourced token). The token comes from
 * \`${envVar}\` only (via bot-core's loadBotConfig) and is never logged.
 */
export function load${pascal(slug)}Config(env: NodeJS.ProcessEnv = process.env): BotConfig {
  return loadBotConfig(${camelVar(slug)}StaticConfig, env);
}
`;
}

function renderIndexTs(slug: string): string {
  return `// SPDX-License-Identifier: MIT
//
// ${slug} entrypoint. Scaffolded by @discord-bots/new-bot — a minimal runnable skeleton.
//
//   - \`createClient()\` builds a discord.js Client with EXACTLY the configured least-privilege
//     intents and is exported so a test can assert the intent set WITHOUT logging in.
//   - On ClientReady: log a ready line (no token, no member PII). Wire commands/pollers here.
//   - \`client.login(...)\` runs only inside the guarded \`main()\`, never on import (keeps unit
//     tests off the network).

import { Client, Events } from 'discord.js';
import { ${camelVar(slug)}StaticConfig, load${pascal(slug)}Config } from './config.js';

/**
 * Build the discord.js client with EXACTLY the configured least-privilege intents. Pure — performs
 * no login and no network I/O, so a test can assert the intent set.
 */
export function createClient(): Client {
  return new Client({ intents: [...${camelVar(slug)}StaticConfig.intents] });
}

/** Guarded process entry: wire the client and log in. Never logs the token or member data. */
async function main(): Promise<void> {
  const config = load${pascal(slug)}Config();
  const client = createClient();

  client.once(Events.ClientReady, (ready) => {
    // No token, no member PII — just a non-sensitive ready line keyed by the bot's own user id.
    console.log(\`${slug} is ready as \${ready.user.tag} (id \${ready.user.id}).\`);
  });

  // TODO: register slash commands, add interaction handlers, start pollers, etc.

  await client.login(config.token);
}

// Run only when invoked directly (node dist/index.js), never on import (keeps tests off the network).
if (process.argv[1] !== undefined && import.meta.url === \`file://\${process.argv[1]}\`) {
  main().catch((err: unknown) => {
    console.error('${slug} failed to start:', err instanceof Error ? err.message : 'error');
    process.exitCode = 1;
  });
}
`;
}

const GITKEEP = `# Durable runtime data lives here (e.g. reminders.json — gitignored).
# This file only keeps the directory present in git; it holds no data and no PII.
`;

/** kebab-case -> PascalCase, e.g. \`test-bot\` -> \`TestBot\`. */
function pascal(slug: string): string {
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

/** kebab-case -> camelCase, e.g. \`test-bot\` -> \`testBot\`. */
function camelVar(slug: string): string {
  const p = pascal(slug);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** kebab-case -> UPPER_SNAKE, e.g. \`test-bot\` -> \`TEST_BOT\`. */
function camelConst(slug: string): string {
  return slugUpper(slug);
}

/**
 * Scaffold a new bot folder under \`<targetDir>/bots/<slug>/\` to the per-bot convention.
 *
 * @throws Error on an invalid slug or when the target already exists and is non-empty (never
 *         overwrites existing work).
 */
export function scaffoldBot(options: ScaffoldOptions): ScaffoldResult {
  const { slug, targetDir } = options;
  assertValidSlug(slug);

  const botDir = join(targetDir, 'bots', slug);
  if (!isEmptyOrAbsent(botDir)) {
    throw new Error(
      `Refusing to scaffold: ${botDir} already exists and is not empty. Remove it or choose a ` +
        `different slug.`,
    );
  }

  const srcDir = join(botDir, 'src');
  const dataDir = join(botDir, 'data');
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });

  const files: { path: string; content: string }[] = [
    { path: join(botDir, 'package.json'), content: renderPackageJson(slug) },
    { path: join(botDir, 'tsconfig.json'), content: renderTsconfig() },
    { path: join(srcDir, 'config.ts'), content: renderConfigTs(slug) },
    { path: join(srcDir, 'index.ts'), content: renderIndexTs(slug) },
    { path: join(dataDir, '.gitkeep'), content: GITKEEP },
  ];

  const created: string[] = [];
  for (const { path, content } of files) {
    writeFileSync(path, content, { encoding: 'utf8' });
    created.push(path);
  }

  return { created };
}
