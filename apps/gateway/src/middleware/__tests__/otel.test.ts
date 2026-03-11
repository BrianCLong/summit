import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { otelMiddleware } from '../otel';

const mockSpan = {
  setAttribute: vi.fn(),
  end: vi.fn(),
};

const mockTracer = {
  startSpan: vi.fn().mockReturnValue(mockSpan),
};

const mockContext = {
  active: vi.fn().mockReturnValue('active-context'),
  with: vi.fn((ctx, fn) => fn()),
};

const mockPropagation = {
  extract: vi.fn().mockReturnValue('extracted-context'),
  inject: vi.fn(),
};

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn().mockReturnValue({
      startSpan: vi.fn((name, options) => {
        return global.__mockSpan;
      })
    }),
  },
  context: {
    active: vi.fn(() => 'active-context'),
    with: vi.fn((ctx, fn) => fn()),
  },
  propagation: {
    extract: vi.fn(() => 'extracted-context'),
    inject: vi.fn(),
  },
  SpanKind: { SERVER: 1 },
}));

import { trace, context, propagation } from '@opentelemetry/api';

describe('otelMiddleware', () => {
  let req: Partial<Request>;
  let res: any; // Using any because we need to mock event emitter methods
  let next: NextFunction;

  let currentMockSpan: any;
  let currentMockTracer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    currentMockSpan = {
      setAttribute: vi.fn(),
      end: vi.fn(),
    };

    currentMockTracer = {
      startSpan: vi.fn().mockReturnValue(currentMockSpan),
    };

    (trace.getTracer as any).mockReturnValue(currentMockTracer);

    req = {
      method: 'GET',
      path: '/api/users',
      route: { path: '/api/users' },
      headers: {
        'x-tenant': 'tenant1',
        'x-canary-weight': '50',
      },
    };

    res = {
      statusCode: 200,
      on: vi.fn((event, callback) => {
        if (event === 'finish') {
          res.finishCallback = callback;
        }
        return res;
      }),
    };

    next = vi.fn();

    process.env.SERVICE_NAME = 'test-gateway';
  });

  it('starts a span and propagates context', () => {
    otelMiddleware(req as Request, res as Response, next);

    expect(propagation.extract).toHaveBeenCalledWith('active-context', req.headers);
    expect(context.with).toHaveBeenCalled();

    expect(currentMockTracer.startSpan).toHaveBeenCalledWith('gateway:GET /api/users', expect.objectContaining({
      kind: 1,
      attributes: expect.objectContaining({
        'service.name': 'test-gateway',
        'route.name': '/api/users',
        'tenant.id': 'tenant1',
        'canary.weight': 50,
      }),
    }));

    expect(propagation.inject).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('uses route path if available', () => {
    req.path = '/api/users/123';
    req.route = { path: '/api/users/:id' };

    otelMiddleware(req as Request, res as Response, next);

    expect(currentMockTracer.startSpan).toHaveBeenCalledWith('gateway:GET /api/users/123', expect.objectContaining({
      attributes: expect.objectContaining({
        'route.name': '/api/users/:id',
      }),
    }));
  });

  it('ends span and sets status code when response finishes', () => {
    otelMiddleware(req as Request, res as Response, next);

    res.statusCode = 404;
    res.finishCallback();

    expect(currentMockSpan.setAttribute).toHaveBeenCalledWith('http.status_code', 404);
    expect(currentMockSpan.end).toHaveBeenCalled();
  });
});
