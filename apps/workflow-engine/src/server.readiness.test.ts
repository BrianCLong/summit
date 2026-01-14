import express from 'express';
import request from 'supertest';
import { registerHealthEndpoints, readinessState } from './health';

const app = express();
registerHealthEndpoints(app);

beforeEach(() => {
  readinessState.ready = false;
  readinessState.postgres = false;
  readinessState.neo4j = false;
  readinessState.redis = false;
  readinessState.workflowService = false;
});

describe('workflow-engine readiness endpoints', () => {
  it('returns ok for /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('workflow-engine');
  });

  it('reports not ready before dependencies initialize', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.dependencies).toEqual({
      postgres: false,
      neo4j: false,
      redis: false,
      workflowService: false,
    });
  });
});
