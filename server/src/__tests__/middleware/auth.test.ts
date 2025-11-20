/**
 * Authentication Middleware Tests
 * Tests for token validation, permission checking, and security edge cases
 */

import { Request, Response, NextFunction } from 'express';
import { ensureAuthenticated, requirePermission } from '../../middleware/auth';
import AuthService from '../../services/AuthService';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockUser,
  createMockJWT,
  assertNoSensitiveData,
} from '../helpers/testHelpers';

// Mock AuthService
jest.mock('../../services/AuthService');

describe('Authentication Middleware - Edge Cases', () => {
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mocked instance
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
  });

  describe('ensureAuthenticated', () => {
    it('should reject request with missing authorization header', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with empty authorization header', async () => {
      const req = createMockRequest({ headers: { authorization: '' } });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed Bearer token (missing space)', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearermalformedtoken' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should reject request with malformed Bearer token (just "Bearer")', async () => {
      const req = createMockRequest({ headers: { authorization: 'Bearer' } });
      const res = createMockResponse();
      const next = createMockNext();

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle JWT with invalid signature', async () => {
      const invalidToken = createMockJWT({ sub: 'user-123', invalid: true });
      const req = createMockRequest({
        headers: { authorization: `Bearer ${invalidToken}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.verifyToken = jest.fn().mockResolvedValue(null);

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(invalidToken);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle expired JWT token', async () => {
      const expiredToken = createMockJWT({ sub: 'user-123', exp: Date.now() - 10000 });
      const req = createMockRequest({
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.verifyToken = jest.fn().mockRejectedValue(new Error('Token expired'));

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should accept valid token and call next()', async () => {
      const validToken = createMockJWT({ sub: 'user-123' });
      const mockUser = createMockUser({ id: 'user-123' });
      const req = createMockRequest({
        headers: { authorization: `Bearer ${validToken}` },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.verifyToken = jest.fn().mockResolvedValue(mockUser);

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept token from x-access-token header', async () => {
      const validToken = createMockJWT({ sub: 'user-123' });
      const mockUser = createMockUser({ id: 'user-123' });
      const req = createMockRequest({
        headers: { 'x-access-token': validToken },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.verifyToken = jest.fn().mockResolvedValue(mockUser);

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should not leak sensitive information in error responses', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.verifyToken = jest.fn().mockRejectedValue(
        new Error('Database connection failed at postgres-primary.internal:5432 with password=secret123')
      );

      await ensureAuthenticated(req as Request, res as Response, next);

      const errorResponse = (res.json as jest.Mock).mock.calls[0][0];
      expect(errorResponse.error).toBe('Unauthorized');

      // Should not contain sensitive details
      assertNoSensitiveData(JSON.stringify(errorResponse));
    });

    it('should handle null token gracefully', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer null' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.verifyToken = jest.fn().mockResolvedValue(null);

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle undefined token gracefully', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer undefined' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.verifyToken = jest.fn().mockResolvedValue(null);

      await ensureAuthenticated(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requirePermission', () => {
    it('should deny access when user lacks required permission', () => {
      const middleware = requirePermission('entity:delete');
      const mockUser = createMockUser({
        role: 'VIEWER',
        permissions: ['entity:read', 'graph:read'],
      });
      const req = createMockRequest({ user: mockUser });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.hasPermission = jest.fn().mockReturnValue(false);

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access when user has required permission', () => {
      const middleware = requirePermission('entity:read');
      const mockUser = createMockUser({
        role: 'ANALYST',
        permissions: ['entity:read', 'entity:update'],
      });
      const req = createMockRequest({ user: mockUser });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.hasPermission = jest.fn().mockReturnValue(true);

      middleware(req as Request, res as Response, next);

      expect(mockAuthService.hasPermission).toHaveBeenCalledWith(mockUser, 'entity:read');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow ADMIN with wildcard permission to access any resource', () => {
      const middleware = requirePermission('entity:delete');
      const mockUser = createMockUser({
        role: 'ADMIN',
        permissions: ['*'],
      });
      const req = createMockRequest({ user: mockUser });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.hasPermission = jest.fn().mockReturnValue(true);

      middleware(req as Request, res as Response, next);

      expect(mockAuthService.hasPermission).toHaveBeenCalledWith(mockUser, 'entity:delete');
      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      const middleware = requirePermission('entity:read');
      const req = createMockRequest({ user: null });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user object is undefined', () => {
      const middleware = requirePermission('entity:read');
      const req = createMockRequest(); // No user
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle special permission formats correctly', () => {
      const middleware = requirePermission('investigation:create');
      const mockUser = createMockUser({
        role: 'ANALYST',
        permissions: ['investigation:create', 'investigation:read'],
      });
      const req = createMockRequest({ user: mockUser });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.hasPermission = jest.fn().mockReturnValue(true);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should be case-sensitive for permissions', () => {
      const middleware = requirePermission('entity:DELETE');
      const mockUser = createMockUser({
        role: 'ANALYST',
        permissions: ['entity:delete'], // lowercase
      });
      const req = createMockRequest({ user: mockUser });
      const res = createMockResponse();
      const next = createMockNext();

      mockAuthService.hasPermission = jest.fn().mockReturnValue(false);

      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Auth middleware aliases', () => {
    it('should export authMiddleware as alias for ensureAuthenticated', async () => {
      const { authMiddleware } = await import('../../middleware/auth');
      expect(authMiddleware).toBe(ensureAuthenticated);
    });

    it('should export auth as alias for ensureAuthenticated', async () => {
      const { auth } = await import('../../middleware/auth');
      expect(auth).toBe(ensureAuthenticated);
    });
  });
});
