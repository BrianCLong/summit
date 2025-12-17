/**
 * Version Middleware Tests
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { versionMiddleware, getVersionContext } from '../version-middleware';

describe('versionMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let headersSent: Record<string, string>;

  beforeEach(() => {
    headersSent = {};

    mockReq = {
      path: '/graphql',
      headers: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
      setHeader: jest.fn((key: string, value: string) => {
        headersSent[key] = value;
      }) as any,
    };

    mockNext = jest.fn() as NextFunction;
  });

  it('should detect version from URL path', () => {
    mockReq.path = '/v1/graphql';

    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(headersSent['X-API-Version']).toBe('v1');
    expect(headersSent['X-API-Version-Detection']).toBe('url');
  });

  it('should detect version from API-Version header', () => {
    mockReq.headers = { 'api-version': 'v2' };

    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(headersSent['X-API-Version']).toBe('v2');
    expect(headersSent['X-API-Version-Detection']).toBe('api-version-header');
  });

  it('should detect version from Accept header', () => {
    mockReq.headers = { accept: 'application/vnd.intelgraph.v1+json' };

    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(headersSent['X-API-Version']).toBe('v1');
    expect(headersSent['X-API-Version-Detection']).toBe('accept-header');
  });

  it('should use default version when no version specified', () => {
    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(headersSent['X-API-Version']).toBeDefined();
    expect(headersSent['X-API-Version-Detection']).toBe('default');
  });

  it('should prioritize URL over headers', () => {
    mockReq.path = '/v2/graphql';
    mockReq.headers = { 'api-version': 'v1' };

    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(headersSent['X-API-Version']).toBe('v2');
    expect(headersSent['X-API-Version-Detection']).toBe('url');
  });

  it('should return 400 for invalid version', () => {
    mockReq.path = '/v999/graphql';

    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'invalid_api_version',
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should set latest version header', () => {
    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(headersSent['X-API-Latest-Version']).toBeDefined();
  });

  it('should attach version context to request', () => {
    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    const context = getVersionContext(mockReq as Request);

    expect(context).toBeDefined();
    expect(context?.resolvedVersion).toBeDefined();
    expect(typeof context?.isDeprecated).toBe('boolean');
    expect(Array.isArray(context?.warnings)).toBe(true);
  });

  it('should handle API-Version header with or without "v" prefix', () => {
    mockReq.headers = { 'api-version': '2' };

    versionMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(headersSent['X-API-Version']).toBe('v2');
  });
});
