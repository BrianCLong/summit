import request from 'supertest';
import { createApp } from '../src/app.js';

function sign(params: Record<string,string>, secret: string) {
  const base = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

jest.unstable_mockModule('../src/repos/ProvenanceRepo.js', () => ({
  ProvenanceRepo: class {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_pg: any) {}
    async by() {
      return [
        { id: 'e1', kind: 'policy', createdAt: new Date().toISOString(), metadata: { reasonCode: 'OK' } },
      ];
    }
  },
  ProvenanceFilter: {},
}));

describe('GET /export/provenance (success path)', () => {
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
    // Dynamically import after mocks
    const mod = await import('../src/app.js');
    app = await mod.createApp();
  });

  test('returns 200 and JSON payload when signed + tenant ok', async () => {
    const params = { ...baseParams };
    const sig = sign(params, secret);
    const res = await request(app)
      .get('/export/provenance')
      .query({ ...params, sig })
      .set('x-tenant-id', params.tenant);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
