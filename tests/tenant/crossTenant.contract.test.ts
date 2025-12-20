import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { Application } from 'express';
import { createApp } from '../../server/src/app';
import { JWT_SECRET } from '../../server/src/lib/auth';

describe('Tenant contract tests', () => {
  let app: Application;

  beforeAll(async () => {
    app = await createApp();
  });

  const signToken = (tenantId: string) =>
    jwt.sign({ tenantId, sub: 'contract-user' }, JWT_SECRET);

  it('denies access when header tenant differs from token tenant', async () => {
    const token = signToken('tenant-x');

    const res = await request(app)
      .get('/metrics') // protected by tenant middleware for API paths
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant-y');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Tenant context mismatch/);
  });
});
