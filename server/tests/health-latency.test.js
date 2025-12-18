const express = require('express');
const request = require('supertest');

function createMonitoringApp() {
  const app = express();
  const monitoringRouter = require('../src/routes/monitoring');

  app.use(express.json());
  app.use('/', monitoringRouter);

  return app;
}

describe('Service health latency budgets', () => {
  let app;

  beforeAll(() => {
    app = createMonitoringApp();
  });

  it('pings the core health endpoint within 2s and returns structured checks', async () => {
    const started = Date.now();
    const response = await request(app).get('/health').timeout(10000);
    const duration = Date.now() - started;

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(504);
    expect(duration).toBeLessThan(2000);
    expect(response.body).toHaveProperty('checks');
    expect(response.body).toHaveProperty('status');
  });

  it('verifies the AI/ML service health endpoint stays under 1.5s', async () => {
    const started = Date.now();
    const response = await request(app).get('/health/ml').timeout(5000);
    const duration = Date.now() - started;

    expect([200, 503]).toContain(response.status);
    expect(duration).toBeLessThan(1500);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
  });
});
