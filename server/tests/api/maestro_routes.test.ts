// server/tests/api/maestro_routes.test.ts

import request from 'supertest';
import express from 'express';
import { buildMaestroRouter } from '../../src/routes/maestro_routes';
import { Maestro } from '../../src/maestro/core';
import { MaestroQueries } from '../../src/maestro/queries';

describe('Maestro API routes', () => {
  const maestroRunPipeline = jest.fn();
  const queriesGetRunResponse = jest.fn();
  const queriesGetTaskWithArtifacts = jest.fn();

  const app = express();
  app.use(express.json());

  const maestro = {
    runPipeline: maestroRunPipeline,
  } as unknown as Maestro;
  const queries = {
    getRunResponse: queriesGetRunResponse,
    getTaskWithArtifacts: queriesGetTaskWithArtifacts,
  } as unknown as MaestroQueries;

  app.use('/api/maestro', buildMaestroRouter(maestro, queries));

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

    const res = await request(app)
      .get('/api/maestro/runs/run-1')
      .expect(200);

    expect(res.body.run.id).toBe('run-1');
    expect(queriesGetRunResponse).toHaveBeenCalledWith('run-1');
  });

  it('GET /api/maestro/runs/:runId returns 404 if not found', async () => {
    queriesGetRunResponse.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/maestro/runs/missing')
      .expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });
});
