import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { buildDbObservabilityRouter } from '../db-observability.js';

describe('db observability router', () => {
  const snapshotMock = jest.fn().mockResolvedValue({
    takenAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    locks: [],
    slowQueries: { source: 'app_slowlog', entries: [] },
    explain: {
      plan: { Plan: { 'Node Type': 'Seq Scan' } },
      queryId: 'q1',
      summary: 'Explain ok',
      sql: 'SELECT 1',
      parameters: [],
    },
    summary: {
      locks: 'No blocking locks detected.',
      slowQueries: 'No slow query samples recorded in the application slow log.',
      explain: 'Explain ok',
      overall: 'No blocking locks detected. No slow query samples recorded in the application slow log. Explain ok',
    },
  });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const role = (req.headers['x-role'] as string) || 'admin';
    (req as any).user = { id: 'user-1', role, tenantId: 'tenant-1' };
    next();
  });
  app.use('/api/admin/db-observability', buildDbObservabilityRouter({ snapshot: snapshotMock } as any));

  it('rejects non-admin users', async () => {
    await request(app)
      .post('/api/admin/db-observability/snapshot')
      .set('x-role', 'analyst')
      .send({})
      .expect(403);
  });

  it('returns snapshot data for admins', async () => {
    const response = await request(app)
      .post('/api/admin/db-observability/snapshot')
      .send({ explain: { queryId: 'q1' } })
      .expect(200);

    expect(response.body.data.summary.explain).toBe('Explain ok');
    expect(snapshotMock).toHaveBeenCalled();
    expect(response.headers['x-dbobservability-limit']).toBeDefined();
  });
});
