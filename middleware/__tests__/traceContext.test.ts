import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';

import * as traceContext from '../traceContext.js';

const { traceContextMiddleware } = traceContext;

describe('traceContextMiddleware', () => {
  const sampleTraceparent =
    '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves the trace id from an incoming traceparent header', () => {
    const req = {
      headers: {
        traceparent: sampleTraceparent,
      },
    } as unknown as Request;

    const headers: Record<string, string> = {};
    const res = {
      setHeader: jest.fn((key: string, value: string) => {
        headers[key] = value;
      }),
    } as unknown as Response;

    const next = jest.fn();

    traceContextMiddleware(req, res, next);

    expect((req as Request & { traceId: string }).traceId).toBe(
      '0123456789abcdef0123456789abcdef',
    );
    expect(headers['x-correlation-id']).toBe('0123456789abcdef0123456789abcdef');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a trace id when none is provided', () => {
    const req = { headers: {} } as unknown as Request;

    const headers: Record<string, string> = {};
    const res = {
      setHeader: jest.fn((key: string, value: string) => {
        headers[key] = value;
      }),
    } as unknown as Response;

    const next = jest.fn();

    traceContextMiddleware(req, res, next);

    const traceId = (req as Request & { traceId: string }).traceId;

    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(headers['x-correlation-id']).toBe(traceId);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
