import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    // The JSON reports feed the /coverage page (scripts/coverage_report.py).
    reporters: ['default', ['json', { outputFile: 'coverage/tests.json' }]],
    coverage: {
      provider: 'v8',
      include: ['app/**', 'components/**', 'content/**', 'lib/**'],
      // Generated from the Python source (types, snippets) and CSS: not hand-written logic.
      exclude: ['lib/generated/**', '**/*.css', '**/*.svg'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ['text', 'json-summary'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
