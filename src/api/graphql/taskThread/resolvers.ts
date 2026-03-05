export const resolvers = {
  Query: {
    taskThread: (_, { id }) => {
      // Mock implementation to satisfy the schema requirements
      return null;
    }
  },
  TaskThread: {
    messages: (parent) => {
      // Mock implementation to satisfy the schema requirements
      return [];
    }
  }
};
