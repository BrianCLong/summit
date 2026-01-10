import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { tenantContextMiddleware } from '../../src/middleware/tenantContext';
import { JWT_SECRET } from '../../src/lib/auth';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('tenantContextMiddleware', () => {
  const buildApp = () => {
    const app = express();
    app.use(tenantContextMiddleware());
    app.get('/test', (req, res) => {
      res.json({ tenantId: (req as any).tenantId });
    });
    return app;
  };

  const signToken = (payload: Record<string, unknown>) =>
    jwt.sign(payload, JWT_SECRET);

  it('extracts tenant from JWT when header is absent', async () => {
    const app = buildApp();
    const token = signToken({ tenantId: 'tenant-a', sub: 'user-1' });

    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.tenantId).toBe('tenant-a');
  });

  it('rejects mismatched tenant between header and JWT claim', async () => {
    const app = buildApp();
    const token = signToken({ tenantId: 'tenant-b', sub: 'user-1' });

    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant-a')
      .expect(403);

    expect(res.body.error).toMatch(/Tenant context mismatch/);
  });
});
