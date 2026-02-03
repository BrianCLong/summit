import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { reporter: ['text', 'lcov', 'json-summary'] },
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
