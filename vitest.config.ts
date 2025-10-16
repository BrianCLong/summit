import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/dist/**','**/build/**','**/node_modules/**'],
    globals: true,
    reporters: ['default'],
    passWithNoTests: true,
  },
});
