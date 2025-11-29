/**
 * Tests for IntelGraph Authentication Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { authMiddleware, requirePermission, revokeToken } from '../auth.js';
import { redisClient } from '../../db/redis.js';
import { postgresPool } from '../../db/postgres.js';
import { logger } from '../../utils/logger.js';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('jwks-rsa');
jest.mock('../../db/redis.js');
jest.mock('../../db/postgres.js');
jest.mock('../../utils/logger.js');
jest.mock('../auditLog.js', () => ({
  auditLog: jest.fn(),
}));

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();

    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Missing Authorization Header', () => {
    it('should return 401 when authorization header is missing', async () => {
      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers = { authorization: 'Basic credentials' };

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING',
      });
    });
  });

  describe('Token Blacklist Checks', () => {
    it('should return 401 when token is blacklisted', async () => {
      mockReq.headers = { authorization: 'Bearer test-token' };
      (redisClient.exists as jest.Mock).mockResolvedValue(1);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(redisClient.exists).toHaveBeenCalledWith('blacklist:test-token');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Token has been revoked',
        code: 'AUTH_TOKEN_REVOKED',
      });
    });
  });

  describe('Token Validation', () => {
    it('should return 401 when token has invalid format', async () => {
      mockReq.headers = { authorization: 'Bearer test-token' };
      (redisClient.exists as jest.Mock).mockResolvedValue(0);
      (jwt.decode as jest.Mock).mockReturnValue(null);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid token format',
        code: 'AUTH_TOKEN_INVALID',
      });
    });

    it('should return 401 when token is missing kid in header', async () => {
      mockReq.headers = { authorization: 'Bearer test-token' };
      (redisClient.exists as jest.Mock).mockResolvedValue(0);
      (jwt.decode as jest.Mock).mockReturnValue({
        header: {},
        payload: {},
      });

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid token format',
        code: 'AUTH_TOKEN_INVALID',
      });
    });

    it('should return 401 when token has expired', async () => {
      mockReq.headers = { authorization: 'Bearer test-token' };
      (redisClient.exists as jest.Mock).mockResolvedValue(0);
      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'test-kid' },
        payload: {},
      });

      const mockError = new jwt.TokenExpiredError('jwt expired', new Date());
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Token has expired',
        code: 'AUTH_TOKEN_EXPIRED',
      });
    });

    it('should return 401 when token signature is invalid', async () => {
      mockReq.headers = { authorization: 'Bearer test-token' };
      (redisClient.exists as jest.Mock).mockResolvedValue(0);
      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'test-kid' },
        payload: {},
      });

      const mockError = new jwt.JsonWebTokenError('invalid signature');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'AUTH_TOKEN_INVALID',
      });
    });
  });

  describe('User Validation', () => {
    it('should return 401 when user not found in database', async () => {
      mockReq.headers = { authorization: 'Bearer test-token' };
      (redisClient.exists as jest.Mock).mockResolvedValue(0);
      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'test-kid' },
        payload: {},
      });
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        iss: 'https://auth.intelgraph.com',
        aud: 'intelgraph-api',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      (postgresPool.findOne as jest.Mock).mockResolvedValue(null);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'User not found or inactive',
        code: 'AUTH_USER_NOT_FOUND',
      });
    });
  });

  describe('Successful Authentication', () => {
    it('should authenticate successfully with valid token and user', async () => {
      mockReq.headers = { authorization: 'Bearer test-token' };
      (redisClient.exists as jest.Mock).mockResolvedValue(0);
      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'test-kid' },
        payload: {},
      });
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'analyst',
        tenant_id: 'tenant-1',
        iss: 'https://auth.intelgraph.com',
        aud: 'intelgraph-api',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tenant_id: 'tenant-1',
        role: 'analyst',
        is_active: true,
      };

      (postgresPool.findOne as jest.Mock).mockResolvedValue(mockUser);
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');
      (postgresPool.update as jest.Mock).mockResolvedValue(undefined);

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).user.id).toBe('user-123');
      expect((mockReq as any).user.email).toBe('test@example.com');
      expect((mockReq as any).user.role).toBe('analyst');
      expect((mockReq as any).token).toBe('test-token');
      expect(mockNext).toHaveBeenCalled();
      expect(postgresPool.update).toHaveBeenCalled();
    });
  });
});

describe('requirePermission', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();

    mockReq = {};
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', () => {
    const middleware = requirePermission('entity:read');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should allow access for admin with wildcard permission', () => {
    (mockReq as any).user = {
      id: 'user-1',
      email: 'admin@example.com',
      permissions: ['*:*'],
    };

    const middleware = requirePermission('entity:delete');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should allow access when user has specific permission', () => {
    (mockReq as any).user = {
      id: 'user-1',
      email: 'analyst@example.com',
      permissions: ['entity:read', 'entity:create'],
    };

    const middleware = requirePermission('entity:read');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should allow access when user has wildcard resource permission', () => {
    (mockReq as any).user = {
      id: 'user-1',
      email: 'analyst@example.com',
      permissions: ['entity:*'],
    };

    const middleware = requirePermission('entity:delete');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny access when user lacks required permission', () => {
    (mockReq as any).user = {
      id: 'user-1',
      email: 'viewer@example.com',
      permissions: ['entity:read'],
    };

    const middleware = requirePermission('entity:delete');
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Insufficient permissions',
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
      required: 'entity:delete',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('revokeToken', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();

    mockReq = {};
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  it('should return 400 when no token is present', async () => {
    await revokeToken(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'No token to revoke',
      code: 'AUTH_NO_TOKEN',
    });
  });

  it('should revoke token successfully', async () => {
    const mockToken = 'test-token';
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    (mockReq as any).token = mockToken;
    (mockReq as any).user = { id: 'user-123' };

    (jwt.decode as jest.Mock).mockReturnValue({
      exp: futureExp,
    });
    (redisClient.set as jest.Mock).mockResolvedValue('OK');

    await revokeToken(mockReq as Request, mockRes as Response);

    expect(redisClient.set).toHaveBeenCalledWith(
      `blacklist:${mockToken}`,
      'revoked',
      expect.any(Number),
    );
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Token revoked successfully',
    });
  });

  it('should handle revocation errors gracefully', async () => {
    (mockReq as any).token = 'test-token';
    (mockReq as any).user = { id: 'user-123' };

    (jwt.decode as jest.Mock).mockImplementation(() => {
      throw new Error('Decode failed');
    });

    await revokeToken(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Failed to revoke token',
      code: 'AUTH_REVOKE_FAILED',
    });
  });
});
