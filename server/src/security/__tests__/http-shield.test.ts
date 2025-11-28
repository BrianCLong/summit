import express from 'express';
import request from 'supertest';

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

describe('buildContentSecurityPolicy', () => {
  it('aligns connect-src with configured CORS origins', async () => {
    const app = express();
    app.use(buildContentSecurityPolicy());
    app.get('/csp', (_req, res) => res.send('ok'));

    const response = await request(app).get('/csp');
    const cspHeader = response.headers['content-security-policy'];

    expect(cspHeader).toContain("default-src 'self'");
    expect(cspHeader).toContain('connect-src');
    expect(cspHeader).toContain('https://allowed.test');
  });

  it('sets strict defensive headers', async () => {
    const app = express();
    app.use(buildContentSecurityPolicy());
    app.get('/csp', (_req, res) => res.send('ok'));

    const response = await request(app).get('/csp');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });
});
