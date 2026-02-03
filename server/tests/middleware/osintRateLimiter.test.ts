import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { NextFunction, Request, Response } from 'express';
import { createOsintRateLimiter } from '../../src/middleware/osintRateLimiter';

function createMockResponse() {
  const res: Partial<Response> & {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
  } = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this as Response;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this as Response;
    },
    json(payload: any) {
      this.body = payload;
      return this as Response;
    },
  };

  return res as Response & { statusCode: number; headers: Record<string, string>; body: any };
}

describe('OSINT rate limiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('limits requests per user with sliding window semantics', async () => {
    const middleware = createOsintRateLimiter({ userLimit: 2, ipLimit: 10, windowMs: 1000, redisClient: null });
    const next = jest.fn();

    const request = { ip: '1.1.1.1', user: { id: 'user-1' } } as unknown as Request;

    await middleware(request, createMockResponse(), next as unknown as NextFunction);
    await middleware(request, createMockResponse(), next as unknown as NextFunction);
    const response = createMockResponse();
    await middleware(request, response, next as unknown as NextFunction);

    expect(response.statusCode).toBe(429);
    expect(response.body.scope).toBe('user');
    expect(response.headers['retry-after']).toBeDefined();
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('limits requests per IP when multiple users share an address', async () => {
    const middleware = createOsintRateLimiter({ userLimit: 10, ipLimit: 2, windowMs: 1000, redisClient: null });
    const next = jest.fn();

    const baseRequest = { ip: '2.2.2.2' } as Request;

    await middleware({ ...baseRequest, user: { id: 'user-a' } } as Request, createMockResponse(), next);
    await middleware({ ...baseRequest, user: { id: 'user-b' } } as Request, createMockResponse(), next);
    const response = createMockResponse();
    await middleware({ ...baseRequest, user: { id: 'user-c' } } as Request, response, next);

    expect(response.statusCode).toBe(429);
    expect(response.body.scope).toBe('ip');
    expect(response.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
