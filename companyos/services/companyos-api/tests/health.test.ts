import request from 'supertest';
import express from 'express';
import { healthRoute } from '../src/routes/health';

describe('health route', () => {
  it('returns status ok', async () => {
    const app = express();
    app.get('/health', healthRoute);

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('companyos-api');
  });
});
