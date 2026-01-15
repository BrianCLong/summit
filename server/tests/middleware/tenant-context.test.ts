import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import tenantContextMiddleware from '../../src/middleware/tenantContext.js';

describe('tenantContextMiddleware', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = { sub: 'user-1', tenant_id: 'tenant-a', roles: ['analyst'] };
      next();
    });
    app.use(tenantContextMiddleware());
    app.get('/api/resources/:tenantId', (req, res) => {
      res.json({
        tenantContext: (req as any).tenantContext,
      });
    });
    return app;
  };

  it('resolves tenant from JWT claim and route parameter', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/resources/tenant-a')
      .set('x-tenant-id', 'tenant-a');

    expect(response.status).toBe(200);
    expect(response.body.tenantContext.tenantId).toBe('tenant-a');
    expect(response.headers['x-tenant-id']).toBe('tenant-a');
  });

  it('rejects mismatched tenant identifiers', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/resources/tenant-b')
      .set('x-tenant-id', 'tenant-a');

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('tenant_context_error');
  });
});
