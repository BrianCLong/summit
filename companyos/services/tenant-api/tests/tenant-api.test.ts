/**
 * CompanyOS Tenant API - Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Mock the database pool before importing app
vi.mock('../src/db/postgres.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [{ '1': 1 }] }),
      release: vi.fn(),
    }),
  },
  healthCheck: vi.fn().mockResolvedValue(true),
  closePool: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import app from '../src/index.js';
import { pool } from '../src/db/postgres.js';

describe('Tenant API', () => {
  describe('Health Endpoints', () => {
    it('GET /health returns healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'tenant-api');
    });

    it('GET /healthz returns ok', async () => {
      const response = await request(app).get('/healthz');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it('GET /health/live returns live status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ live: true });
    });

    it('GET /health/detailed returns detailed status', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Metrics Endpoint', () => {
    it('GET /metrics returns prometheus format', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('GraphQL API', () => {
    it('POST /graphql handles health check query', async () => {
      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            query {
              _health {
                status
                timestamp
                version
              }
            }
          `,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.data._health).toHaveProperty('status');
    });

    it('POST /graphql handles tenant query with mock data', async () => {
      const mockTenant = {
        id: 'test-tenant-id',
        name: 'Test Tenant',
        slug: 'test-tenant',
        description: 'A test tenant',
        data_region: 'us-east-1',
        classification: 'unclassified',
        status: 'active',
        is_active: true,
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as any).mockResolvedValueOnce({ rows: [mockTenant] });

      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            query GetTenant($id: ID!) {
              tenant(id: $id) {
                id
                name
                slug
                status
              }
            }
          `,
          variables: { id: 'test-tenant-id' },
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });

    it('POST /graphql handles create tenant mutation', async () => {
      const mockTenant = {
        id: 'new-tenant-id',
        name: 'New Tenant',
        slug: 'new-tenant',
        description: 'A new tenant',
        data_region: 'us-east-1',
        classification: 'unclassified',
        status: 'active',
        is_active: true,
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock tenant creation
      (pool.query as any).mockResolvedValueOnce({ rows: [mockTenant] });
      // Mock audit log creation
      (pool.query as any).mockResolvedValueOnce({ rows: [{ id: 'audit-id' }] });

      const response = await request(app)
        .post('/graphql')
        .send({
          query: `
            mutation CreateTenant($input: CreateTenantInput!) {
              createTenant(input: $input) {
                id
                name
                slug
              }
            }
          `,
          variables: {
            input: {
              name: 'New Tenant',
              slug: 'new-tenant',
            },
          },
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });
  });
});

describe('Auth Context', () => {
  it('stub identity middleware adds dev user in non-production', async () => {
    const response = await request(app)
      .get('/health/detailed')
      .set('Authorization', 'Bearer test-token')
      .set('x-user-id', 'test-user')
      .set('x-user-email', 'test@example.com');

    expect(response.status).toBe(200);
  });
});
