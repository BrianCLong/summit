import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/manifest.test.ts', 'tests/selfEditRegistry.test.ts'],
  },
});
