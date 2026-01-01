import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies before imports
jest.mock('../../config/database.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    // Mock additional Pool properties to satisfy type requirements
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
    expiredCount: 0,
  } as any)), // eslint-disable-line @typescript-eslint/no-explicit-any
}));

jest.mock('../../auth/multi-tenant-rbac.js', () => {
  const mockRbacManager = {
    hasPermission: jest.fn(),
    evaluateAccess: jest.fn(),
  };
  return {
    getMultiTenantRBAC: jest.fn(() => mockRbacManager),
    MultiTenantRBACManager: jest.fn(() => mockRbacManager),
  };
});

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(() => mockLogger),
};

jest.mock('../../utils/logger.js', () => ({
  default: mockLogger,
  __esModule: true,
}));

import { AuthorizationServiceImpl } from '../AuthorizationService.js';
import { getMultiTenantRBAC } from '../../auth/multi-tenant-rbac.js';
import type { Principal, ResourceRef } from '../../types/identity.js';

describe('AuthorizationService', () => {
  let authService: AuthorizationServiceImpl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRbac: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRbac = getMultiTenantRBAC();
    authService = new AuthorizationServiceImpl();
  });

  describe('can()', () => {
    const userPrincipal: Principal = {
      id: 'user-123',
      kind: 'user',
      tenantId: 'tenant-a',
      roles: ['analyst'],
      scopes: ['investigation:view', 'investigation:read'],
      user: {
        email: 'analyst@example.com',
        username: 'analyst1',
      },
    };

    const resource: ResourceRef = {
      type: 'investigation',
      id: 'inv-456',
      tenantId: 'tenant-a',
    };

    it('allows access when principal has permission and passes OPA check', async () => {
      mockRbac.hasPermission.mockReturnValue(true);
      mockRbac.evaluateAccess.mockResolvedValue({ allowed: true });

      const result = await authService.can(userPrincipal, 'view', resource);

      expect(result).toBe(true);
      expect(mockRbac.hasPermission).toHaveBeenCalled();
      expect(mockRbac.evaluateAccess).toHaveBeenCalled();
    });

    it('denies access when RBAC permission check fails', async () => {
      mockRbac.hasPermission.mockReturnValue(false);

      const result = await authService.can(userPrincipal, 'delete', resource);

      expect(result).toBe(false);
      expect(mockRbac.evaluateAccess).not.toHaveBeenCalled();
    });

    it('denies cross-tenant access for regular users', async () => {
      const crossTenantResource: ResourceRef = {
        type: 'investigation',
        id: 'inv-789',
        tenantId: 'tenant-b',
      };

      const result = await authService.can(userPrincipal, 'view', crossTenantResource);

      expect(result).toBe(false);
      expect(mockRbac.hasPermission).not.toHaveBeenCalled();
    });

    it('allows cross-tenant access for global-admin role', async () => {
      const globalAdminPrincipal: Principal = {
        ...userPrincipal,
        roles: ['global-admin'],
      };

      const crossTenantResource: ResourceRef = {
        type: 'investigation',
        id: 'inv-789',
        tenantId: 'tenant-b',
      };

      mockRbac.hasPermission.mockReturnValue(true);
      mockRbac.evaluateAccess.mockResolvedValue({ allowed: true });

      const result = await authService.can(globalAdminPrincipal, 'view', crossTenantResource);

      expect(result).toBe(true);
    });

    describe('action to permission mapping', () => {
      beforeEach(() => {
        mockRbac.hasPermission.mockReturnValue(true);
        mockRbac.evaluateAccess.mockResolvedValue({ allowed: true });
      });

      it('maps view action to read permission', async () => {
        await authService.can(userPrincipal, 'view', resource);
        expect(mockRbac.hasPermission).toHaveBeenCalledWith(
          expect.anything(),
          'investigation:read'
        );
      });

      it('maps create action to create permission', async () => {
        await authService.can(userPrincipal, 'create', resource);
        expect(mockRbac.hasPermission).toHaveBeenCalledWith(
          expect.anything(),
          'investigation:create'
        );
      });

      it('maps delete action to delete permission', async () => {
        await authService.can(userPrincipal, 'delete', resource);
        expect(mockRbac.hasPermission).toHaveBeenCalledWith(
          expect.anything(),
          'investigation:delete'
        );
      });
    });
  });

  describe('assertCan()', () => {
    const principal: Principal = {
      id: 'user-123',
      kind: 'user',
      tenantId: 'tenant-a',
      roles: ['analyst'],
      scopes: ['report:view', 'investigation:read'],
    };

    const resource: ResourceRef = {
      type: 'report',
      id: 'report-456',
      tenantId: 'tenant-a',
    };

    it('does not throw when access is allowed', async () => {
      mockRbac.hasPermission.mockReturnValue(true);
      mockRbac.evaluateAccess.mockResolvedValue({ allowed: true });

      await expect(
        authService.assertCan(principal, 'view', resource)
      ).resolves.not.toThrow();
    });

    it('throws descriptive error when access is denied', async () => {
      mockRbac.hasPermission.mockReturnValue(false);

      await expect(
        authService.assertCan(principal, 'delete', resource)
      ).rejects.toThrow('Permission denied: Cannot delete report');
    });
  });
});
