/**
 * Smoke Tests for API Endpoints
 * Tests critical paths with golden dataset
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { startTestEnvironment, stopTestEnvironment, loadGoldenDataset, getTestEnvironment } from './setup.js';
import { createApp } from '../../src/index.js'; // Assuming app export

let app: any;
let testEnv: any;

beforeAll(async () => {
  // Start ephemeral databases
  testEnv = await startTestEnvironment();

  // Load golden dataset
  await loadGoldenDataset(testEnv);

  // Create app with test environment
  process.env.DATABASE_URL = testEnv.postgres.connectionString;
  process.env.NEO4J_URI = testEnv.neo4j.uri;
  process.env.NEO4J_USER = 'neo4j';
  process.env.NEO4J_PASSWORD = 'testpassword';
  process.env.REDIS_HOST = testEnv.redis.host;
  process.env.REDIS_PORT = testEnv.redis.port.toString();

  app = await createApp();
}, 60000);

afterAll(async () => {
  await stopTestEnvironment();
}, 30000);

describe('Health Endpoints', () => {
  test('GET /health - should return 200 OK', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  test('GET /health/detailed - should return service status', async () => {
    const response = await request(app).get('/health/detailed');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('neo4j');
    expect(response.body.services).toHaveProperty('postgres');
    expect(response.body.services).toHaveProperty('redis');
  });

  test('GET /health/ready - should be ready', async () => {
    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ready');
  });

  test('GET /health/live - should be alive', async () => {
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'alive');
  });
});

describe('OpenAPI Documentation', () => {
  test('GET /docs - should serve Swagger UI', async () => {
    const response = await request(app).get('/docs');

    expect(response.status).toBe(301); // Redirect to /docs/
  });

  test('GET /docs/openapi.json - should return OpenAPI spec', async () => {
    const response = await request(app).get('/docs/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('openapi', '3.0.0');
    expect(response.body).toHaveProperty('info');
    expect(response.body).toHaveProperty('paths');
    expect(response.body.info).toHaveProperty('title', 'IntelGraph Platform API');
  });
});

describe('Prometheus Metrics', () => {
  test('GET /metrics - should return Prometheus metrics', async () => {
    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('http_requests_total');
    expect(response.text).toContain('http_request_duration_seconds');
  });

  test('GET /metrics/health - should return JSON metrics', async () => {
    const response = await request(app).get('/metrics/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('metrics');
  });
});

describe('Tracing Headers', () => {
  test('should inject X-Request-ID and X-Trace-ID headers', async () => {
    const response = await request(app).get('/health');

    expect(response.headers).toHaveProperty('x-request-id');
    expect(response.headers).toHaveProperty('x-trace-id');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-trace-id']).toBeTruthy();
  });

  test('should preserve client-provided X-Request-ID', async () => {
    const customRequestId = 'test-request-123';
    const response = await request(app)
      .get('/health')
      .set('X-Request-ID', customRequestId);

    expect(response.headers['x-request-id']).toBe(customRequestId);
  });
});

describe('Validation Middleware', () => {
  test('should reject invalid request body', async () => {
    const response = await request(app)
      .post('/api/ai/analyze')
      .send({ invalid: 'data' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Validation failed');
  });
});

describe('Authority Hooks', () => {
  test('AI endpoints should check license', async () => {
    const response = await request(app)
      .post('/api/ai/analyze')
      .send({
        text: 'Test analysis',
        analysisType: 'sentiment'
      });

    // Should require authentication
    expect([401, 403]).toContain(response.status);
  });
});

describe('Database Integration - Golden Dataset', () => {
  test('should query golden dataset from PostgreSQL', async () => {
    const result = await testEnv.postgres.pool.query(
      'SELECT * FROM cases WHERE id = $1',
      ['20000000-0000-0000-0000-000000000001']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('Golden Test Case Alpha');
    expect(result.rows[0].status).toBe('open');
  });

  test('should query golden dataset from Neo4j', async () => {
    const session = testEnv.neo4j.driver.session();
    try {
      const result = await session.run(
        'MATCH (p:Person {id: $id}) RETURN p',
        { id: 'person-001' }
      );

      expect(result.records).toHaveLength(1);
      expect(result.records[0].get('p').properties.name).toBe('John Doe');
    } finally {
      await session.close();
    }
  });

  test('should query golden dataset from Redis', async () => {
    const cached = await testEnv.redis.client.get('cache:entity:person-001');

    expect(cached).toBeTruthy();
    const entity = JSON.parse(cached!);
    expect(entity.name).toBe('John Doe');
    expect(entity.type).toBe('person');
  });
});
