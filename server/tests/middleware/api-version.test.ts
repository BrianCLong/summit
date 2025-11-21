import { Request, Response, NextFunction } from 'express';
import {
  apiVersionMiddleware,
  requireVersion,
  requireVersionRange,
  parseVersion,
  compareVersions,
  VersionedRequest
} from '../../src/middleware/api-version';

// Mock Express request/response
function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/test',
    method: 'GET',
    headers: {},
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

describe('parseVersion', () => {
  test('parses full version string with v prefix', () => {
    const result = parseVersion('v2.1.3');
    expect(result).toEqual({ major: 2, minor: 1, patch: 3, raw: 'v2.1.3' });
  });

  test('parses full version string without v prefix', () => {
    const result = parseVersion('2.1.3');
    expect(result).toEqual({ major: 2, minor: 1, patch: 3, raw: 'v2.1.3' });
  });

  test('parses major.minor version', () => {
    const result = parseVersion('v2.1');
    expect(result).toEqual({ major: 2, minor: 1, patch: 0, raw: 'v2.1.0' });
  });

  test('parses major-only version', () => {
    const result = parseVersion('v3');
    expect(result).toEqual({ major: 3, minor: 0, patch: 0, raw: 'v3.0.0' });
  });

  test('returns null for invalid version string', () => {
    expect(parseVersion('invalid')).toBeNull();
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('v')).toBeNull();
    expect(parseVersion('abc.def.ghi')).toBeNull();
  });
});

describe('compareVersions', () => {
  test('returns 0 for equal versions', () => {
    const a = { major: 2, minor: 1, patch: 3, raw: 'v2.1.3' };
    const b = { major: 2, minor: 1, patch: 3, raw: 'v2.1.3' };
    expect(compareVersions(a, b)).toBe(0);
  });

  test('compares by major version first', () => {
    const a = { major: 1, minor: 9, patch: 9, raw: 'v1.9.9' };
    const b = { major: 2, minor: 0, patch: 0, raw: 'v2.0.0' };
    expect(compareVersions(a, b)).toBe(-1);
    expect(compareVersions(b, a)).toBe(1);
  });

  test('compares by minor version when major is equal', () => {
    const a = { major: 2, minor: 1, patch: 9, raw: 'v2.1.9' };
    const b = { major: 2, minor: 2, patch: 0, raw: 'v2.2.0' };
    expect(compareVersions(a, b)).toBe(-1);
    expect(compareVersions(b, a)).toBe(1);
  });

  test('compares by patch version when major and minor are equal', () => {
    const a = { major: 2, minor: 1, patch: 3, raw: 'v2.1.3' };
    const b = { major: 2, minor: 1, patch: 4, raw: 'v2.1.4' };
    expect(compareVersions(a, b)).toBe(-1);
    expect(compareVersions(b, a)).toBe(1);
  });
});

describe('apiVersionMiddleware', () => {
  test('extracts version from URL path', () => {
    const req = mockRequest({ path: '/api/maestro/v2/runs' });
    const res = mockResponse();
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    const versionedReq = req as VersionedRequest;
    expect(versionedReq.apiVersion).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
      raw: 'v2.0.0'
    });
    expect(res._headers['API-Version']).toBe('v2.0.0');
    expect(next).toHaveBeenCalled();
  });

  test('extracts version from API-Version header', () => {
    const req = mockRequest({
      path: '/api/test',
      headers: { 'api-version': 'v3.2.1' }
    });
    const res = mockResponse();
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    const versionedReq = req as VersionedRequest;
    expect(versionedReq.apiVersion).toEqual({
      major: 3,
      minor: 2,
      patch: 1,
      raw: 'v3.2.1'
    });
    expect(res._headers['API-Version']).toBe('v3.2.1');
    expect(next).toHaveBeenCalled();
  });

  test('uses path version major with header minor/patch', () => {
    const req = mockRequest({
      path: '/api/service/v2/endpoint',
      headers: { 'api-version': 'v2.5.3' }
    });
    const res = mockResponse();
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    const versionedReq = req as VersionedRequest;
    expect(versionedReq.apiVersion).toEqual({
      major: 2,
      minor: 5,
      patch: 3,
      raw: 'v2.5.3'
    });
  });

  test('defaults to v1.0.0 when no version specified', () => {
    const req = mockRequest({ path: '/api/test' });
    const res = mockResponse();
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    const versionedReq = req as VersionedRequest;
    expect(versionedReq.apiVersion).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      raw: 'v1.0.0'
    });
  });
});

describe('requireVersion', () => {
  test('allows requests meeting minimum version', () => {
    const req = mockRequest({ path: '/api/service/v2/endpoint' }) as VersionedRequest;
    req.apiVersion = { major: 2, minor: 1, patch: 0, raw: 'v2.1.0' };
    const res = mockResponse();
    const next = jest.fn();

    requireVersion('v2.0.0')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res._statusCode).toBe(200);
  });

  test('rejects requests below minimum version', () => {
    const req = mockRequest({ path: '/api/service/v1/endpoint' }) as VersionedRequest;
    req.apiVersion = { major: 1, minor: 5, patch: 0, raw: 'v1.5.0' };
    const res = mockResponse();
    const next = jest.fn();

    requireVersion('v2.0.0')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(400);
    expect(res._json.error).toBe('API version too old');
    expect(res._json.required).toBe('v2.0.0');
    expect(res._json.provided).toBe('v1.5.0');
  });

  test('throws for invalid minimum version', () => {
    expect(() => requireVersion('invalid')).toThrow('Invalid minimum version specified');
  });
});

describe('requireVersionRange', () => {
  test('allows requests within version range', () => {
    const req = mockRequest() as VersionedRequest;
    req.apiVersion = { major: 2, minor: 0, patch: 0, raw: 'v2.0.0' };
    const res = mockResponse();
    const next = jest.fn();

    requireVersionRange('v1.0.0', 'v3.0.0')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('rejects requests below range', () => {
    const req = mockRequest() as VersionedRequest;
    req.apiVersion = { major: 0, minor: 9, patch: 0, raw: 'v0.9.0' };
    const res = mockResponse();
    const next = jest.fn();

    requireVersionRange('v1.0.0', 'v3.0.0')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(400);
    expect(res._json.error).toBe('API version out of range');
  });

  test('rejects requests above range', () => {
    const req = mockRequest() as VersionedRequest;
    req.apiVersion = { major: 4, minor: 0, patch: 0, raw: 'v4.0.0' };
    const res = mockResponse();
    const next = jest.fn();

    requireVersionRange('v1.0.0', 'v3.0.0')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(400);
  });
});
