// Example GraphQL test using the shared test client
// Shows how to replace per-spec mocks with the unified client

import { createGraphQLTestClient } from '../utils/graphqlClient';

describe('GraphQL Contract Tests (Example)', () => {
  let client: any;

  beforeAll(async () => {
    // Initialize the test client
    client = await createGraphQLTestClient();
  });

  it('should execute a basic query', async () => {
    // Example query test
    const response = await client.query(`
      query {
        ok
        version
      }
    `);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ 
      ok: true, 
      version: expect.any(String) 
    });
    
    // Use tolerant content-type assertion
    expect(client.contentTypeStartsWith(
      response.headers['content-type'], 
      'application/json'
    )).toBe(true);
  });

  it('should execute a basic mutation', async () => {
    // Example mutation test
    const response = await client.mutate(`
      mutation {
        ok
        __op
      }
    `);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ 
      ok: true, 
      __op: 'mutation' 
    });
    
    // Use tolerant content-type assertion
    expect(client.contentTypeStartsWith(
      response.headers['content-type'], 
      'application/json'
    )).toBe(true);
  });
});