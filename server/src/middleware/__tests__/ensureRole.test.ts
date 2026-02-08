import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock metrics to avoid SyntaxError in problematic module
jest.unstable_mockModule('../../observability/metrics.js', () => ({
  metrics: {
    pbacDecisionsTotal: { inc: jest.fn() }
  }
}));

// We need to mock AuthService too as it might be imported
jest.unstable_mockModule('../../services/AuthService.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    verifyToken: jest.fn(),
    hasPermission: jest.fn()
  }))
}));

const { ensureRole } = await import('../auth.js');

describe('ensureRole Middleware (Case-Insensitive)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    nextFunction = jest.fn() as NextFunction;
  });

  it('should allow access if role matches exactly', () => {
    mockRequest.user = { role: 'ADMIN' } as any;
    const middleware = ensureRole('ADMIN');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should allow access if role matches case-insensitively (user uppercase, required lowercase)', () => {
    mockRequest.user = { role: 'ADMIN' } as any;
    const middleware = ensureRole('admin');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should allow access if role matches case-insensitively (user lowercase, required uppercase)', () => {
    mockRequest.user = { role: 'admin' } as any;
    const middleware = ensureRole('ADMIN');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should allow access if role is in required roles array (case-insensitive)', () => {
    mockRequest.user = { role: 'admin' } as any;
    const middleware = ensureRole(['SUPER_ADMIN', 'ADMIN']);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should reject access if role does not match', () => {
    mockRequest.user = { role: 'VIEWER' } as any;
    const middleware = ensureRole('ADMIN');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient role' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject access if user is missing', () => {
    const middleware = ensureRole('ADMIN');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject access if user role is missing', () => {
    mockRequest.user = {} as any;
    const middleware = ensureRole('ADMIN');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
