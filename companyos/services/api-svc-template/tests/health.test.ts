import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/index.js';

describe('health endpoint', () => {
  it('returns ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('api-svc-template');
  });

  it('exposes metrics', async () => {
    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.text).toContain('http_request_duration_seconds');
  });
});
