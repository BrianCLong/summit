import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { securityHeaders } from '../securityHeaders.js';

const ORIGINAL_ENV = { ...process.env };

const runMiddleware = async (envOverrides: Record<string, string | undefined> = {}) => {
  process.env = { ...ORIGINAL_ENV, ...envOverrides };
  const req = {
    path: '/test',
    method: 'GET',
    headers: {},
  } as any;
  const headers: Record<string, string> = {};
  const res = {
    setHeader: (key: string, value: string) => {
      headers[key.toLowerCase()] = value;
    },
    getHeader: (key: string) => headers[key.toLowerCase()],
    removeHeader: (key: string) => {
      delete headers[key.toLowerCase()];
    },
  } as any;
  const handler = securityHeaders({
    allowedOrigins: ['https://allowed.example'],
  });

  await new Promise<void>((resolve, reject) => {
    handler(req, res, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  return headers;
};

describe('securityHeaders middleware', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('applies baseline headers when enabled', async () => {
    const headers = await runMiddleware();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  it('can be disabled via SECURITY_HEADERS_ENABLED=false', async () => {
    const headers = await runMiddleware({ SECURITY_HEADERS_ENABLED: 'false' });

    expect(headers['x-content-type-options']).toBeUndefined();
    expect(headers['x-frame-options']).toBeUndefined();
    expect(headers['referrer-policy']).toBeUndefined();
  });

  it('supports CSP report-only mode when enabled', async () => {
    const headers = await runMiddleware({
      SECURITY_HEADERS_CSP_ENABLED: 'true',
      SECURITY_HEADERS_CSP_REPORT_ONLY: 'true',
    });

    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['content-security-policy-report-only']).toBeDefined();
  });
});
