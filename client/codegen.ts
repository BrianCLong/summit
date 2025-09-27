import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql', // Assuming this is the correct GraphQL endpoint
  documents: 'src/**/*.graphql', // Path to your GraphQL operations
  ignoreNoDocuments: true, // Ignore if no GraphQL documents are found
  generates: {
    './src/generated/': { // Output directory for generated files
      preset: 'client',
      plugins: [],
      presetConfig: {
        persistedDocuments: true, // Enable persisted operations
      },
    },
  },
};

export default config;
