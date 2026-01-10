import express from 'express';
import request from 'supertest';
import { buildMaestroRouter } from '../../server/src/routes/maestro_routes';

describe('API contract: maestro run summaries', () => {
  const buildApp = (decision: { allow: boolean; reason?: string }) => {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = {
        id: 'user-1',
        role: 'analyst',
        tenantId: 'tenant-abc',
      };
      next();
    });

    const maestro = {
      runPipeline: jest.fn(),
    } as any;
    const queries = {
      getRunSummaries: jest.fn(),
    } as any;
    const opa = {
      evaluateQuery: jest.fn().mockResolvedValue(decision),
    };

    app.use('/api/maestro', buildMaestroRouter(maestro, queries, opa));
    return { app, queries, opa };
  };

  it('returns run summaries and redacts request text', async () => {
    const { app, queries } = buildApp({ allow: true });
    queries.getRunSummaries.mockResolvedValue([
      {
        id: 'run-1',
        status: 'succeeded',
        tenantId: 'tenant-abc',
        createdAt: '2026-01-02T09:00:00Z',
        updatedAt: '2026-01-02T09:10:00Z',
        stepCount: 2,
        receiptCount: 1,
        requestText: 'sensitive prompt',
      },
    ]);

    const res = await request(app)
      .get('/api/maestro/runs?tenant=tenant-abc&status=succeeded')
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toEqual(
      expect.objectContaining({
        id: 'run-1',
        status: 'succeeded',
        tenantId: 'tenant-abc',
        createdAt: '2026-01-02T09:00:00Z',
        updatedAt: '2026-01-02T09:10:00Z',
        stepCount: 2,
        receiptCount: 1,
      }),
    );
    expect(res.body.items[0].requestText).toBeUndefined();
  });

  it('denies access when OPA blocks the run summaries', async () => {
    const { app } = buildApp({ allow: false, reason: 'policy_blocked' });

    const res = await request(app)
      .get('/api/maestro/runs?tenant=tenant-abc&status=succeeded')
      .expect(403);

    expect(res.body).toEqual({
      error: 'Forbidden',
      reason: 'policy_blocked',
    });
  });
});
