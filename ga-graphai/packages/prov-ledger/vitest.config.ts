import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['tests/manifest.test.ts', 'tests/training-capsules.integration.test.ts']
  },
  resolve: {
    alias: {
      'common-types': resolve(here, '../common-types/src/index.ts')
    },
    extensions: ['.ts', '.tsx', '.js', '.mjs', '.json']
  }
});
