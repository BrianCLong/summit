import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';

const originalEnv = process.env;

describe('POST /exports/:id/verify-watermark', () => {
  let app: Express;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, WATERMARK_VERIFY: 'true' };
    const exportsRouter = (await import('../../routes/exports.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api', exportsRouter);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns a valid result for a matching watermark', async () => {
    const response = await request(app)
      .post('/api/exports/export-123/verify-watermark')
      .send({ artifactId: 'valid-artifact' });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.mismatches).toEqual([]);
    expect(response.body.manifestHash).toContain('abcd1234');
    expect(response.body.observedWatermark.exportId).toBe('export-123');
  });

  it('flags mismatches for tampered artifacts', async () => {
    const response = await request(app)
      .post('/api/exports/export-123/verify-watermark')
      .send({ artifactId: 'tampered-artifact' });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(false);
    expect(response.body.mismatches).toEqual(
      expect.arrayContaining([
        'manifest-hash-mismatch',
        'audit-ledger-manifest-mismatch',
        'policy-hash-mismatch',
      ]),
    );
    expect(response.body.reasonCodes).toEqual(
      expect.arrayContaining([
        'manifest-hash-mismatch',
        'audit-ledger-manifest-mismatch',
        'policy-hash-mismatch',
      ]),
    );
    expect(response.body.observedWatermark.policyHash).toBe('policy-tampered');
  });
});
