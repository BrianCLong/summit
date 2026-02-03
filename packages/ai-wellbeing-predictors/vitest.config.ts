import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { reporter: ['text', 'lcov', 'json-summary'] },
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/dist/**', '**/build/**', '**/node_modules/**'],
    globals: true,
    reporters: ['default'],
    passWithNoTests: false,
  },
});
