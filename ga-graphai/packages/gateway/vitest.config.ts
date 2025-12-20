import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const stubCommonTypes = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'test-common-types.stub.js',
);

export default defineConfig({
  resolve: {
    alias: {
      '@ga-graphai/common-types': stubCommonTypes,
    },
  },
  test: {
    deps: {
      registerNodeLoader: true,
      optimizer: {
        ssr: {
          include: ['@ga-graphai/common-types', '@ga-graphai/query-copilot'],
        },
      },
    },
    ssr: {
      noExternal: ['@ga-graphai/common-types', '@ga-graphai/query-copilot'],
    },
    server: {
      deps: {
        inline: [
          /^@ga-graphai\/common-types/,
          /^@ga-graphai\/query-copilot/,
        ],
      },
    },
  },
});
