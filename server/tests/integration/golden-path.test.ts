import request from 'supertest';
import { createTestHarness, TestHarness } from '../harness.js';
import { jest } from '@jest/globals';

describe('Golden Path Integration', () => {
  let harness: TestHarness;
  let server: any;

  beforeAll(async () => {
    // Mock the Neo4j driver initialization to prevent connection errors in environment without DB
    jest.mock('../../src/db/neo4j.js', () => ({
      initializeNeo4jDriver: jest.fn(),
      getNeo4jDriver: jest.fn(() => ({
        session: () => ({
          run: jest.fn().mockResolvedValue({ records: [] }),
          close: jest.fn(),
        }),
        close: jest.fn(),
      })),
    }));

    harness = await createTestHarness();
    server = harness.app;
  });

  afterAll(async () => {
    await harness.teardown();
  });

  it('Health Check returns 200', async () => {
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  it('GraphQL Introspection works', async () => {
    const res = await request(server)
      .post('/graphql')
      .set(harness.getAuthHeader())
      .send({
        query: `
          query {
            __schema {
              queryType {
                name
              }
            }
          }
        `,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.__schema.queryType.name).toBe('Query');
  });

  it('Metrics endpoint is exposed', async () => {
    const res = await request(server).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});
