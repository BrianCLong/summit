import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import cors from 'cors';
import express from 'express';
import request from 'supertest';

import { buildCorsOptions } from '../cors-options.js';

const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const createApp = (originConfig: string, nodeEnv: string) => {
  const corsOptions = buildCorsOptions({
    CORS_ORIGIN: originConfig,
    NODE_ENV: nodeEnv,
  } as any);

  const app = express();
  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));
  app.get('/ping', (_req, res) => res.json({ ok: true }));
  return app;
};

describeIf('buildCorsOptions', () => {
  it('allows configured origins in production and sets headers', async () => {
    const app = createApp('https://allowed.example,https://cdn.allowed', 'production');

    const res = await request(app)
      .get('/ping')
      .set('Origin', 'https://allowed.example');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://allowed.example',
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('reflects preflight headers for telemetry requests', async () => {
    const app = createApp('https://ui.example', 'production');

    const res = await request(app)
      .options('/ping')
      .set('Origin', 'https://ui.example')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-tenant-id,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-headers']).toMatch(/x-tenant-id/i);
    expect(res.headers['access-control-allow-origin']).toBe('https://ui.example');
  });

  it('rejects unexpected origins in production', async () => {
    const app = createApp('https://allowed.example', 'production');

    const res = await request(app)
      .get('/ping')
      .set('Origin', 'https://malicious.example');

    expect(res.status).toBe(500);
  });
});
