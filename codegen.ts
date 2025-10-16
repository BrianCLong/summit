import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'apps/server/src/schema/**/*.graphql',
  documents: ['apps/web/src/**/*.{ts,tsx,graphql}'],
  generates: {
    'apps/web/src/__generated__/': {
      preset: 'client',
      plugins: []
    },
    'apps/server/src/__generated__/types.ts': {
      plugins: ['typescript','typescript-resolvers']
    }
  },
  hooks: { afterAllFileWrite: ['prettier --write'] }
};
export default config;
