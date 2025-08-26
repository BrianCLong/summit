import type { CodegenConfig } from '@graphql-codegen/cli';

const API_URL = process.env.VITE_API_URL || 'http://localhost:4001/graphql';

const config: CodegenConfig = {
  overwrite: true,
  schema: API_URL,
  documents: ['src/**/*.graphql'],
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      config: {
        withHooks: true,
        skipTypename: false,
        enumsAsTypes: true,
        dedupeOperationSuffix: true,
        reactApolloVersion: 3,
        scalars: {
          DateTime: 'string',
          JSON: 'any',
          UUID: 'string',
        },
      }
    },
    // Persisted operations manifest used by CI safelist job
    'artifacts/graphql-ops.json': {
      plugins: ['@replit/graphql-codegen-persisted-queries'],
      config: { 
        algorithm: 'sha256',
        output: 'client'
      }
    }
  }
};

export default config;
