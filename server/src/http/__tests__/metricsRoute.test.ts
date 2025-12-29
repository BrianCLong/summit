import express from 'express';
import request from 'supertest';
import { metricsRoute } from '../metricsRoute';
import { requestCounter, resetRegistryMetrics } from '../../metrics/registry.js';

describe('metricsRoute', () => {
  beforeEach(() => {
    resetRegistryMetrics();
  });

  afterEach(() => {
    delete process.env.METRICS_ENDPOINT_ENABLED;
  });

  it('returns JSON metrics when enabled', async () => {
    process.env.METRICS_ENDPOINT_ENABLED = 'true';
    const app = express();
    app.get('/metrics', metricsRoute);

    requestCounter.inc({ route: 'test', method: 'GET', status: '200', tenant: 'demo' });

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('metrics');
    expect(Array.isArray(res.body.metrics)).toBe(true);
    expect(res.headers['content-type']).toContain('application/json');
  });

  it('returns disabled response when flag is false', async () => {
    delete process.env.METRICS_ENDPOINT_ENABLED;
    const app = express();
    app.get('/metrics', metricsRoute);

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Metrics endpoint disabled');
  });
});
