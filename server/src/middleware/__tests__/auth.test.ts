/**
 * Tests for authentication middleware
 */

import { ensureAuthenticated, requirePermission } from '../auth';
import AuthService from '../../services/AuthService';
import { requestFactory, responseFactory, nextFactory } from '../../../../tests/factories/requestFactory';
import { userFactory } from '../../../../tests/factories/userFactory';

jest.mock('../../services/AuthService');

describe('Authentication Middleware', () => {
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
  });

  describe('ensureAuthenticated', () => {
    it('should authenticate a valid bearer token', async () => {
      const user = userFactory({ role: 'analyst' });
      const req = requestFactory({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAuthService.verifyToken = jest.fn().mockResolvedValue(user);

      await ensureAuthenticated(req as any, res, next);

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should authenticate with x-access-token header', async () => {
      const user = userFactory({ role: 'analyst' });
      const req = requestFactory({
        headers: { 'x-access-token': 'valid-token' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAuthService.verifyToken = jest.fn().mockResolvedValue(user);

      await ensureAuthenticated(req as any, res, next);

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      const req = requestFactory({
        headers: {},
      });
      const res = responseFactory();
      const next = nextFactory();

      await ensureAuthenticated(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const req = requestFactory({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAuthService.verifyToken = jest.fn().mockResolvedValue(null);

      await ensureAuthenticated(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle token verification errors', async () => {
      const req = requestFactory({
        headers: { authorization: 'Bearer error-token' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAuthService.verifyToken = jest.fn().mockRejectedValue(new Error('Token verification failed'));

      await ensureAuthenticated(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', async () => {
      const req = requestFactory({
        headers: { authorization: 'InvalidFormat' },
      });
      const res = responseFactory();
      const next = nextFactory();

      await ensureAuthenticated(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow user with required permission', () => {
      const user = userFactory({ role: 'admin', permissions: ['read', 'write', 'delete'] });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      mockAuthService.hasPermission = jest.fn().mockReturnValue(true);

      const middleware = requirePermission('write');
      middleware(req as any, res, next);

      expect(mockAuthService.hasPermission).toHaveBeenCalledWith(user, 'write');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user without required permission', () => {
      const user = userFactory({ role: 'viewer', permissions: ['read'] });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      mockAuthService.hasPermission = jest.fn().mockReturnValue(false);

      const middleware = requirePermission('write');
      middleware(req as any, res, next);

      expect(mockAuthService.hasPermission).toHaveBeenCalledWith(user, 'write');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      const req = requestFactory();
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requirePermission('write');
      middleware(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should work with different permission levels', () => {
      const adminUser = userFactory({ role: 'admin' });
      const req = requestFactory({ user: adminUser });
      const res = responseFactory();
      const next = nextFactory();

      mockAuthService.hasPermission = jest.fn().mockReturnValue(true);

      const middleware = requirePermission('admin');
      middleware(req as any, res, next);

      expect(mockAuthService.hasPermission).toHaveBeenCalledWith(adminUser, 'admin');
      expect(next).toHaveBeenCalled();
    });
  });
});
