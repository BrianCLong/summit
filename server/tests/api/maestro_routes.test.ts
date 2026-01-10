// server/tests/api/maestro_routes.test.ts

import request from 'supertest';
import express from 'express';
import { buildMaestroRouter } from '../../src/routes/maestro_routes';
import { Maestro } from '../../src/maestro/core';
import { MaestroQueries } from '../../src/maestro/queries';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/middleware/correlation-id', () => ({
  getCorrelationContext: () => ({
    correlationId: 'corr-id',
    traceId: 'trace-id',
    spanId: 'span-id',
    userId: 'user-ctx',
    tenantId: 'tenant-ctx',
  }),
}));

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('Maestro API routes', () => {
  const maestroRunPipeline = jest.fn();
  const queriesGetRunResponse = jest.fn();
  const queriesGetTaskWithArtifacts = jest.fn();
  const opaAllow = { evaluateQuery: jest.fn() };

  const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).correlationId = 'corr-id';
      (req as any).traceId = 'trace-id';
      (req as any).user = { id: 'user-1', tenantId: 'tenant-1', role: 'user' };
      next();
    });

    const maestro = {
      runPipeline: maestroRunPipeline,
    } as unknown as Maestro;
    const queries = {
      getRunResponse: queriesGetRunResponse,
      getTaskWithArtifacts: queriesGetTaskWithArtifacts,
    } as unknown as MaestroQueries;

    app.use('/api/maestro', buildMaestroRouter(maestro, queries, opaAllow));
    return app;
  };

  beforeEach(() => {
    maestroRunPipeline.mockReset();
    queriesGetRunResponse.mockReset();
    queriesGetTaskWithArtifacts.mockReset();
    opaAllow.evaluateQuery.mockResolvedValue({ allow: true, reason: 'allowed' });
    jest.spyOn(logger, 'info').mockClear?.();
  });

  it('POST /api/maestro/runs returns pipeline result', async () => {
    maestroRunPipeline.mockResolvedValueOnce({
      run: { id: 'run-1', user: { id: 'user-1' }, createdAt: new Date().toISOString(), requestText: 'hello' },
      tasks: [],
      results: [],
      costSummary: {
        runId: 'run-1',
        totalCostUSD: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        byModel: {},
      },
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/maestro/runs')
      .send({ userId: 'user-1', requestText: 'hello' })
      .expect(200);

    expect(res.body.run.id).toBe('run-1');
    expect(maestroRunPipeline).toHaveBeenCalledWith('user-1', 'hello');
  });

  it('GET /api/maestro/runs/:runId returns run response', async () => {
    queriesGetRunResponse.mockResolvedValueOnce({
      run: { id: 'run-1', user: { id: 'user-1' }, createdAt: new Date().toISOString(), requestText: 'hello' },
      tasks: [],
      results: [],
      costSummary: {
        runId: 'run-1',
        totalCostUSD: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        byModel: {},
      },
    });

    const app = createApp();
    const res = await request(app)
      .get('/api/maestro/runs/run-1')
      .expect(200);

    expect(res.body.run.id).toBe('run-1');
    expect(queriesGetRunResponse).toHaveBeenCalledWith('run-1');
  });

  it('GET /api/maestro/runs/:runId returns 404 if not found', async () => {
    queriesGetRunResponse.mockResolvedValueOnce(null);

    const app = createApp();
    const res = await request(app)
      .get('/api/maestro/runs/missing')
      .expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });

  it('evaluates OPA before creating runs and logs decision context', async () => {
    const app = createApp();
    const logSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined as any);
    maestroRunPipeline.mockResolvedValueOnce({
      run: { id: 'run-1', user: { id: 'user-1' }, createdAt: new Date().toISOString(), requestText: 'hello maestro' },
      tasks: [],
      results: [],
      costSummary: {
        runId: 'run-1',
        totalCostUSD: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        byModel: {},
      },
    });

    const response = await request(app)
      .post('/api/maestro/runs')
      .set('x-tenant-id', 'tenant-1')
      .send({ userId: 'user-1', requestText: 'hello maestro' })
      .expect(200);

    expect(response.body.run.id).toBe('run-1');
    expect(opaAllow.evaluateQuery).toHaveBeenCalledWith(
      'maestro/authz/allow',
      expect.objectContaining({
        action: 'maestro.run.create',
        principal: expect.objectContaining({ id: 'user-1', tenantId: 'tenant-1' }),
        resource: expect.objectContaining({ type: 'maestro/run' }),
      }),
    );

    const decisionLog = logSpy.mock.calls.find(
      ([payload]) => payload && (payload as any).event === 'maestro_opa_decision',
    )?.[0] as any;

    expect(decisionLog).toBeDefined();
    expect(decisionLog.traceId).toBeTruthy();
    expect(decisionLog.principalId).toBe('user-1');
    expect(decisionLog.resourceAttributes.method).toBe('post');
    logSpy.mockRestore();
  });

  it('blocks run creation when OPA denies access', async () => {
    opaAllow.evaluateQuery.mockResolvedValueOnce({ allow: false, reason: 'blocked' });
    const app = createApp();

    const res = await request(app)
      .post('/api/maestro/runs')
      .send({ userId: 'user-2', requestText: 'nope' })
      .expect(403);

    expect(res.body.error).toEqual('Forbidden');
    expect(res.body.reason).toEqual('blocked');
    expect(maestroRunPipeline).not.toHaveBeenCalled();
  });
});
