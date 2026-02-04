import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { reporter: ['text', 'lcov', 'json-summary'] },
    include: ['src/**/*.test.ts'],
    globals: true, // Use globals if I used them (I used import, so maybe not needed, but safe)
  },
});
