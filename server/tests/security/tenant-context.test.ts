import express from 'express';
import request from 'supertest';
import tenant from '../../src/middleware/tenant.js';

describe('tenant middleware', () => {
  it('rejects requests without tenant context when strict', async () => {
    const app = express();

    app.get('/protected', tenant(), (_req, res) => {
      res.json({ ok: true });
    });

    const response = await request(app).get('/protected');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('tenant_required');
  });

  it('attaches tenant context when header and auth are present', async () => {
    const app = express();

    app.use((req, _res, next) => {
      (req as any).user = {
        id: 'user-123',
        roles: ['analyst'],
      };
      next();
    });

    app.get('/protected', tenant(), (req, res) => {
      res.json({ tenant: req.tenant });
    });

    const response = await request(app)
      .get('/protected')
      .set('x-tenant-id', 'tenant-abc');

    expect(response.status).toBe(200);
    expect(response.body.tenant).toEqual({
      tenantId: 'tenant-abc',
      roles: ['analyst'],
      subject: 'user-123',
    });
  });
});
