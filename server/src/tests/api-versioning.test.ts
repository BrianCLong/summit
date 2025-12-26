import express from 'express';
import request from 'supertest';
import {
  DEFAULT_VERSION,
  SUPPORTED_VERSIONS,
  apiVersioningMiddleware,
  buildVersionResponse,
} from '../middleware/api-versioning.js';

const buildApp = () => {
  const app = express();
  app.use(apiVersioningMiddleware);
  app.get('/test', (req, res) => {
    res.json({ version: (req as any).apiVersion });
  });
  app.get('/version', (_req, res) => res.json(buildVersionResponse()));
  return app;
};

describe('apiVersioningMiddleware', () => {
  test('defaults to v1 when header missing', async () => {
    const app = buildApp();
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(DEFAULT_VERSION);
  });

  test('rejects unknown versions', async () => {
    const app = buildApp();
    const res = await request(app).get('/test').set('X-API-Version', 'v9');
    expect(res.status).toBe(400);
    expect(res.body.supported).toEqual(SUPPORTED_VERSIONS);
  });

  test('propagates requested version and headers', async () => {
    const app = buildApp();
    const res = await request(app).get('/test').set('X-API-Version', 'v2');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('v2');
    expect(res.headers['x-api-deprecation-notice']).toBeDefined();
  });

  test('version endpoint lists supported versions', async () => {
    const app = buildApp();
    const res = await request(app).get('/version');
    expect(res.status).toBe(200);
    expect(res.body.supported).toEqual(SUPPORTED_VERSIONS);
    expect(res.body.default).toBe(DEFAULT_VERSION);
  });
});
