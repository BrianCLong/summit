import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['server/**/*.ts'],
    },
    environmentMatchGlobs: [
      ['test/**/*.tsx', 'happy-dom'],
      ['test/**/*.ts', 'node'],
    ],
  },
});
