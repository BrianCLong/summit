import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { reporter: ['text', 'lcov', 'json-summary'] },
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
});
