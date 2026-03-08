/**
 * Multi-Tenant RBAC Tests
 *
 * Tests for IC-grade multi-tenancy with RBAC, OPA integration,
 * and tenant isolation enforcement.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  MultiTenantRBACManager,
  MultiTenantUser,
  TenantConfig,
  ResourceContext,
  getMultiTenantRBAC,
  resetMultiTenantRBAC,
} from '../multi-tenant-rbac.js';

describe('MultiTenantRBACManager', () => {
  let rbac: MultiTenantRBACManager;

  beforeEach(() => {
    resetMultiTenantRBAC();
    rbac = new MultiTenantRBACManager({
      enabled: true,
      enforceTenantIsolation: true,
      allowCrossTenantAccess: false,
      requireMfaForSensitive: true,
      auditAllAccess: true,
    });
  });

  afterEach(() => {
    resetMultiTenantRBAC();
  });

  describe('Tenant Isolation', () => {
    const tenant1: TenantConfig = {
      id: 'tenant-1',
      name: 'Tenant One',
      classification: 'secret',
      deniedEnvironments: [],
      allowedRegions: ['us-east-1'],
      maxUsers: 100,
      features: ['analytics', 'copilot'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tenant2: TenantConfig = {
      id: 'tenant-2',
      name: 'Tenant Two',
      classification: 'unclassified',
      deniedEnvironments: [],
      allowedRegions: ['us-west-2'],
      maxUsers: 50,
      features: ['analytics'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      rbac.registerTenant(tenant1);
      rbac.registerTenant(tenant2);
    });

    it('should enforce tenant isolation', () => {
      const user: MultiTenantUser = {
        id: 'user-1',
        email: 'user@tenant1.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'analyst',
          permissions: [],
          scope: 'full',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      // User should have permission in their tenant
      expect(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);

      // User should NOT have permission in other tenant
      expect(rbac.hasPermission(user, 'investigation:read', 'tenant-2')).toBe(false);
    });

    it('should allow global admin cross-tenant access', () => {
      const globalAdmin: MultiTenantUser = {
        id: 'admin-1',
        email: 'admin@corp.com',
        name: 'Global Admin',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [],
        globalRoles: ['global-admin'],
        attributes: {},
        clearanceLevel: 'top-secret-sci',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      // Global admin should have access to all tenants
      expect(rbac.hasPermission(globalAdmin, 'investigation:read', 'tenant-1')).toBe(true);
      expect(rbac.hasPermission(globalAdmin, 'investigation:read', 'tenant-2')).toBe(true);
      expect(rbac.hasPermission(globalAdmin, 'admin:manage', 'tenant-2')).toBe(true);
    });

    it('should allow multi-tenant users', () => {
      const multiTenantUser: MultiTenantUser = {
        id: 'user-multi',
        email: 'multi@corp.com',
        name: 'Multi-Tenant User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1', 'tenant-2'],
        primaryTenantId: 'tenant-1',
        roles: [
          {
            tenantId: 'tenant-1',
            role: 'analyst',
            permissions: [],
            scope: 'full',
            grantedBy: 'admin',
            grantedAt: new Date(),
          },
          {
            tenantId: 'tenant-2',
            role: 'viewer',
            permissions: [],
            scope: 'readonly',
            grantedBy: 'admin',
            grantedAt: new Date(),
          },
        ],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      // Different permissions in different tenants
      expect(rbac.hasPermission(multiTenantUser, 'investigation:create', 'tenant-1')).toBe(true);
      expect(rbac.hasPermission(multiTenantUser, 'investigation:create', 'tenant-2')).toBe(false);
      expect(rbac.hasPermission(multiTenantUser, 'investigation:read', 'tenant-2')).toBe(true);
    });
  });

  describe('Role Hierarchy', () => {
    it('should support role inheritance', () => {
      const supervisor: MultiTenantUser = {
        id: 'super-1',
        email: 'super@corp.com',
        name: 'Supervisor',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'supervisor',
          permissions: [],
          scope: 'full',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      // Supervisor should have inherited analyst permissions
      expect(rbac.hasPermission(supervisor, 'investigation:read', 'tenant-1')).toBe(true);
      expect(rbac.hasPermission(supervisor, 'investigation:create', 'tenant-1')).toBe(true);
      expect(rbac.hasPermission(supervisor, 'investigation:delete', 'tenant-1')).toBe(true);
      expect(rbac.hasPermission(supervisor, 'analytics:export', 'tenant-1')).toBe(true);
    });

    it('should respect role boundaries', () => {
      const viewer: MultiTenantUser = {
        id: 'viewer-1',
        email: 'viewer@corp.com',
        name: 'Viewer',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'viewer',
          permissions: [],
          scope: 'readonly',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'unclassified',
        lastAuthenticated: new Date(),
        mfaVerified: false,
      };

      // Viewer should only have read permissions
      expect(rbac.hasPermission(viewer, 'investigation:read', 'tenant-1')).toBe(true);
      expect(rbac.hasPermission(viewer, 'investigation:create', 'tenant-1')).toBe(false);
      expect(rbac.hasPermission(viewer, 'investigation:delete', 'tenant-1')).toBe(false);
    });
  });

  describe('Clearance Levels', () => {
    it('should enforce clearance requirements', async () => {
      const secretUser: MultiTenantUser = {
        id: 'secret-user',
        email: 'secret@corp.com',
        name: 'Secret User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'analyst',
          permissions: [],
          scope: 'full',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      const unclassifiedUser: MultiTenantUser = {
        ...secretUser,
        id: 'unclass-user',
        email: 'unclass@corp.com',
        clearanceLevel: 'unclassified',
      };

      const secretResource: ResourceContext = {
        type: 'investigation',
        id: 'inv-secret',
        tenantId: 'tenant-1',
        classification: 'secret',
      };

      const unclassifiedResource: ResourceContext = {
        type: 'investigation',
        id: 'inv-unclass',
        tenantId: 'tenant-1',
        classification: 'unclassified',
      };

      // Secret user can access secret resource
      const secretDecision = await rbac.evaluateAccess(secretUser, secretResource, 'read');
      expect(secretDecision.allowed).toBe(true);

      // Unclassified user cannot access secret resource
      const unclassDecision = await rbac.evaluateAccess(unclassifiedUser, secretResource, 'read');
      expect(unclassDecision.allowed).toBe(false);
      expect(unclassDecision.reason).toBe('Insufficient clearance level');

      // Both can access unclassified resource
      const secretUnclassDecision = await rbac.evaluateAccess(secretUser, unclassifiedResource, 'read');
      const unclassUnclassDecision = await rbac.evaluateAccess(unclassifiedUser, unclassifiedResource, 'read');
      expect(secretUnclassDecision.allowed).toBe(true);
      expect(unclassUnclassDecision.allowed).toBe(true);
    });
  });

  describe('Denied Environments', () => {
    beforeEach(() => {
      rbac = new MultiTenantRBACManager({
        enabled: true,
        enforceTenantIsolation: true,
        deniedEnvironments: ['ot:scada', 'ot:plc', 'restricted:'],
      });
    });

    it('should block access to denied environments', () => {
      const user: MultiTenantUser = {
        id: 'user-1',
        email: 'user@corp.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'analyst',
          permissions: [],
          scope: 'full',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      // Normal permissions should work
      expect(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);

      // Denied OT systems should be blocked
      expect(rbac.hasPermission(user, 'ot:scada:read', 'tenant-1')).toBe(false);
      expect(rbac.hasPermission(user, 'ot:plc:write', 'tenant-1')).toBe(false);

      // Restricted prefix should be blocked
      expect(rbac.hasPermission(user, 'restricted:data:read', 'tenant-1')).toBe(false);
    });
  });

  describe('Role Expiration', () => {
    it('should reject expired roles', () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const user: MultiTenantUser = {
        id: 'user-expired',
        email: 'expired@corp.com',
        name: 'Expired User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'analyst',
          permissions: [],
          scope: 'full',
          expiresAt: expiredDate,
          grantedBy: 'admin',
          grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      // Expired role should not grant permissions
      expect(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(false);
    });

    it('should accept valid non-expired roles', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const user: MultiTenantUser = {
        id: 'user-valid',
        email: 'valid@corp.com',
        name: 'Valid User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'analyst',
          permissions: [],
          scope: 'full',
          expiresAt: futureDate,
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      expect(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);
    });
  });

  describe('Step-Up Authentication', () => {
    it('should require step-up for sensitive operations', async () => {
      const user: MultiTenantUser = {
        id: 'user-1',
        email: 'user@corp.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'supervisor',
          permissions: [],
          scope: 'full',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: false, // Not MFA verified
      };

      const secretResource: ResourceContext = {
        type: 'investigation',
        id: 'inv-secret',
        tenantId: 'tenant-1',
        classification: 'secret',
      };

      const decision = await rbac.evaluateAccess(user, secretResource, 'delete');
      expect(decision.allowed).toBe(false);
      expect(decision.stepUpRequired).toBe(true);
    });

    it('should allow access after step-up verification', async () => {
      const user: MultiTenantUser = {
        id: 'user-1',
        email: 'user@corp.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'supervisor',
          permissions: [],
          scope: 'full',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true, // MFA verified
      };

      const secretResource: ResourceContext = {
        type: 'investigation',
        id: 'inv-secret',
        tenantId: 'tenant-1',
        classification: 'secret',
      };

      const decision = await rbac.evaluateAccess(user, secretResource, 'delete');
      expect(decision.allowed).toBe(true);
    });
  });

  describe('Effective Permissions', () => {
    it('should compute effective permissions correctly', () => {
      const user: MultiTenantUser = {
        id: 'user-1',
        email: 'user@corp.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'analyst',
          permissions: ['custom:permission'],
          scope: 'full',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      const permissions = rbac.getEffectivePermissions(user, 'tenant-1');

      // Should include role permissions
      expect(permissions).toContain('investigation:read');
      expect(permissions).toContain('entity:read');
      expect(permissions).toContain('copilot:query');

      // Should include custom permissions
      expect(permissions).toContain('custom:permission');

      // Should not include admin permissions
      expect(permissions).not.toContain('tenant:manage');
    });
  });

  describe('Custom Roles', () => {
    it('should allow adding custom roles', () => {
      rbac.addRole('custom-role', [
        'custom:read',
        'custom:write',
      ], ['viewer']);

      const user: MultiTenantUser = {
        id: 'user-custom',
        email: 'custom@corp.com',
        name: 'Custom User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: [{
          tenantId: 'tenant-1',
          role: 'custom-role',
          permissions: [],
          scope: 'full',
          grantedBy: 'admin',
          grantedAt: new Date(),
        }],
        globalRoles: [],
        attributes: {},
        clearanceLevel: 'secret',
        lastAuthenticated: new Date(),
        mfaVerified: true,
      };

      // Custom permissions
      expect(rbac.hasPermission(user, 'custom:read', 'tenant-1')).toBe(true);
      expect(rbac.hasPermission(user, 'custom:write', 'tenant-1')).toBe(true);

      // Inherited from viewer
      expect(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);
      expect(rbac.hasPermission(user, 'dashboard:view', 'tenant-1')).toBe(true);

      // Not inherited
      expect(rbac.hasPermission(user, 'investigation:create', 'tenant-1')).toBe(false);
    });
  });

  describe('Singleton Management', () => {
    it('should return same instance', () => {
      const instance1 = getMultiTenantRBAC();
      const instance2 = getMultiTenantRBAC();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getMultiTenantRBAC();
      resetMultiTenantRBAC();
      const instance2 = getMultiTenantRBAC();
      expect(instance1).not.toBe(instance2);
    });
  });
});
