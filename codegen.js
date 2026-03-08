"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    schema: 'apps/server/src/schema/**/*.graphql',
    documents: ['apps/web/src/**/*.{ts,tsx,graphql}'],
    generates: {
        'apps/web/src/__generated__/': {
            preset: 'client',
            plugins: [],
        },
        'apps/server/src/__generated__/types.ts': {
            plugins: ['typescript', 'typescript-resolvers'],
        },
    },
    hooks: { afterAllFileWrite: ['prettier --write'] },
};
exports.default = config;
