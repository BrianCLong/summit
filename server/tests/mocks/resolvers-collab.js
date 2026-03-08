"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collabResolvers = void 0;
// Mock for graphql/resolvers.collab
exports.collabResolvers = {
    Query: {
        branch: async (_, { id }) => ({
            id,
            name: 'mock-branch',
            createdAt: new Date().toISOString(),
        }),
        branches: async () => [],
    },
    Mutation: {
        createBranch: async (_, { name }) => ({
            id: `branch-${Date.now()}`,
            name,
            createdAt: new Date().toISOString(),
        }),
        deleteBranch: async () => true,
    },
};
exports.default = exports.collabResolvers;
