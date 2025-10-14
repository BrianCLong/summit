// Virtual module for graphql-tester mock
const createTestClient = (config) => {
  return {
    query: async (query, variables = {}) => {
      // Return a mock response structure similar to graphql-tester
      return {
        status: 200,
        data: { ok: true, __op: 'query' },
        errors: undefined,
        extensions: {},
      };
    },
    mutate: async (mutation, variables = {}) => {
      return {
        status: 200,
        data: { ok: true, __op: 'mutation' },
        errors: undefined,
        extensions: {},
      };
    }
  };
};

module.exports = { createTestClient };