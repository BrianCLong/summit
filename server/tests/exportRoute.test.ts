import request from 'supertest';
import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import crypto from 'crypto';

const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? describe.skip : describe;

function sign(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

describeIf('GET /export/provenance', () => {
  const secret = 'test-secret';
  const baseParams = {
    scope: 'investigation',
    id: 'inv1',
    format: 'json',
    ts: String(Date.now()),
    tenant: 'tenant-1',
    reasonCodeIn: '',
  } as Record<string, string>;

  let app: any;
  beforeAll(async () => {
    process.env.EXPORT_SIGNING_SECRET = secret;
    jest.resetModules();
    const { createApp } = await import('../src/app.js');
    app = await createApp();
  });

  test('400 when tenant missing', async () => {
    const params: typeof baseParams = { ...baseParams };
    const sig = sign(params, secret);
    const res = await request(app)
      .get('/export/provenance')
      .query({ ...params, sig })
      .set('x-tenant-id', '');
    expect(res.status).toBe(400);
  });

  test('403 when tenant mismatch', async () => {
    const params: typeof baseParams = { ...baseParams };
    const sig = sign(params, secret);
    const res = await request(app)
      .get('/export/provenance')
      .query({ ...params, sig })
      .set('x-tenant-id', 'wrong');
    expect(res.status).toBe(403);
  });

  test('403 when signature invalid', async () => {
    const params: typeof baseParams = { ...baseParams };
    const res = await request(app)
      .get('/export/provenance')
      .query({ ...params, sig: 'bad' })
      .set('x-tenant-id', params.tenant);
    expect(res.status).toBe(403);
  });

  test('403 when expired', async () => {
    const params: typeof baseParams = {
      ...baseParams,
      ts: String(Date.now() - 16 * 60 * 1000),
    };
    const sig = sign(params, secret);
    const res = await request(app)
      .get('/export/provenance')
      .query({ ...params, sig })
      .set('x-tenant-id', params.tenant);
    expect(res.status).toBe(403);
  });
});
