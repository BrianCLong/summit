import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { metricsRoute } from '../metricsRoute';

describe('metricsRoute', () => {
  it('returns a metrics payload with reliability collectors', async () => {
    const app = express();
    app.get('/metrics', metricsRoute);

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.text).toContain('reliability_request_duration_seconds');
    expect(res.headers['content-type']).toContain('text/plain');
  });
});
