import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import {
  canonicalStringify,
  hashCanonical,
  signReceiptPayload,
} from '../../../maestro/evidence/receipt.js';
import { evidenceRoutes } from '../evidence-routes.js';

jest.mock('../../auth/rbac-middleware.js', () => {
  const allow = (permission: string) => (req: any, res: any, next: any) => {
    if (req.headers[`x-allow-${permission}`]) {
      req.user = { userId: 'user-1', permissions: [permission] };
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions', required: permission });
  };
  return {
    requirePermission: allow,
    authenticateUser: (_req: any, _res: any, next: any) => next(),
  };
});

const queryMock = jest.fn();

jest.mock('../../../db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: (...args: any[]) => queryMock(...args),
  }),
}));

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('evidence receipt routes', () => {
  const app = express();
  app.use('/api/conductor/evidence', evidenceRoutes);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-02T00:00:00Z'));
    process.env.EVIDENCE_SIGNING_SECRET = 'test-secret';
    queryMock.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('canonical hashing is deterministic', () => {
    const a = { b: 1, a: [{ z: 2, y: 3 }] };
    const b = { a: [{ y: 3, z: 2 }], b: 1 };

    const hashA = hashCanonical(a);
    const hashB = hashCanonical(b);

    expect(hashA).toEqual(hashB);
  });

  test('signature verification matches HMAC computation', () => {
    const payload = { receiptId: 'r1', runId: 'run', codeDigest: 'abc' };
    const secret = 'secret-value';

    const signature = signReceiptPayload(payload, secret);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(canonicalStringify(payload))
      .digest('base64url');

    expect(signature).toEqual(expected);
  });

  test('POST /receipt stores artifact and returns receipt', async () => {
    const runRow = {
      id: 'run-1',
      runbook: 'demo',
      status: 'COMPLETED',
      started_at: '2024-01-01T00:00:00Z',
      ended_at: '2024-01-01T01:00:00Z',
    };
    const events = [
      {
        kind: 'schedule.dispatched',
        payload: { schedule: 'nightly' },
        ts: '2024-01-01T00:00:00Z',
      },
    ];
    const artifacts = [
      {
        id: 'artifact-1',
        artifact_type: 'log',
        sha256_hash: 'abc123',
        created_at: '2024-01-01T00:10:00Z',
      },
    ];

    queryMock
      .mockResolvedValueOnce({ rows: [runRow] })
      .mockResolvedValueOnce({ rows: events })
      .mockResolvedValueOnce({ rows: artifacts })
      .mockResolvedValue({ rows: [] });

    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('receipt-uuid')
      .mockReturnValueOnce('artifact-uuid');

    const res = await request(app)
      .post('/api/conductor/evidence/receipt')
      .set('x-allow-evidence:create', '1')
      .send({ runId: 'run-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.artifactId).toBe('artifact-uuid');

    const receipt = res.body.data.receipt;
    const recomputedSignature = crypto
      .createHmac('sha256', 'test-secret')
      .update(canonicalStringify({ ...receipt, signature: undefined }))
      .digest('base64url');

    expect(receipt.signature).toEqual(recomputedSignature);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO evidence_artifacts'),
      expect.arrayContaining(['artifact-uuid', 'run-1']),
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO evidence_artifact_content'),
      expect.arrayContaining(['artifact-uuid']),
    );
  });

  test('GET /receipt/:runId returns stored receipt', async () => {
    const receipt = { hello: 'world' };
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'artifact-uuid' }] })
      .mockResolvedValueOnce({ rows: [{ content: Buffer.from(JSON.stringify(receipt)) }] });

    const res = await request(app)
      .get('/api/conductor/evidence/receipt/run-1')
      .set('x-allow-evidence:read', '1');

    expect(res.status).toBe(200);
    expect(res.body.data.receipt).toEqual(receipt);
  });

  test('GET /receipt/:runId returns 404 when missing', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/conductor/evidence/receipt/run-unknown')
      .set('x-allow-evidence:read', '1');

    expect(res.status).toBe(404);
  });

  test('RBAC denies when permission missing', async () => {
    const res = await request(app)
      .post('/api/conductor/evidence/receipt')
      .send({ runId: 'run-1' });

    expect(res.status).toBe(403);
  });
});
