import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/manifest.test.ts', 'tests/globalProvenanceGraph.test.ts']
  }
});
