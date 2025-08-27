import type { CodegenConfig } from '@graphql-codegen/cli';

const LIVE = process.env.VITE_API_URL || 'http://localhost:4000/graphql';
const SNAPSHOT = 'client/schema.graphql';
const SCHEMA = process.env.CODEGEN_SCHEMA || LIVE;

const config: CodegenConfig = {
  // Pin concurrency for stability in CI and constrained envs
  concurrency: 1,
  overwrite: true,
  schema: SCHEMA,
  documents: ['src/**/*.graphql'],
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      config: {
        withHooks: true,
        reactApolloVersion: 3,
        dedupeOperationSuffix: true,
        preResolveTypes: true,
      }
    },
    'artifacts/graphql-ops.json': {
      plugins: ['@replit/graphql-codegen-persisted-queries'],
      config: { 
        algorithm: 'sha256',
        output: 'client'
      }
    }
  },
  hooks: {
    afterStart: [
      `echo "🔎 Using schema: ${SCHEMA} (snapshot: ${SNAPSHOT})"`
    ]
  }
};

export default config;
