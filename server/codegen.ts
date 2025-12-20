import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  // Point to the aggregated schema
  schema: './src/graphql/schema/index.js',
  generates: {
    './src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        // Point to the context interface
        contextType: '../graphql/apollo-v5-server.js#GraphQLContext',
        scalars: {
          DateTime: 'Date',
          JSON: 'any',
          Upload: 'any',
        },
        // Optional: Ensure strict type checking
        strictScalars: true,
      },
    },
    './src/generated/introspection.json': {
      plugins: ['introspection'],
    },
  },
  // Use require for js files in module system if needed, but ts-node handles it
  require: ['ts-node/register'],
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;
