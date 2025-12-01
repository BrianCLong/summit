/**
 * Tests for RBAC middleware
 */

import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
} from '../rbac';
import AuthService from '../../services/AuthService';
import {
  requestFactory,
  responseFactory,
  nextFactory,
} from '../../../../tests/factories/requestFactory';
import { userFactory } from '../../../../tests/factories/userFactory';

jest.mock('../../services/AuthService');

describe('RBAC Middleware', () => {
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
  });

  describe('requirePermission', () => {
    it('should allow user with required permission', () => {
      const user = userFactory({ role: 'analyst', permissions: ['read', 'write'] });
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

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
          required: 'write',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const req = requestFactory();
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requirePermission('read');
      middleware(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission', () => {
    it('should allow user with any of the required permissions', () => {
      const user = userFactory({
        role: 'analyst',
        permissions: ['read', 'export'],
      });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireAnyPermission(['write', 'export', 'delete']);
      middleware(req as any, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow admin regardless of permissions', () => {
      const user = userFactory({ role: 'admin', permissions: [] });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireAnyPermission(['superpower']);
      middleware(req as any, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user without any required permissions', () => {
      const user = userFactory({ role: 'viewer', permissions: ['read'] });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireAnyPermission(['write', 'delete']);
      middleware(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
          required: 'Any of: write, delete',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const req = requestFactory();
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireAnyPermission(['read']);
      middleware(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAllPermissions', () => {
    it('should allow user with all required permissions', () => {
      const user = userFactory({
        role: 'analyst',
        permissions: ['read', 'write', 'export'],
      });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireAllPermissions(['read', 'write']);
      middleware(req as any, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow admin regardless of permissions', () => {
      const user = userFactory({ role: 'admin', permissions: [] });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireAllPermissions(['read', 'write', 'delete']);
      middleware(req as any, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user missing some required permissions', () => {
      const user = userFactory({ role: 'analyst', permissions: ['read'] });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireAllPermissions(['read', 'write']);
      middleware(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
          required: 'All of: read, write',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const req = requestFactory();
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireAllPermissions(['read']);
      middleware(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with exact role', () => {
      const user = userFactory({ role: 'analyst' });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireRole('analyst');
      middleware(req as any, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow admin for any role requirement', () => {
      const user = userFactory({ role: 'admin' });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireRole('superuser');
      middleware(req as any, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should be case insensitive', () => {
      const user = userFactory({ role: 'ANALYST' });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireRole('analyst');
      middleware(req as any, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user with different role', () => {
      const user = userFactory({ role: 'viewer' });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireRole('analyst');
      middleware(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient role',
          required: 'analyst',
          userRole: 'viewer',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const req = requestFactory();
      const res = responseFactory();
      const next = nextFactory();

      const middleware = requireRole('analyst');
      middleware(req as any, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
