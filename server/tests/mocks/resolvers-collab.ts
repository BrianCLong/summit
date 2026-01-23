// Mock for graphql/resolvers.collab
export const collabResolvers = {
  Query: {
    branch: async (_: any, { id }: { id: string }) => ({
      id,
      name: 'mock-branch',
      createdAt: new Date().toISOString(),
    }),
    branches: async () => [],
  },
  Mutation: {
    createBranch: async (_: any, { name }: { name: string }) => ({
      id: `branch-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
    }),
    deleteBranch: async () => true,
  },
};

export default collabResolvers;
