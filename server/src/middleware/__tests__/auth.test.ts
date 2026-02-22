/**
 * Tests for authentication middleware
 */

import { randomUUID } from 'crypto';
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import AuthService from '../../services/AuthService.js';

jest.unstable_mockModule('../../observability/metrics.js', () => ({
  metrics: {
    pbacDecisionsTotal: {
      inc: jest.fn(),
    },
  },
}));

let ensureAuthenticated: typeof import('../auth.js').ensureAuthenticated;
let requirePermission: typeof import('../auth.js').requirePermission;
const verifyTokenMock: any = jest.fn();
const hasPermissionMock: any = jest.fn();

const requestFactory = (options: any = {}) => {
  const requestId = randomUUID();
  return {
    id: requestId,
    headers: {
      'content-type': 'application/json',
      'user-agent': 'IntelGraph-Test/1.0',
      'x-request-id': requestId,
      ...(options.headers || {}),
    },
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    user: options.user,
    tenant: options.tenant,
    cookies: options.cookies || {},
    ip: options.ip || '127.0.0.1',
    method: options.method || 'GET',
    url: options.url || '/',
    path: options.path || '/',
    get(name: string) {
      return this.headers[name.toLowerCase()];
    },
  };
};

const responseFactory = (): any => {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
  };

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn((name: string, value: string) => {
    res.headers[name] = value;
    return res;
  });
  res.getHeader = jest.fn((name: string) => res.headers[name]);
  res.end = jest.fn();

  return res;
};

const nextFactory = () => jest.fn();

const userFactory = (overrides: any = {}) => {
  const id = randomUUID();
  const role = overrides.role || 'analyst';
  const tenantId = overrides.tenantId || 'test-tenant-1';
  return {
    id,
    email: overrides.email || `testuser_${id.slice(0, 8)}@test.intelgraph.local`,
    username: overrides.username || `testuser_${id.slice(0, 8)}`,
    role,
    tenantId,
    defaultTenantId: overrides.defaultTenantId || tenantId,
    permissions: overrides.permissions || [],
    isActive: overrides.isActive ?? true,
    scopes: overrides.scopes || [],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
  };
};

describe('Authentication Middleware', () => {
  beforeAll(async () => {
    ({ ensureAuthenticated, requirePermission } = await import('../auth.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    verifyTokenMock.mockReset();
    hasPermissionMock.mockReset();
    (AuthService.prototype as any).verifyToken = verifyTokenMock;
    (AuthService.prototype as any).hasPermission = hasPermissionMock;
  });

  describe('ensureAuthenticated', () => {
    it('should authenticate a valid bearer token', async () => {
      const user = userFactory({ role: 'analyst' });
      const req = requestFactory({
        headers: { authorization: 'Bearer valid-token' },
      });
      const res = responseFactory();
      const next = nextFactory();

      verifyTokenMock.mockResolvedValue(user);

      await ensureAuthenticated(req as any, res, next);

      expect(verifyTokenMock).toHaveBeenCalledWith('valid-token');
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

      verifyTokenMock.mockResolvedValue(user);

      await ensureAuthenticated(req as any, res, next);

      expect(verifyTokenMock).toHaveBeenCalledWith('valid-token');
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

      verifyTokenMock.mockResolvedValue(null);

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

      verifyTokenMock.mockRejectedValue(
        new Error('Token verification failed'),
      );

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

      hasPermissionMock.mockReturnValue(true);

      const middleware = requirePermission('write');
      middleware(req as any, res, next);

      expect(hasPermissionMock).toHaveBeenCalledWith(user, 'write');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user without required permission', () => {
      const user = userFactory({ role: 'viewer', permissions: ['read'] });
      const req = requestFactory({ user });
      const res = responseFactory();
      const next = nextFactory();

      hasPermissionMock.mockReturnValue(false);

      const middleware = requirePermission('write');
      middleware(req as any, res, next);

      expect(hasPermissionMock).toHaveBeenCalledWith(user, 'write');
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

      hasPermissionMock.mockReturnValue(true);

      const middleware = requirePermission('admin');
      middleware(req as any, res, next);

      expect(hasPermissionMock).toHaveBeenCalledWith(adminUser, 'admin');
      expect(next).toHaveBeenCalled();
    });
  });
});
