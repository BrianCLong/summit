import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';

describe('metrics', () => {
  afterAll(async () => {
    await stopObservability();
  });

  it('exposes prometheus metrics', async () => {
    const app = await createApp();
    await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('process_cpu_user_seconds_total');
    expect(res.text).toContain('authz_gateway_requests_total');
    expect(res.text).toContain('authz_gateway_request_duration_seconds');
    expect(res.text).toContain('authz_gateway_active_requests');
  });
});
