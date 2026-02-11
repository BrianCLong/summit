import request from 'supertest';
import { app } from '../cmd/server.js';

describe('Server', () => {
  it('should return 200 OK for healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should return 200 OK for readyz', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ready: true });
  });
});
