import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import healthRouter from '../../server/src/routes/health.js';

const buildApp = () => {
  const app = express();
  app.use(healthRouter);
  return app;
};

describe('standardized health endpoints', () => {
  const originalEnv = process.env.HEALTH_ENDPOINTS_ENABLED;
  const originalVersion = process.env.APP_VERSION;
  const originalCommit = process.env.GIT_COMMIT;

  beforeEach(() => {
    process.env.HEALTH_ENDPOINTS_ENABLED = 'true';
    process.env.APP_VERSION = '1.2.3-test';
    process.env.GIT_COMMIT = 'abc123';
  });

  afterEach(() => {
    process.env.HEALTH_ENDPOINTS_ENABLED = originalEnv;
    process.env.APP_VERSION = originalVersion;
    process.env.GIT_COMMIT = originalCommit;
  });

  it('returns liveness details on /healthz', async () => {
    const app = buildApp();

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        environment: expect.any(String),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      })
    );
  });

  it('returns shallow readiness details on /readyz', async () => {
    const app = buildApp();

    const response = await request(app).get('/readyz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ready',
        checks: {
          database: 'skipped',
          cache: 'skipped',
          messaging: 'skipped',
        },
        message: expect.stringContaining('Shallow readiness probe'),
      })
    );
  });

  it('returns service metadata on /status', async () => {
    const app = buildApp();

    const response = await request(app).get('/status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        version: '1.2.3-test',
        commit: 'abc123',
        startedAt: expect.any(String),
      })
    );
  });

  it('returns disabled indicator when feature flag is off', async () => {
    process.env.HEALTH_ENDPOINTS_ENABLED = 'false';
    const app = buildApp();

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'disabled',
        reason: expect.stringContaining('HEALTH_ENDPOINTS_ENABLED'),
      })
    );
  });
});
