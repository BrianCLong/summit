"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    schema: '../../server/src/graphql/schema.graphql',
    documents: ['src/graphql/**/*.ts'],
    generates: {
        'src/graphql/generated/': {
            preset: 'client',
            plugins: [],
            presetConfig: {
                gqlTagName: 'gql',
            },
        },
        'src/graphql/generated/hooks.ts': {
            plugins: [
                'typescript',
                'typescript-operations',
                'typescript-react-apollo',
            ],
            config: {
                withHooks: true,
                withComponent: false,
                withHOC: false,
            },
        },
    },
    ignoreNoDocuments: true,
};
exports.default = config;
