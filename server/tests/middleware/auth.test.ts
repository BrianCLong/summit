/**
 * Comprehensive Auth Middleware Tests
 *
 * Tests for Express authentication and authorization middleware
 * - Token extraction (Bearer, x-access-token header)
 * - User verification
 * - Permission checking
 * - Error handling
 * - Edge cases and security scenarios
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock variables (declared before mocks)
const mockVerifyToken = jest.fn();
const mockHasPermission = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../src/services/AuthService', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    verifyToken: mockVerifyToken,
    hasPermission: mockHasPermission,
  })),
}));

jest.unstable_mockModule('argon2', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    verify: jest.fn(),
  },
  hash: jest.fn(),
  verify: jest.fn(),
}));

jest.unstable_mockModule('../../src/config/database', () => ({
  getPostgresPool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  })),
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
    subscribe: jest.fn(),
  })),
}));

// Dynamic imports AFTER mocks are set up
const { ensureAuthenticated, requirePermission, authMiddleware, auth } = await import('../../src/middleware/auth');

describe('Auth Middleware', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset request and response mocks
    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };

    nextFunction = jest.fn();

    // Reset mock implementations
    mockVerifyToken.mockReset();
    mockHasPermission.mockReset();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('ensureAuthenticated', () => {
    describe('Bearer token authentication', () => {
      it('should authenticate valid Bearer token', async () => {
        const mockUser = {
          id: 'user123',
          email: 'test@example.com',
          role: 'ANALYST',
          isActive: true,
          createdAt: new Date(),
          scopes: [],
        };
        mockRequest.headers = { authorization: 'Bearer valid-token' };
        mockVerifyToken.mockResolvedValue(mockUser);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
        expect(mockRequest.user).toEqual(mockUser);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should handle Bearer token with extra spaces', async () => {
        const mockUser = {
          id: 'user123',
          email: 'test@example.com',
          role: 'ANALYST',
          isActive: true,
          createdAt: new Date(),
          scopes: [],
        };
        mockRequest.headers = { authorization: 'Bearer   valid-token-with-spaces' };
        mockVerifyToken.mockResolvedValue(mockUser);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockVerifyToken).toHaveBeenCalledWith('  valid-token-with-spaces');
        expect(mockRequest.user).toEqual(mockUser);
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should reject invalid Bearer token', async () => {
        mockRequest.headers = { authorization: 'Bearer invalid-token' };
        mockVerifyToken.mockResolvedValue(null);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should reject malformed Bearer token format', async () => {
        mockRequest.headers = { authorization: 'Bearertoken-without-space' };

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('x-access-token header authentication', () => {
      it('should authenticate valid x-access-token', async () => {
        const mockUser = {
          id: 'user456',
          email: 'user@example.com',
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date(),
          scopes: [],
        };
        mockRequest.headers = { 'x-access-token': 'valid-token' };
        mockVerifyToken.mockResolvedValue(mockUser);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
        expect(mockRequest.user).toEqual(mockUser);
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should prefer Bearer token over x-access-token', async () => {
        const mockUser = {
          id: 'user789',
          email: 'admin@example.com',
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date(),
          scopes: [],
        };
        mockRequest.headers = {
          authorization: 'Bearer bearer-token',
          'x-access-token': 'header-token',
        };
        mockVerifyToken.mockResolvedValue(mockUser);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockVerifyToken).toHaveBeenCalledWith('bearer-token');
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should reject invalid x-access-token', async () => {
        mockRequest.headers = { 'x-access-token': 'invalid-token' };
        mockVerifyToken.mockResolvedValue(null);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('Missing authentication', () => {
      it('should reject request with no authorization header', async () => {
        mockRequest.headers = {};

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockVerifyToken).not.toHaveBeenCalled();
      });

      it('should reject request with empty authorization header', async () => {
        mockRequest.headers = { authorization: '' };

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should reject request with only "Bearer" without token', async () => {
        mockRequest.headers = { authorization: 'Bearer ' };

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('should handle token verification errors', async () => {
        mockRequest.headers = { authorization: 'Bearer error-token' };
        mockVerifyToken.mockRejectedValue(new Error('Database error'));

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should handle AuthService exceptions gracefully', async () => {
        mockRequest.headers = { authorization: 'Bearer exception-token' };
        mockVerifyToken.mockRejectedValue(new Error('Unexpected error'));

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      });

      it('should handle undefined user from verifyToken', async () => {
        mockRequest.headers = { authorization: 'Bearer undefined-token' };
        mockVerifyToken.mockResolvedValue(undefined as any);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });

    describe('Security edge cases', () => {
      it('should reject tokens with SQL injection attempts', async () => {
        mockRequest.headers = { authorization: "Bearer '; DROP TABLE users; --" };
        mockVerifyToken.mockResolvedValue(null);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      });

      it('should handle extremely long tokens', async () => {
        const longToken = 'a'.repeat(10000);
        mockRequest.headers = { authorization: `Bearer ${longToken}` };
        mockVerifyToken.mockResolvedValue(null);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
      });

      it('should handle special characters in tokens', async () => {
        const specialToken = 'token-with-!@#$%^&*()_+={}[]|\\:";\'<>?,./';
        mockRequest.headers = { authorization: `Bearer ${specialToken}` };
        mockVerifyToken.mockResolvedValue(null);

        await ensureAuthenticated(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockVerifyToken).toHaveBeenCalledWith(specialToken);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
      });
    });
  });

  describe('requirePermission', () => {
    describe('Permission validation', () => {
      it('should allow request with valid permission', () => {
        const middleware = requirePermission('entity:create');
        mockRequest.user = {
          id: 'user123',
          tenantId: 'tenant-test',
          role: 'ANALYST',
        };
        mockHasPermission.mockReturnValue(true);

        middleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockHasPermission).toHaveBeenCalledWith(
          mockRequest.user,
          'entity:create',
        );
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should deny request without required permission', () => {
        const middleware = requirePermission('user:delete');
        mockRequest.user = { id: 'user123', tenantId: 'tenant-test', role: 'VIEWER' };
        mockHasPermission.mockReturnValue(false);

        middleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should validate multiple permission checks', () => {
        const middleware1 = requirePermission('investigation:read');
        const middleware2 = requirePermission('entity:update');

        mockRequest.user = { id: 'user123', tenantId: 'tenant-test', role: 'ANALYST' };
        mockHasPermission.mockReturnValueOnce(true).mockReturnValueOnce(true);

        middleware1(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalledTimes(1);

        middleware2(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalledTimes(2);
      });
    });

    describe('Missing user authentication', () => {
      it('should deny request when user is not authenticated', () => {
        const middleware = requirePermission('entity:read');
        mockRequest.user = undefined;

        middleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockHasPermission).not.toHaveBeenCalled();
      });

      it('should deny request when user is null', () => {
        const middleware = requirePermission('entity:read');
        mockRequest.user = null;

        middleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      });
    });

    describe('Admin wildcard permissions', () => {
      it('should allow admin access to any permission', () => {
        const middleware = requirePermission('anything:anywhere');
        mockRequest.user = { id: 'admin123', tenantId: 'tenant-test', role: 'ADMIN' };
        mockHasPermission.mockReturnValue(true);

        middleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('Role-specific permissions', () => {
      it('should allow ANALYST to create entities', () => {
        const middleware = requirePermission('entity:create');
        mockRequest.user = { id: 'analyst123', tenantId: 'tenant-test', role: 'ANALYST' };
        mockHasPermission.mockReturnValue(true);

        middleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should deny VIEWER from creating entities', () => {
        const middleware = requirePermission('entity:create');
        mockRequest.user = { id: 'viewer123', tenantId: 'tenant-test', role: 'VIEWER' };
        mockHasPermission.mockReturnValue(false);

        middleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
      });

      it('should allow VIEWER to read entities', () => {
        const middleware = requirePermission('entity:read');
        mockRequest.user = { id: 'viewer123', tenantId: 'tenant-test', role: 'VIEWER' };
        mockHasPermission.mockReturnValue(true);

        middleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('Permission string formats', () => {
      it('should handle standard permission format (resource:action)', () => {
        const middleware = requirePermission('investigation:read');
        mockRequest.user = { id: 'user123', tenantId: 'tenant-test', role: 'ANALYST' };
        mockHasPermission.mockReturnValue(true);

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockHasPermission).toHaveBeenCalledWith(
          mockRequest.user,
          'investigation:read',
        );
      });

      it('should handle custom permission strings', () => {
        const middleware = requirePermission('custom-permission');
        mockRequest.user = { id: 'user123', tenantId: 'tenant-test', role: 'ADMIN' };
        mockHasPermission.mockReturnValue(true);

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockHasPermission).toHaveBeenCalledWith(
          mockRequest.user,
          'custom-permission',
        );
      });
    });
  });

  describe('Middleware aliases', () => {
    it('should export authMiddleware as alias for ensureAuthenticated', () => {
      expect(authMiddleware).toBe(ensureAuthenticated);
    });

    it('should export auth as alias for ensureAuthenticated', () => {
      expect(auth).toBe(ensureAuthenticated);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle authentication followed by permission check', async () => {
      // First: authenticate
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'ANALYST',
        isActive: true,
        createdAt: new Date(),
        scopes: [],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockVerifyToken.mockResolvedValue(mockUser);

      await ensureAuthenticated(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalledTimes(1);

      // Second: check permission
      const permissionMiddleware = requirePermission('entity:create');
      mockHasPermission.mockReturnValue(true);
      (nextFunction as jest.Mock).mockClear();

      permissionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should prevent access when authentication passes but permission fails', async () => {
      // First: authenticate
      const mockUser = {
        id: 'viewer123',
        email: 'viewer@example.com',
        role: 'VIEWER',
        isActive: true,
        createdAt: new Date(),
        scopes: [],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockVerifyToken.mockResolvedValue(mockUser);

      await ensureAuthenticated(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();

      // Second: check permission (should fail)
      const permissionMiddleware = requirePermission('entity:delete');
      mockHasPermission.mockReturnValue(false);

      permissionMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });
  });

  describe('Type safety and TypeScript', () => {
    it('should properly extend Request with user property', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'ANALYST',
        isActive: true,
        createdAt: new Date(),
        scopes: [],
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      mockVerifyToken.mockResolvedValue(mockUser);

      await ensureAuthenticated(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      // TypeScript should allow accessing user property
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('user123');
    });
  });

  describe('Concurrency and race conditions', () => {
    it('should handle multiple concurrent authentication requests', async () => {
      const mockUser1 = {
        id: 'user1',
        email: 'user1@example.com',
        role: 'ANALYST',
        isActive: true,
        createdAt: new Date(),
        scopes: [],
      };
      const mockUser2 = {
        id: 'user2',
        email: 'user2@example.com',
        role: 'VIEWER',
        isActive: true,
        createdAt: new Date(),
        scopes: [],
      };

      const req1 = { headers: { authorization: 'Bearer token1' }, user: undefined };
      const req2 = { headers: { authorization: 'Bearer token2' }, user: undefined };
      const res1 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next1 = jest.fn();
      const next2 = jest.fn();

      mockVerifyToken
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);

      await Promise.all([
        ensureAuthenticated(req1 as any, res1 as any, next1),
        ensureAuthenticated(req2 as any, res2 as any, next2),
      ]);

      expect(req1.user).toEqual(mockUser1);
      expect(req2.user).toEqual(mockUser2);
      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });
  });
});
