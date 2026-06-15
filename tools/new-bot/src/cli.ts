// SPDX-License-Identifier: MIT
//
// CLI entrypoint for @discord-bots/new-bot. Parses argv and delegates to `scaffoldBot`; all the
// logic lives in scaffold.ts so it stays unit-testable. Run: `node dist/cli.js <slug>`.
//
// The repo root is resolved relative to this file (tools/new-bot/dist/cli.js -> ../../..), so the
// generator always writes into the workspace it ships inside, regardless of cwd.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { scaffoldBot } from './scaffold.js';

/** Parse argv and scaffold the requested bot. Returns the process exit code. */
export function run(argv: string[]): number {
  const slug = argv[0];
  if (slug === undefined || slug === '--help' || slug === '-h') {
    console.error('Usage: new-bot <slug>   (e.g. new-bot my-cool-bot)');
    return slug === undefined ? 1 : 0;
  }

  // dist/cli.js is at <root>/tools/new-bot/dist/cli.js -> three levels up is the repo root.
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, '..', '..', '..');

  try {
    const { created } = scaffoldBot({ slug, targetDir: repoRoot });
    console.log(`Scaffolded bot "${slug}":`);
    for (const f of created) {
      console.log(`  + ${f}`);
    }
    console.log(
      `\nNext: run \`npm install\`, then edit bots/${slug}/src/config.ts (replace the ` +
        `REPLACE_ME placeholders) and add your handlers.`,
    );
    return 0;
  } catch (err: unknown) {
    console.error(`new-bot failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    return 1;
  }
}

// Run only when invoked directly (node dist/cli.js), never on import.
if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = run(process.argv.slice(2));
}
