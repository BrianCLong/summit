import request from 'supertest';
import app from '../src/index';

describe('Predictd Service API', () => {
  it('GET /api/v1/health should respond with a 200', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/signals should respond with a 200 and an empty array of signals', async () => {
    const response = await request(app).get('/api/v1/signals');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ signals: [] });
  });
});
