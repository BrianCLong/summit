import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@summit/schemas': '../summit-schemas/src'
    }
  }
});
