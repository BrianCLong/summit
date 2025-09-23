import request from 'supertest';
import { createApp } from '../src/app.js';

function sign(params: Record<string,string>, secret: string) {
  const base = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  // @ts-ignore
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

describe('GET /export/provenance', () => {
  const secret = 'test-secret';
  const baseParams = {
    scope: 'investigation',
    id: 'inv1',
    format: 'json',
    ts: String(Date.now()),
    tenant: 'tenant-1',
    reasonCodeIn: '',
  } as Record<string,string>;

  let app: any;
  beforeAll(async () => {
    process.env.EXPORT_SIGNING_SECRET = secret;
    app = await createApp();
  });

  test('400 when tenant missing', async () => {
    const params = { ...baseParams };
    const sig = sign(params, secret);
    const res = await request(app).get('/export/provenance').query({ ...params, sig }).set('x-tenant-id', '');
    expect(res.status).toBe(400);
  });

  test('403 when tenant mismatch', async () => {
    const params = { ...baseParams };
    const sig = sign(params, secret);
    const res = await request(app).get('/export/provenance').query({ ...params, sig }).set('x-tenant-id', 'wrong');
    expect(res.status).toBe(403);
  });

  test('403 when signature invalid', async () => {
    const params = { ...baseParams };
    const res = await request(app).get('/export/provenance').query({ ...params, sig: 'bad' }).set('x-tenant-id', params.tenant);
    expect(res.status).toBe(403);
  });

  test('403 when expired', async () => {
    const params = { ...baseParams, ts: String(Date.now() - 16 * 60 * 1000) };
    const sig = sign(params, secret);
    const res = await request(app).get('/export/provenance').query({ ...params, sig }).set('x-tenant-id', params.tenant);
    expect(res.status).toBe(403);
  });
});
