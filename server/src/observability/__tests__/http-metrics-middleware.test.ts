import express from 'express';
import request from 'supertest';
import { httpMetricsMiddleware } from '../http-metrics-middleware.js';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  resetMetrics,
  sloAvailability,
} from '../metrics.js';

describe('httpMetricsMiddleware', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('records request totals, durations, and SLO gauges', async () => {
    const app = express();
    app.use(httpMetricsMiddleware);
    app.get('/observability', async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      res.send('ok');
    });
    app.get('/observability-error', (_req, res) => {
      res.status(500).send('boom');
    });

    await request(app).get('/observability');
    await request(app).get('/observability-error');

    const totals = httpRequestsTotal.get().values;
    const successTotal = totals.find(
      (value) => value.labels.route === '/observability',
    );
    expect(successTotal?.value).toBe(1);

    const histogram = httpRequestDurationSeconds.get().values.find(
      (value) => value.labels.route === '/observability',
    );
    expect(histogram?.value ?? 0).toBeGreaterThan(0);

    const sloGauge = sloAvailability.get().values[0];
    expect(sloGauge.value).toBe(50);
  });
});

