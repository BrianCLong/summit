import request from 'supertest';
import { createApp } from '../../src/app'; // Assuming createApp is exported from app.ts

describe('Persisted GraphQL Queries - Contract Check', () => {
  let app: any;
  const appUrl = '/graphql'; // Base path for GraphQL endpoint

  beforeAll(async () => {
    // Set environment variable to enable persisted queries for this test
    process.env.PERSISTED_QUERIES_ENABLED = 'true';
    app = await createApp();
  });

  afterAll(() => {
    // Clean up environment variable
    delete process.env.PERSISTED_QUERIES_ENABLED;
  });

  test('should reject non-persisted queries when flag is enabled', async () => {
    const query = '{ health }'; // A simple, non-persisted query

    const res = await request(app)
      .post(appUrl)
      .send({ query });

    // Expect a 400 Bad Request or a GraphQL error indicating non-persisted query
    expect(res.statusCode).toEqual(200); // GraphQL errors typically return 200
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toContain('PersistedQueryNotFound'); // Or similar error message
  });

  test('should accept persisted queries with valid SHA256 hash', async () => {
    // This test requires a known persisted query and its SHA256 hash.
    // For demonstration, we'll use a dummy hash and assume the server
    // has a mechanism to recognize it. In a real scenario, this hash
    // would come from a pre-generated list of persisted queries.

    const knownQuery = '{ health }';
    // Calculate SHA256 hash of the query string (as it would be sent by client)
    const crypto = require('crypto');
    const sha256Hash = crypto.createHash('sha256').update(knownQuery).digest('hex');

    const res = await request(app)
      .post(appUrl)
      .send({
        operationName: 'HealthQuery', // Optional, but good practice
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: sha256Hash,
          },
        },
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.health).toBeDefined();
    expect(res.body.data.health).toMatch(/ok/i);
  });

  test('should reject persisted queries with invalid SHA256 hash', async () => {
    const knownQuery = '{ health }';
    const invalidSha256Hash = 'invalidhash1234567890abcdef'; // An incorrect hash

    const res = await request(app)
      .post(appUrl)
      .send({
        operationName: 'HealthQuery',
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: invalidSha256Hash,
          },
        },
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toContain('InvalidPersistedQueryHash'); // Or similar error message
  });
});
