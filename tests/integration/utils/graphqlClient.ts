const { http } = require('./httpClient');

async function createGraphQLClient(app) {
  // If an app is provided, use it directly; otherwise http() will use TEST_BASE_URL
  const client = app ? http(app) : http();

  return {
    query: async function(options = {}) {
      const { query = '', variables } = options;
      // If no query is provided, use a default (for backward compatibility with existing test)
      const actualQuery = query || '{ entity { id } }'; 
      const res = await client.post('/graphql').send({ query: actualQuery, variables });
      return {
        status: res.status,
        body: res.body,
        headers: res.headers,
      };
    },
    mutate: async function(options = {}) {
      const { query = '', variables } = options;
      const res = await client.post('/graphql').send({ query, variables });
      return {
        status: res.status,
        body: res.body,
        headers: res.headers,
      };
    },
    close: async function() {
      return undefined;
    },
  };
}

// For ES module compatibility as well
module.exports = { createGraphQLClient };
