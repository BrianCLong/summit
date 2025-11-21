import { Request, Response } from 'express';
import {
  deprecated,
  deprecatedWithMetrics,
  sunset,
  getDeprecationMetrics,
  clearDeprecationMetrics,
} from '../../src/middleware/deprecation';

// Mock Express request/response
function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/v1/test',
    method: 'GET',
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  } as Request;
}

function mockResponse(): Response & { _headers: Record<string, string>; _statusCode: number; _json: any } {
  const res: any = {
    _headers: {},
    _statusCode: 200,
    _json: null,
    setHeader(name: string, value: string) {
      this._headers[name] = value;
      return this;
    },
    getHeader(name: string) {
      return this._headers[name];
    },
    status(code: number) {
      this._statusCode = code;
      return this;
    },
    json(data: any) {
      this._json = data;
      return this;
    },
  };
  return res;
}

describe('deprecated middleware', () => {
  beforeEach(() => {
    clearDeprecationMetrics();
  });

  test('sets Deprecation header to true', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    deprecated({
      sunsetDate: '2025-12-31T23:59:59Z',
      logRequests: false,
    })(req, res, next);

    expect(res._headers['Deprecation']).toBe('true');
    expect(next).toHaveBeenCalled();
  });

  test('sets Sunset header with proper date format', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    deprecated({
      sunsetDate: '2025-12-31T23:59:59Z',
      logRequests: false,
    })(req, res, next);

    expect(res._headers['Sunset']).toBe('Wed, 31 Dec 2025 23:59:59 GMT');
    expect(next).toHaveBeenCalled();
  });

  test('sets Link header with successor URL', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    deprecated({
      sunsetDate: '2025-12-31T23:59:59Z',
      successorUrl: '/api/v2/test',
      logRequests: false,
    })(req, res, next);

    expect(res._headers['Link']).toBe('</api/v2/test>; rel="successor-version"');
  });

  test('adds migration guide link when provided', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    deprecated({
      sunsetDate: '2025-12-31T23:59:59Z',
      successorUrl: '/api/v2/test',
      migrationGuide: 'https://docs.example.com/migrate',
      logRequests: false,
    })(req, res, next);

    expect(res._headers['Link']).toContain('rel="successor-version"');
    expect(res._headers['Link']).toContain('rel="help"');
    expect(res._headers['Link']).toContain('https://docs.example.com/migrate');
  });

  test('sets Warning header with deprecation message', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    deprecated({
      sunsetDate: '2025-12-31T23:59:59Z',
      message: 'Custom deprecation message',
      logRequests: false,
    })(req, res, next);

    expect(res._headers['Warning']).toContain('299');
    expect(res._headers['Warning']).toContain('Custom deprecation message');
  });

  test('adds urgency prefix when close to sunset', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    // Set sunset date to 5 days from now
    const sunsetDate = new Date();
    sunsetDate.setDate(sunsetDate.getDate() + 5);

    deprecated({
      sunsetDate: sunsetDate.toISOString(),
      logRequests: false,
    })(req, res, next);

    expect(res._headers['Warning']).toContain('URGENT');
    expect(res._headers['Warning']).toMatch(/\d+ days left/);
  });

  test('throws for invalid sunset date', () => {
    expect(() => deprecated({
      sunsetDate: 'invalid-date',
    })).toThrow('Invalid sunset date');
  });
});

describe('sunset middleware', () => {
  test('returns 410 Gone status', () => {
    const req = mockRequest();
    const res = mockResponse();

    sunset()(req, res);

    expect(res._statusCode).toBe(410);
    expect(res._json.error).toBe('Gone');
    expect(res._json.code).toBe('ENDPOINT_REMOVED');
  });

  test('includes successor URL in response', () => {
    const req = mockRequest();
    const res = mockResponse();

    sunset({
      successorUrl: '/api/v2/test',
      message: 'This endpoint was removed.',
    })(req, res);

    expect(res._json.successorUrl).toBe('/api/v2/test');
    expect(res._json.message).toBe('This endpoint was removed.');
  });

  test('sets Link header for successor', () => {
    const req = mockRequest();
    const res = mockResponse();

    sunset({
      successorUrl: '/api/v2/test',
    })(req, res);

    expect(res._headers['Link']).toBe('</api/v2/test>; rel="successor-version"');
  });

  test('includes documentation URL', () => {
    const req = mockRequest();
    const res = mockResponse();

    sunset({
      documentationUrl: 'https://docs.example.com/deprecations',
    })(req, res);

    expect(res._json.documentation).toBe('https://docs.example.com/deprecations');
  });
});

describe('deprecatedWithMetrics', () => {
  beforeEach(() => {
    clearDeprecationMetrics();
  });

  test('tracks request count', () => {
    const req = mockRequest({ path: '/api/v1/tracked' });
    const res = mockResponse();
    const next = jest.fn();

    const middleware = deprecatedWithMetrics({
      sunsetDate: '2025-12-31T23:59:59Z',
      logRequests: false,
    });

    middleware(req, res, next);
    middleware(req, res, next);
    middleware(req, res, next);

    const metrics = getDeprecationMetrics();
    const tracked = metrics.find(m => m.endpoint === '/api/v1/tracked');

    expect(tracked).toBeDefined();
    expect(tracked!.requestCount).toBe(3);
  });

  test('tracks unique users', () => {
    const middleware = deprecatedWithMetrics({
      sunsetDate: '2025-12-31T23:59:59Z',
      logRequests: false,
    });

    const res = mockResponse();
    const next = jest.fn();

    // Simulate requests from different users
    const req1 = mockRequest({ path: '/api/v1/users' }) as any;
    req1.user = { id: 'user-1' };
    middleware(req1, res, next);

    const req2 = mockRequest({ path: '/api/v1/users' }) as any;
    req2.user = { id: 'user-2' };
    middleware(req2, res, next);

    const req3 = mockRequest({ path: '/api/v1/users' }) as any;
    req3.user = { id: 'user-1' }; // Same user again
    middleware(req3, res, next);

    const metrics = getDeprecationMetrics();
    const tracked = metrics.find(m => m.endpoint === '/api/v1/users');

    expect(tracked).toBeDefined();
    expect(tracked!.requestCount).toBe(3);
    expect(tracked!.uniqueUsers.size).toBe(2);
  });

  test('tracks different endpoints separately', () => {
    const middleware = deprecatedWithMetrics({
      sunsetDate: '2025-12-31T23:59:59Z',
      logRequests: false,
    });

    const res = mockResponse();
    const next = jest.fn();

    middleware(mockRequest({ path: '/api/v1/endpoint-a' }), res, next);
    middleware(mockRequest({ path: '/api/v1/endpoint-a' }), res, next);
    middleware(mockRequest({ path: '/api/v1/endpoint-b' }), res, next);

    const metrics = getDeprecationMetrics();

    expect(metrics).toHaveLength(2);
    expect(metrics.find(m => m.endpoint === '/api/v1/endpoint-a')!.requestCount).toBe(2);
    expect(metrics.find(m => m.endpoint === '/api/v1/endpoint-b')!.requestCount).toBe(1);
  });

  test('clearDeprecationMetrics clears all metrics', () => {
    const middleware = deprecatedWithMetrics({
      sunsetDate: '2025-12-31T23:59:59Z',
      logRequests: false,
    });

    middleware(mockRequest(), mockResponse(), jest.fn());

    expect(getDeprecationMetrics()).toHaveLength(1);

    clearDeprecationMetrics();

    expect(getDeprecationMetrics()).toHaveLength(0);
  });
});
