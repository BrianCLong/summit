import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { usageLedger } from '../../src/usage/usage-ledger.js';

const describeNetwork =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const mockQuery = jest.fn();

jest.mock('../../src/db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: mockQuery,
  }),
}));

jest.mock('../../src/maestro/evidence/receipt.js', () => ({
  buildProvenanceReceipt: jest.fn(() => ({ receipt: true })),
  canonicalStringify: jest.fn((value) => JSON.stringify(value)),
  EvidenceArtifactRow: {},
  RunEventRow: {},
  RunRow: {},
}));

jest.mock('../../src/conductor/auth/rbac-middleware.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

describeNetwork('receipt usage ledger', () => {
  beforeEach(() => {
    usageLedger.clear();
    mockQuery.mockReset();
  });

  const buildApp = async () => {
    const app = express();
    app.use(express.json());
    const { evidenceRoutes } = await import(
      '../../src/conductor/api/evidence-routes.js'
    );
    app.use('/api', evidenceRoutes);
    return app;
  };

  it('records usage on successful receipt ingestion', async () => {
    mockQuery.mockImplementation((sql: any, params: any[] = []) => {
      const text = typeof sql === 'string' ? sql : sql?.text || '';

      if (text.includes('FROM run WHERE')) {
        return {
          rows: [
            {
              id: params?.[0] || 'run-123',
              runbook: 'rb',
              status: 'complete',
              started_at: new Date(),
              ended_at: new Date(),
            },
          ],
        };
      }

      if (text.includes('FROM run_event')) {
        return { rows: [] };
      }

      if (text.includes('FROM evidence_artifacts')) {
        return { rows: [] };
      }

      return { rows: [], rowCount: 1 };
    });

    const app = await buildApp();
    const res = await request(app)
      .post('/api/receipt')
      .send({ runId: 'run-123', note: 'ignore' });

    expect(res.status).toBe(200);
    const records = usageLedger.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      operationName: 'conductor.receipt.create',
      success: true,
      statusCode: 200,
    });
    expect(records[0].requestSizeBytes).toBeGreaterThan(0);
    expect(records[0].tenantId).toBeUndefined();
    expect(records[0].userId).toBeUndefined();
  });

  it('records usage on validation failure without leaking payload', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/receipt')
      .send({ secret: 'dont log' });

    expect(res.status).toBe(400);
    const records = usageLedger.getRecords();
    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record.success).toBe(false);
    expect(record.errorCategory).toBe('validation');
    expect(record.statusCode).toBe(400);
    expect(record.requestSizeBytes).toBeGreaterThan(0);
    expect(JSON.stringify(record)).not.toContain('secret');
  });
});
