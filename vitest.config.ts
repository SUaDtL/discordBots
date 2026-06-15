// SPDX-License-Identifier: MIT
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Workspace-wide test run: any colocated *.test.ts across packages/bots/tools.
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    // Foundation tree has no tests yet; vitest v4 exits non-zero on zero files
    // without this. Real test files arrive with the dice/bot-core packages.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
