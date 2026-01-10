import express from 'express';
import request from 'supertest';
import { describe, beforeEach, expect, test, jest } from '@jest/globals';
import exportRouter from '../../src/routes/export.js';

const describeNetwork =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const mockBy = jest.fn<(...args: any[]) => Promise<any[]>>();

jest.mock('../../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({})),
}));

jest.mock('../../src/repos/ProvenanceRepo.js', () => ({
  ProvenanceRepo: jest.fn().mockImplementation(() => ({
    by: mockBy,
  })),
}));

function sign(params: Record<string, string>, secret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  // @ts-ignore
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

describeNetwork('provenance export signing and redaction', () => {
  const secret = 'unit-export-secret';
  const baseParams = {
    scope: 'investigation',
    id: 'inv-tenant',
    format: 'json',
    ts: String(Date.now()),
    tenant: 'tenant-1',
    reasonCodeIn: '',
  } as Record<string, string>;

  let app: express.Express;

  beforeEach(() => {
    mockBy.mockReset();
    process.env.EXPORT_SIGNING_SECRET = secret;
    const newApp = express();
    newApp.use('/export', exportRouter);
    app = newApp;
  });

  test('rejects tampered parameters even with previously valid signature', async () => {
    const params: Record<string, string> = {
      ...baseParams,
      ts: String(Date.now()),
    };
    const sig = sign(params, secret);

    const res = await request(app)
      .get('/export/provenance')
      .set('x-tenant-id', params.tenant)
      .query({ ...params, contains: 'exfil', sig });

    expect(res.status).toBe(403);
  });

  test('filters out foreign-tenant rows and redacts identifiers', async () => {
    const params: Record<string, string> = {
      ...baseParams,
      ts: String(Date.now()),
    };
    const sig = sign(params, secret);
    const now = new Date().toISOString();

    mockBy.mockResolvedValue([
      {
        id: 'foreign',
        kind: 'policy',
        createdAt: now,
        tenantId: 'tenant-2',
        metadata: {
          tenantId: 'tenant-2',
          relatedTenant: 'tenant-2',
          nested: { tenant: 'tenant-2' },
        },
      },
      {
        id: 'home',
        kind: 'policy',
        createdAt: now,
        tenantId: 'tenant-1',
        metadata: {
          tenantId: 'tenant-1',
          relatedTenant: 'tenant-1',
          nested: { tenant: 'tenant-2' },
        },
      },
    ]);

    const res = await request(app)
      .get('/export/provenance')
      .set('x-tenant-id', params.tenant)
      .query({ ...params, sig });

    expect(res.status).toBe(200);
    expect(mockBy).toHaveBeenCalledWith(
      'investigation',
      params.id,
      expect.any(Object),
      expect.any(Number),
      expect.any(Number),
      params.tenant,
    );
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].id).toBe('home');
    expect(res.body.data[0].metadata.tenantId).toBe(params.tenant);
    expect(res.body.data[0].metadata.nested.tenant).toBe(
      '[redacted:foreign-tenant]',
    );
  });
});
