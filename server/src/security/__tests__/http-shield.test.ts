import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import type { Server } from 'http';

jest.mock('../../config.js', () => ({
  cfg: {
    CORS_ORIGIN: 'https://allowed.test',
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: 1000,
    RATE_LIMIT_MAX_AUTHENTICATED: 50,
    RATE_LIMIT_MAX_REQUESTS: 25,
  },
}));

import { buildContentSecurityPolicy } from '../http-shield.js';

const startServer = (app: express.Express) => {
  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
};

describe('buildContentSecurityPolicy', () => {
  it('aligns connect-src with configured CORS origins', async () => {
    const app = express();
    app.use(buildContentSecurityPolicy('https://allowed.test'));
    app.get('/csp', (_req, res) => res.send('ok'));

    const server = await startServer(app);
    try {
      const response = await request(server).get('/csp');
      const cspHeader = response.headers['content-security-policy'];

      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).toContain('connect-src');
      expect(cspHeader).toContain('https://allowed.test');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('sets strict defensive headers', async () => {
    const app = express();
    app.use(buildContentSecurityPolicy());
    app.get('/csp', (_req, res) => res.send('ok'));

    const server = await startServer(app);
    try {
      const response = await request(server).get('/csp');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect(response.headers['x-frame-options']).toBe('DENY');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
