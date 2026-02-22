import express from 'express';
import request from 'supertest';
import tenantContextMiddleware from '../../server/src/middleware/tenantContext.js';

describe('Tenant contract enforcement', () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { sub: 'tester', tenant_id: 'tenant-contract' };
    next();
  });
  app.use('/api', tenantContextMiddleware());
  app.get('/api/contracts/:tenantId', (req, res) => {
    res.json({ tenant: (req as any).tenantContext?.tenantId });
  });

  it('denies requests when tenant identifiers do not align', async () => {
    const response = await request(app)
      .get('/api/contracts/other-tenant')
      .set('x-tenant-id', 'tenant-contract');

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('tenant_context_error');
  });

  it('allows matching tenant identifiers', async () => {
    const response = await request(app)
      .get('/api/contracts/tenant-contract')
      .set('x-tenant-id', 'tenant-contract');

    expect(response.status).toBe(200);
    expect(response.body.tenant).toBe('tenant-contract');
  });
});
