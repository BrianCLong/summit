import express from 'express';
import request from 'supertest';
import { securityHeaders } from '../securityHeaders.js';

const ORIGINAL_ENV = { ...process.env };

describe('securityHeaders middleware', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const buildApp = () => {
    const app = express();
    app.use(
      securityHeaders({
        allowedOrigins: ['https://allowed.example'],
      }),
    );
    app.get('/test', (_req, res) => res.send('ok'));
    return app;
  };

  it('applies baseline headers when enabled', async () => {
    const res = await request(buildApp()).get('/test');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBe(
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );
  });

  it('can be disabled via SECURITY_HEADERS_ENABLED=false', async () => {
    process.env.SECURITY_HEADERS_ENABLED = 'false';
    const res = await request(buildApp()).get('/test');

    expect(res.headers['x-content-type-options']).toBeUndefined();
    expect(res.headers['x-frame-options']).toBeUndefined();
    expect(res.headers['referrer-policy']).toBeUndefined();
    expect(res.headers['permissions-policy']).toBeUndefined();
  });

  it('supports CSP report-only mode when enabled', async () => {
    process.env.SECURITY_HEADERS_CSP_ENABLED = 'true';
    process.env.SECURITY_HEADERS_CSP_REPORT_ONLY = 'true';

    const res = await request(buildApp()).get('/test');

    expect(res.headers['content-security-policy']).toBeUndefined();
    expect(res.headers['content-security-policy-report-only']).toBeDefined();
  });
});
