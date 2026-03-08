/**
 * Tests for OPA ABAC Middleware
 *
 * P0 - Critical for MVP-4-GA
 * Target coverage: 80%
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { requestFactory, responseFactory, nextFactory } from '../../../../tests/factories/requestFactory';
import { userFactory } from '../../../../tests/factories/userFactory';

// Mock function declared before mock
const mockAxiosPost = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('axios', () => ({
  __esModule: true,
  default: {
    post: mockAxiosPost,
  },
}));

// Dynamic imports AFTER mocks are set up
const { OPAClient, createABACMiddleware, ABACContext } = await import('../opa-abac');

describe('OPAClient', () => {
  let opaClient: InstanceType<typeof OPAClient>;
  const baseUrl = 'http://localhost:8181';

  beforeEach(() => {
    jest.clearAllMocks();
    opaClient = new OPAClient(baseUrl, 5000);
  });

  describe('evaluate', () => {
    it('should return allow=true when OPA policy permits action', async () => {
      // Arrange
      const input = {
        subject: {
          id: 'user-123',
          tenantId: 'tenant-abc',
          roles: ['analyst'],
          residency: 'US',
          clearance: 'SECRET',
        },
        resource: {
          type: 'investigation',
          id: 'inv-456',
          tenantId: 'tenant-abc',
        },
        action: 'read',
        context: {
          ip: '192.168.1.1',
          time: Date.now(),
        },
      };

      mockAxiosPost.mockResolvedValue({
        data: {
          result: {
            allow: true,
            reason: 'User has analyst role with read permission',
            obligations: [],
          },
        },
        status: 200,
      });

      // Act
      const result = await opaClient.evaluate('summit.authz.allow', input);

      // Assert
      expect(result).toEqual({
        allow: true,
        reason: 'User has analyst role with read permission',
        obligations: [],
      });
      expect(mockAxiosPost).toHaveBeenCalledWith(
        `${baseUrl}/v1/data/summit/authz/allow`,
        { input },
        expect.objectContaining({ timeout: 5000 })
      );
    });

    it('should return allow=false when OPA policy denies action', async () => {
      // Arrange
      const input = {
        subject: {
          id: 'user-123',
          tenantId: 'tenant-abc',
          roles: ['viewer'],
          residency: 'US',
          clearance: 'UNCLASSIFIED',
        },
        resource: {
          type: 'investigation',
          id: 'inv-456',
          classification: 'SECRET',
        },
        action: 'read',
        context: {
          ip: '192.168.1.1',
          time: Date.now(),
        },
      };

      mockAxiosPost.mockResolvedValue({
        data: {
          result: {
            allow: false,
            reason: 'Insufficient clearance for SECRET resource',
            obligations: [],
          },
        },
        status: 200,
      });

      // Act
      const result = await opaClient.evaluate('summit.authz.allow', input);

      // Assert
      expect(result).toEqual({
        allow: false,
        reason: 'Insufficient clearance for SECRET resource',
        obligations: [],
      });
    });

    it('should return obligations when step-up auth required', async () => {
      // Arrange
      const input = {
        subject: {
          id: 'user-123',
          tenantId: 'tenant-abc',
          roles: ['analyst'],
          residency: 'US',
          clearance: 'SECRET',
        },
        resource: {
          type: 'investigation',
          id: 'inv-456',
        },
        action: 'delete',
        context: {
          ip: '192.168.1.1',
          time: Date.now(),
          protectedActions: ['delete'],
        },
      };

      mockAxiosPost.mockResolvedValue({
        data: {
          result: {
            allow: false,
            reason: 'Step-up authentication required',
            obligations: [
              {
                type: 'step_up_auth',
                mechanism: 'webauthn',
                required_acr: 'urn:mace:incommon:iap:silver',
              },
            ],
          },
        },
        status: 200,
      });

      // Act
      const result = await opaClient.evaluate('summit.authz.allow', input);

      // Assert
      expect(result).toEqual({
        allow: false,
        reason: 'Step-up authentication required',
        obligations: [
          {
            type: 'step_up_auth',
            mechanism: 'webauthn',
            required_acr: 'urn:mace:incommon:iap:silver',
          },
        ],
      });
    });

    it('should handle OPA server timeout gracefully', async () => {
      // Arrange
      const input = {
        subject: { id: 'user-123', tenantId: 'tenant-abc', roles: ['analyst'] },
        resource: { type: 'investigation' },
        action: 'read',
        context: { ip: '192.168.1.1', time: Date.now() },
      };

      mockAxiosPost.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      });

      const result = await opaClient.evaluate('summit.authz.allow', input);
      expect(result).toEqual(
        expect.objectContaining({ allow: false, reason: 'opa_unavailable' }),
      );
    });

    it('should handle OPA server connection errors', async () => {
      // Arrange
      const input = {
        subject: { id: 'user-123', tenantId: 'tenant-abc', roles: ['analyst'] },
        resource: { type: 'investigation' },
        action: 'read',
        context: { ip: '192.168.1.1', time: Date.now() },
      };

      mockAxiosPost.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8181',
      });

      const result = await opaClient.evaluate('summit.authz.allow', input);
      expect(result).toEqual(
        expect.objectContaining({ allow: false, reason: 'opa_unavailable' }),
      );
    });

    it('should handle boolean result from simple policy', async () => {
      // Arrange
      const input = { userId: 'user-123', action: 'read' };

      mockAxiosPost.mockResolvedValue({
        data: { result: true },
        status: 200,
      });

      // Act
      const result = await opaClient.evaluate('simple.allow', input);

      // Assert
      expect(result).toBe(true);
    });
  });
});

describe('createABACMiddleware', () => {
  let opaClient: InstanceType<typeof OPAClient>;
  let abacMiddleware: ReturnType<typeof createABACMiddleware>;

  beforeEach(() => {
    jest.clearAllMocks();
    opaClient = new OPAClient('http://localhost:8181', 5000);
    abacMiddleware = createABACMiddleware(opaClient);
  });

  describe('enforce', () => {
    it('should allow request when OPA returns allow=true', async () => {
      // Arrange
      const user = userFactory({
        id: 'user-123',
        tenantId: 'tenant-abc',
        role: 'analyst',
      });
      const req = requestFactory({
        user,
        params: { investigationId: 'inv-456' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAxiosPost.mockResolvedValue({
        data: {
          result: { allow: true, reason: 'Authorized', obligations: [] },
        },
        status: 200,
      });

      const enforcer = abacMiddleware.enforce('investigation', 'read');

      // Act
      await enforcer(req as any, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when OPA returns allow=false', async () => {
      // Arrange
      const user = userFactory({
        id: 'user-123',
        tenantId: 'tenant-abc',
        role: 'viewer',
      });
      const req = requestFactory({
        user,
        params: { investigationId: 'inv-456' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAxiosPost.mockResolvedValue({
        data: {
          result: { allow: false, reason: 'Insufficient permissions', obligations: [] },
        },
        status: 200,
      });

      const enforcer = abacMiddleware.enforce('investigation', 'delete');

      // Act
      await enforcer(req as any, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        reason: 'Insufficient permissions',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when request has no authenticated user', async () => {
      // Arrange
      const req = requestFactory({
        user: null,
        params: { investigationId: 'inv-456' },
      });
      const res = responseFactory();
      const next = nextFactory();

      const enforcer = abacMiddleware.enforce('investigation', 'read');

      // Act
      await enforcer(req as any, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle step-up auth obligation', async () => {
      // Arrange
      const user = userFactory({
        id: 'user-123',
        tenantId: 'tenant-abc',
        role: 'analyst',
      });
      const req = requestFactory({
        user,
        params: { investigationId: 'inv-456' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAxiosPost.mockResolvedValue({
        data: {
          result: {
            allow: false,
            reason: 'Step-up required',
            obligations: [
              {
                type: 'step_up_auth',
                mechanism: 'webauthn',
                required_acr: 'urn:mace:incommon:iap:silver',
              },
            ],
          },
        },
        status: 200,
      });

      const enforcer = abacMiddleware.enforce('investigation', 'delete');

      // Act
      await enforcer(req as any, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'StepUpRequired',
        reason: 'Step-up required',
        obligation: {
          type: 'step_up_auth',
          mechanism: 'webauthn',
          required_acr: 'urn:mace:incommon:iap:silver',
        },
      });
    });

    it('should handle dual control approval obligation', async () => {
      // Arrange
      const user = userFactory({
        id: 'user-123',
        tenantId: 'tenant-abc',
        role: 'admin',
      });
      const req = requestFactory({
        user,
        params: { investigationId: 'inv-456' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAxiosPost.mockResolvedValue({
        data: {
          result: {
            allow: false,
            reason: 'Dual control approval required',
            obligations: [
              {
                type: 'dual_control',
                required_approvals: 2,
              },
            ],
          },
        },
        status: 200,
      });

      const enforcer = abacMiddleware.enforce('investigation', 'purge');

      // Act
      await enforcer(req as any, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'DualControlRequired',
        })
      );
    });

    it('should include tenant isolation in policy input', async () => {
      // Arrange
      const user = userFactory({
        id: 'user-123',
        tenantId: 'tenant-abc',
        role: 'analyst',
      });
      const req = requestFactory({
        user,
        params: { investigationId: 'inv-456' },
        headers: { 'x-tenant-id': 'tenant-abc' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAxiosPost.mockResolvedValue({
        data: {
          result: { allow: true, reason: 'Authorized', obligations: [] },
        },
        status: 200,
      });

      const enforcer = abacMiddleware.enforce('investigation', 'read');

      // Act
      await enforcer(req as any, res, next);

      // Assert
      expect(mockAxiosPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: expect.objectContaining({
            subject: expect.objectContaining({
              tenantId: 'tenant-abc',
            }),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should fail-closed on OPA server error', async () => {
      // Arrange
      const user = userFactory({
        id: 'user-123',
        tenantId: 'tenant-abc',
        role: 'analyst',
      });
      const req = requestFactory({
        user,
        params: { investigationId: 'inv-456' },
      });
      const res = responseFactory();
      const next = nextFactory();

      mockAxiosPost.mockRejectedValue(new Error('OPA server unavailable'));

      const enforcer = abacMiddleware.enforce('investigation', 'read');

      // Act
      await enforcer(req as any, res, next);

      // Assert - Should deny access on error (fail-closed)
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ServiceUnavailable',
        message: 'Authorization service temporarily unavailable',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('ABACContext extraction', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const req = requestFactory({
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      ip: '127.0.0.1',
    });

    const context = ABACContext.fromRequest(req as any);

    expect(context.ip).toBe('203.0.113.195');
  });

  it('should fallback to req.ip when x-forwarded-for not present', () => {
    const req = requestFactory({
      headers: {},
      ip: '192.168.1.100',
    });

    const context = ABACContext.fromRequest(req as any);

    expect(context.ip).toBe('192.168.1.100');
  });

  it('should extract user agent', () => {
    const req = requestFactory({
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    const context = ABACContext.fromRequest(req as any);

    expect(context.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  });

  it('should include current timestamp', () => {
    const before = Date.now();
    const req = requestFactory({});

    const context = ABACContext.fromRequest(req as any);

    const after = Date.now();
    expect(context.time).toBeGreaterThanOrEqual(before);
    expect(context.time).toBeLessThanOrEqual(after);
  });
});
