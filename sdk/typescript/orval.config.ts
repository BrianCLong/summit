import { defineConfig } from 'orval';

export default defineConfig({
  maestroSdk: {
    input: '/Users/brianlong/Documents/GitHub/intelgraph/maestro-orchestration-api.yaml',
    output: {
      target: './sdk/typescript/src/generated/index.ts',
      mode: 'single',
      client: 'axios',
      prettier: true,
    },
  },
});
