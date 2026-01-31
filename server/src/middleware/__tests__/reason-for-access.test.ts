import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createReasonForAccessMiddleware } from '../reason-for-access.js';
import { ForbiddenError } from 'apollo-server-express';

const requestFactory = (overrides: Record<string, any> = {}) => {
  const headers = overrides.headers ?? {};
  return {
    headers,
    path: '/',
    get: (name: string) => headers[name.toLowerCase()],
    ...overrides,
  };
};

const responseFactory = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
});

const nextFactory = () => jest.fn();

describe('reason-for-access middleware', () => {
  const baseConfig = {
    enabled: true,
    minLength: 10,
    sensitiveRoutes: ['/api/provenance', '/graphql'],
  };

  let next: ReturnType<typeof nextFactory>;

  beforeEach(() => {
    next = nextFactory();
  });

  it('skips when feature flag disabled', async () => {
    const middleware = createReasonForAccessMiddleware({ ...baseConfig, enabled: false });
    const req = requestFactory({ path: '/api/provenance/data' });
    const res = responseFactory();

    await middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows non-sensitive routes', async () => {
    const middleware = createReasonForAccessMiddleware(baseConfig);
    const req = requestFactory({ path: '/api/health' });
    const res = responseFactory();

    await middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects missing header on sensitive routes', async () => {
    const middleware = createReasonForAccessMiddleware(baseConfig);
    const req = requestFactory({ path: '/api/provenance/query' });
    const res = responseFactory();

    await middleware(req as any, res as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as ForbiddenError;
    expect(err.message).toMatch(/required/);
  });

  it('rejects too-short reasons', async () => {
    const middleware = createReasonForAccessMiddleware(baseConfig);
    const req = requestFactory({
      path: '/graphql',
      headers: { 'x-reason-for-access': 'short' },
    });
    const res = responseFactory();

    await middleware(req as any, res as any, next);

    const err = next.mock.calls[0][0] as ForbiddenError;
    expect(err.message).toMatch(/at least/);
  });

  it('allows valid header and attaches to request', async () => {
    const middleware = createReasonForAccessMiddleware(baseConfig);
    const req = requestFactory({
      path: '/graphql',
      headers: { 'x-reason-for-access': 'Investigating case 12345' },
    });
    const res = responseFactory();

    await middleware(req as any, res as any, next);

    expect((req as any).reasonForAccess).toBe('Investigating case 12345');
    expect(next).toHaveBeenCalledWith();
  });
});
