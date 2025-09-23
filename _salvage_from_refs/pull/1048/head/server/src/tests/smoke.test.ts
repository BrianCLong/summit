import request from 'supertest';
import { createApp } from '../app.js'; // Assuming app.ts exports the app

describe('Smoke Test', () => {
  let app;

  beforeAll(async () => {
    app = await createApp();
  });

  it('/health should return 200', async () => {
    const res = await request(app).get('/monitoring/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('UP');
  });

  it('/metrics should return 200', async () => {
    const res = await request(app).get('/monitoring/metrics');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# HELP'); // Prometheus metrics format
  });
});