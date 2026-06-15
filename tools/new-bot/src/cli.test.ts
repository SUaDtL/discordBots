// SPDX-License-Identifier: MIT
//
// Tests for the new-bot CLI argv parsing + exit codes. These exercise only the non-writing branches
// (missing arg, --help, and the invalid-slug error path) so the test never scaffolds into the real
// repo tree — the file-emission path is covered exhaustively by new-bot.test.ts against a temp dir.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { run } from './cli.js';

describe('cli run()', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits 1 and prints usage when no slug is given', () => {
    expect(run([])).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Usage: new-bot'));
  });

  it('exits 0 and prints usage for --help', () => {
    expect(run(['--help'])).toBe(0);
  });

  it('exits 1 on an invalid slug without throwing', () => {
    expect(run(['../evil'])).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('new-bot failed'));
  });
});
