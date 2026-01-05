import express from 'express';
import request from 'supertest';
import { evidenceRoutes } from '../../src/conductor/api/evidence-routes.js';
import { describe, test, expect, beforeEach } from '@jest/globals';

const queryMock = jest.fn();

jest.mock('../../src/db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: (...args: any[]) => queryMock(...args),
  }),
}));

describe('evidence export tenant scoping', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/conductor/evidence', evidenceRoutes);

  beforeEach(() => {
    queryMock.mockReset();
  });

  test('rejects export when tenant does not own the run', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'run-1',
          runbook: 'demo',
          status: 'COMPLETED',
          started_at: '2024-01-01T00:00:00Z',
          ended_at: '2024-01-01T01:00:00Z',
          tenant_id: 'tenant-a',
        },
      ],
    });

    const res = await request(app)
      .post('/api/conductor/evidence/export')
      .set('x-tenant-id', 'tenant-b')
      .send({ runId: 'run-1' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TENANT_SCOPE_VIOLATION');
  });
});
