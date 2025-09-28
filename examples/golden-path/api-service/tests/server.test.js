import request from 'supertest';
import app from '../src/server.js';

describe('health endpoints', () => {
  it('returns ok for healthz', async () => {
    const response = await request(app).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
