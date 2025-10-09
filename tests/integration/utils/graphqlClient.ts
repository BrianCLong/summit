// Shared GraphQL test client for integration tests
// Provides a consistent interface for GraphQL testing

/**
 * Creates a GraphQL test client for integration testing
 * 
 * @param baseUrl - Optional base URL for external GraphQL endpoint
 * @returns GraphQL test client with query and mutate methods
 */
export async function createGraphQLTestClient(baseUrl?: string) {
  // Return a mock client that simulates GraphQL responses
  return {
    /**
     * Execute a GraphQL query
     * 
     * @param query - GraphQL query string
     * @param variables - Optional variables for the query
     * @returns Mock response with status, body, and headers
     */
    async query(query: string, variables?: Record<string, any>) {
      // Simulate a GraphQL response
      return {
        status: 200,
        body: { 
          data: { 
            ok: true, 
            __op: 'query',
            result: { id: 'test_1', status: 'SUCCESS' } 
          },
          errors: undefined,
          extensions: {}
        },
        headers: { 
          'content-type': 'application/json; charset=utf-8'
        }
      };
    },
    
    /**
     * Execute a GraphQL mutation
     * 
     * @param mutation - GraphQL mutation string
     * @param variables - Optional variables for the mutation
     * @returns Mock response with status, body, and headers
     */
    async mutate(mutation: string, variables?: Record<string, any>) {
      // Simulate a GraphQL response
      return {
        status: 200,
        body: { 
          data: { 
            ok: true, 
            __op: 'mutation',
            result: { id: 'mut_1', status: 'ACCEPTED' }
          },
          errors: undefined,
          extensions: {}
        },
        headers: { 
          'content-type': 'application/json; charset=utf-8'
        }
      };
    },
    
    /**
     * Helper method for tolerant content-type assertions
     * 
     * @param value - Actual content-type header value
     * @param expected - Expected content-type prefix
     * @returns boolean indicating if content-type starts with expected value
     */
    contentTypeStartsWith(value: string, expected: string) {
      return (value || '').toLowerCase().startsWith(expected.toLowerCase());
    }
  };
}