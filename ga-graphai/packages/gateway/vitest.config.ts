import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const stubCommonTypes = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "test-common-types.stub.js"
);

export default defineConfig({
  resolve: {
    alias: {
      "@ga-graphai/common-types": stubCommonTypes,
    },
  },
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json"],
      thresholds: {
        lines: 85,
        statements: 85,
        branches: 80,
        functions: 85,
      },
      include: ["src/search/**", "src/privacy/**", "src/drift/**", "src/versioning/**"],
    },
    deps: {
      registerNodeLoader: true,
      optimizer: {
        ssr: {
          include: ["@ga-graphai/common-types", "@ga-graphai/query-copilot"],
        },
      },
    },
    ssr: {
      noExternal: ["@ga-graphai/common-types", "@ga-graphai/query-copilot"],
    },
    server: {
      deps: {
        inline: [/^@ga-graphai\/common-types/, /^@ga-graphai\/query-copilot/],
      },
    },
  },
});
