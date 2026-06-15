// SPDX-License-Identifier: MIT
//
// Tests for the new-bot generator (T-29, AC-17). Every scaffold writes into a fresh OS temp dir
// (os.tmpdir() + fs.mkdtemp) and is removed in afterEach, so the real `bots/` tree is never touched.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

import { scaffoldBot } from './scaffold.js';

/** Parse a TypeScript source string and return syntactic diagnostics (empty array == valid syntax). */
function syntaxErrors(source: string, fileName: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  // `parseDiagnostics` is internal but is the canonical syntax-error list for a SourceFile.
  const diags = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
  return diags.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

describe('scaffoldBot', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'new-bot-test-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('happy path: scaffolds a bot to the per-bot convention', () => {
    it('creates exactly the convention files under bots/<slug>/ and returns their paths', async () => {
      const result = scaffoldBot({ slug: 'test-bot', targetDir: root });

      const expected = [
        join(root, 'bots', 'test-bot', 'package.json'),
        join(root, 'bots', 'test-bot', 'tsconfig.json'),
        join(root, 'bots', 'test-bot', 'src', 'config.ts'),
        join(root, 'bots', 'test-bot', 'src', 'index.ts'),
        join(root, 'bots', 'test-bot', 'data', '.gitkeep'),
      ];
      for (const f of expected) {
        expect(existsSync(f), `${f} should exist`).toBe(true);
      }
      expect(result.created.sort()).toEqual(expected.sort());
    });

    it('generates package.json with the workspace name, type:module, private, and the required deps + start script', async () => {
      scaffoldBot({ slug: 'test-bot', targetDir: root });
      const pkg = JSON.parse(
        await readFile(join(root, 'bots', 'test-bot', 'package.json'), 'utf8'),
      ) as Record<string, unknown>;

      expect(pkg.name).toBe('@discord-bots/test-bot');
      expect(pkg.type).toBe('module');
      expect(pkg.private).toBe(true);
      expect(pkg.scripts).toMatchObject({ start: 'node dist/index.js' });
      expect(pkg.dependencies).toMatchObject({
        '@discord-bots/dice': '*',
        '@discord-bots/bot-core': '*',
        'discord.js': '^14.26.4',
      });
    });

    it('generates tsconfig.json extending the base, composite, referencing both workspace packages', async () => {
      scaffoldBot({ slug: 'test-bot', targetDir: root });
      const tscfg = JSON.parse(
        await readFile(join(root, 'bots', 'test-bot', 'tsconfig.json'), 'utf8'),
      ) as Record<string, unknown>;

      expect(tscfg.extends).toBe('../../tsconfig.base.json');
      expect((tscfg.compilerOptions as Record<string, unknown>).composite).toBe(true);
      expect(tscfg.references).toEqual([
        { path: '../../packages/dice' },
        { path: '../../packages/bot-core' },
      ]);
    });

    it('generates config.ts with the slug filled, clearly-marked placeholders + TODO, least-privilege intents, and loadBotConfig token wiring', async () => {
      scaffoldBot({ slug: 'test-bot', targetDir: root });
      const config = await readFile(join(root, 'bots', 'test-bot', 'src', 'config.ts'), 'utf8');

      // SPDX header (coding-standards).
      expect(config.startsWith('// SPDX-License-Identifier: MIT')).toBe(true);
      // Slug filled in.
      expect(config).toContain("slug: 'test-bot'");
      // Placeholders for the operator to replace, with a TODO marker.
      expect(config).toContain('REPLACE_ME');
      expect(config).toContain('TODO');
      // Least-privilege intents: exactly Guilds (minimal starting set). Assert the actual intents
      // array — not the surrounding guidance comment, which legitimately names the forbidden intents.
      expect(config).toContain('GatewayIntentBits.Guilds');
      const intentsArray = /_INTENTS[^=]*=\s*\[([^\]]*)\]/.exec(config)?.[1] ?? '';
      expect(intentsArray).toContain('GatewayIntentBits.Guilds');
      expect(intentsArray).not.toContain('MessageContent');
      expect(intentsArray).not.toContain('GuildMembers');
      // Token sourced through bot-core's loader — never hardcoded.
      expect(config).toContain('loadBotConfig');
      expect(config).not.toMatch(/DISCORD_TOKEN_TEST_BOT\s*=/);
    });

    it('generates index.ts with createClient(), a ClientReady handler, and a direct-invocation-guarded main()', async () => {
      scaffoldBot({ slug: 'test-bot', targetDir: root });
      const index = await readFile(join(root, 'bots', 'test-bot', 'src', 'index.ts'), 'utf8');

      expect(index.startsWith('// SPDX-License-Identifier: MIT')).toBe(true);
      expect(index).toContain('createClient');
      expect(index).toContain('ClientReady');
      // Guard: login only when invoked directly, mirroring dungeon-herald.
      expect(index).toContain('import.meta.url');
      expect(index).toContain('process.argv[1]');
      expect(index).toContain('client.login');
      // The token may be passed to client.login, but must never reach a logging call.
      for (const logCall of index.matchAll(/console\.(?:log|error|warn|info)\(([^;]*)\)/g)) {
        expect(logCall[1]).not.toContain('config.token');
        expect(logCall[1]).not.toContain('.token');
      }
    });

    it('generates src/*.ts that is syntactically valid TypeScript', async () => {
      scaffoldBot({ slug: 'test-bot', targetDir: root });
      for (const rel of ['src/config.ts', 'src/index.ts']) {
        const source = await readFile(join(root, 'bots', 'test-bot', rel), 'utf8');
        expect(syntaxErrors(source, rel), `${rel} should parse cleanly`).toEqual([]);
      }
    });
  });

  describe('slug validation', () => {
    it.each([
      ['', 'empty'],
      ['../evil', 'path traversal'],
      ['Has Spaces', 'spaces / non-kebab'],
      ['UPPER', 'uppercase'],
      ['trailing-', 'trailing hyphen'],
      ['-leading', 'leading hyphen'],
      ['a/b', 'path separator'],
      ['a..b', 'dot-dot'],
    ])('rejects %j (%s)', (slug) => {
      expect(() => scaffoldBot({ slug, targetDir: root })).toThrow();
    });

    it.each(['test-bot', 'a', 'my-cool-bot-2'])('accepts valid kebab slug %j', (slug) => {
      expect(() => scaffoldBot({ slug, targetDir: root })).not.toThrow();
    });
  });

  describe('refuses to overwrite an existing non-empty target', () => {
    it('throws when bots/<slug>/ already exists and is non-empty', async () => {
      const dest = join(root, 'bots', 'test-bot');
      await mkdir(dest, { recursive: true });
      await writeFile(join(dest, 'package.json'), '{"existing":true}', 'utf8');

      expect(() => scaffoldBot({ slug: 'test-bot', targetDir: root })).toThrow(/exist/i);
      // Pre-existing file is untouched.
      expect(await readFile(join(dest, 'package.json'), 'utf8')).toBe('{"existing":true}');
    });

    it('scaffolds into an existing but EMPTY target dir', async () => {
      const dest = join(root, 'bots', 'test-bot');
      await mkdir(dest, { recursive: true });
      expect(() => scaffoldBot({ slug: 'test-bot', targetDir: root })).not.toThrow();
      expect(existsSync(join(dest, 'package.json'))).toBe(true);
    });
  });
});
