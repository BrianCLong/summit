"use strict";
/**
 * Multi-Tenant RBAC Tests
 *
 * Tests for IC-grade multi-tenancy with RBAC, OPA integration,
 * and tenant isolation enforcement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const multi_tenant_rbac_js_1 = require("../multi-tenant-rbac.js");
(0, globals_1.describe)('MultiTenantRBACManager', () => {
    let rbac;
    (0, globals_1.beforeEach)(() => {
        (0, multi_tenant_rbac_js_1.resetMultiTenantRBAC)();
        rbac = new multi_tenant_rbac_js_1.MultiTenantRBACManager({
            enabled: true,
            enforceTenantIsolation: true,
            allowCrossTenantAccess: false,
            requireMfaForSensitive: true,
            auditAllAccess: true,
        });
    });
    (0, globals_1.afterEach)(() => {
        (0, multi_tenant_rbac_js_1.resetMultiTenantRBAC)();
    });
    (0, globals_1.describe)('Tenant Isolation', () => {
        const tenant1 = {
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
        const tenant2 = {
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
        (0, globals_1.beforeEach)(() => {
            rbac.registerTenant(tenant1);
            rbac.registerTenant(tenant2);
        });
        (0, globals_1.it)('should enforce tenant isolation', () => {
            const user = {
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
            (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);
            // User should NOT have permission in other tenant
            (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:read', 'tenant-2')).toBe(false);
        });
        (0, globals_1.it)('should allow global admin cross-tenant access', () => {
            const globalAdmin = {
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
            (0, globals_1.expect)(rbac.hasPermission(globalAdmin, 'investigation:read', 'tenant-1')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(globalAdmin, 'investigation:read', 'tenant-2')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(globalAdmin, 'admin:manage', 'tenant-2')).toBe(true);
        });
        (0, globals_1.it)('should allow multi-tenant users', () => {
            const multiTenantUser = {
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
            (0, globals_1.expect)(rbac.hasPermission(multiTenantUser, 'investigation:create', 'tenant-1')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(multiTenantUser, 'investigation:create', 'tenant-2')).toBe(false);
            (0, globals_1.expect)(rbac.hasPermission(multiTenantUser, 'investigation:read', 'tenant-2')).toBe(true);
        });
    });
    (0, globals_1.describe)('Role Hierarchy', () => {
        (0, globals_1.it)('should support role inheritance', () => {
            const supervisor = {
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
            (0, globals_1.expect)(rbac.hasPermission(supervisor, 'investigation:read', 'tenant-1')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(supervisor, 'investigation:create', 'tenant-1')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(supervisor, 'investigation:delete', 'tenant-1')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(supervisor, 'analytics:export', 'tenant-1')).toBe(true);
        });
        (0, globals_1.it)('should respect role boundaries', () => {
            const viewer = {
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
            (0, globals_1.expect)(rbac.hasPermission(viewer, 'investigation:read', 'tenant-1')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(viewer, 'investigation:create', 'tenant-1')).toBe(false);
            (0, globals_1.expect)(rbac.hasPermission(viewer, 'investigation:delete', 'tenant-1')).toBe(false);
        });
    });
    (0, globals_1.describe)('Clearance Levels', () => {
        (0, globals_1.it)('should enforce clearance requirements', async () => {
            const secretUser = {
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
            const unclassifiedUser = {
                ...secretUser,
                id: 'unclass-user',
                email: 'unclass@corp.com',
                clearanceLevel: 'unclassified',
            };
            const secretResource = {
                type: 'investigation',
                id: 'inv-secret',
                tenantId: 'tenant-1',
                classification: 'secret',
            };
            const unclassifiedResource = {
                type: 'investigation',
                id: 'inv-unclass',
                tenantId: 'tenant-1',
                classification: 'unclassified',
            };
            // Secret user can access secret resource
            const secretDecision = await rbac.evaluateAccess(secretUser, secretResource, 'read');
            (0, globals_1.expect)(secretDecision.allowed).toBe(true);
            // Unclassified user cannot access secret resource
            const unclassDecision = await rbac.evaluateAccess(unclassifiedUser, secretResource, 'read');
            (0, globals_1.expect)(unclassDecision.allowed).toBe(false);
            (0, globals_1.expect)(unclassDecision.reason).toBe('Insufficient clearance level');
            // Both can access unclassified resource
            const secretUnclassDecision = await rbac.evaluateAccess(secretUser, unclassifiedResource, 'read');
            const unclassUnclassDecision = await rbac.evaluateAccess(unclassifiedUser, unclassifiedResource, 'read');
            (0, globals_1.expect)(secretUnclassDecision.allowed).toBe(true);
            (0, globals_1.expect)(unclassUnclassDecision.allowed).toBe(true);
        });
    });
    (0, globals_1.describe)('Denied Environments', () => {
        (0, globals_1.beforeEach)(() => {
            rbac = new multi_tenant_rbac_js_1.MultiTenantRBACManager({
                enabled: true,
                enforceTenantIsolation: true,
                deniedEnvironments: ['ot:scada', 'ot:plc', 'restricted:'],
            });
        });
        (0, globals_1.it)('should block access to denied environments', () => {
            const user = {
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
            (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);
            // Denied OT systems should be blocked
            (0, globals_1.expect)(rbac.hasPermission(user, 'ot:scada:read', 'tenant-1')).toBe(false);
            (0, globals_1.expect)(rbac.hasPermission(user, 'ot:plc:write', 'tenant-1')).toBe(false);
            // Restricted prefix should be blocked
            (0, globals_1.expect)(rbac.hasPermission(user, 'restricted:data:read', 'tenant-1')).toBe(false);
        });
    });
    (0, globals_1.describe)('Role Expiration', () => {
        (0, globals_1.it)('should reject expired roles', () => {
            const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
            const user = {
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
            (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(false);
        });
        (0, globals_1.it)('should accept valid non-expired roles', () => {
            const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            const user = {
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
            (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);
        });
    });
    (0, globals_1.describe)('Step-Up Authentication', () => {
        (0, globals_1.it)('should require step-up for sensitive operations', async () => {
            const user = {
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
            const secretResource = {
                type: 'investigation',
                id: 'inv-secret',
                tenantId: 'tenant-1',
                classification: 'secret',
            };
            const decision = await rbac.evaluateAccess(user, secretResource, 'delete');
            (0, globals_1.expect)(decision.allowed).toBe(false);
            (0, globals_1.expect)(decision.stepUpRequired).toBe(true);
        });
        (0, globals_1.it)('should allow access after step-up verification', async () => {
            const user = {
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
            const secretResource = {
                type: 'investigation',
                id: 'inv-secret',
                tenantId: 'tenant-1',
                classification: 'secret',
            };
            const decision = await rbac.evaluateAccess(user, secretResource, 'delete');
            (0, globals_1.expect)(decision.allowed).toBe(true);
        });
    });
    (0, globals_1.describe)('Effective Permissions', () => {
        (0, globals_1.it)('should compute effective permissions correctly', () => {
            const user = {
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
            (0, globals_1.expect)(permissions).toContain('investigation:read');
            (0, globals_1.expect)(permissions).toContain('entity:read');
            (0, globals_1.expect)(permissions).toContain('copilot:query');
            // Should include custom permissions
            (0, globals_1.expect)(permissions).toContain('custom:permission');
            // Should not include admin permissions
            (0, globals_1.expect)(permissions).not.toContain('tenant:manage');
        });
    });
    (0, globals_1.describe)('Custom Roles', () => {
        (0, globals_1.it)('should allow adding custom roles', () => {
            rbac.addRole('custom-role', [
                'custom:read',
                'custom:write',
            ], ['viewer']);
            const user = {
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
            (0, globals_1.expect)(rbac.hasPermission(user, 'custom:read', 'tenant-1')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(user, 'custom:write', 'tenant-1')).toBe(true);
            // Inherited from viewer
            (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);
            (0, globals_1.expect)(rbac.hasPermission(user, 'dashboard:view', 'tenant-1')).toBe(true);
            // Not inherited
            (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:create', 'tenant-1')).toBe(false);
        });
    });
    (0, globals_1.describe)('Singleton Management', () => {
        (0, globals_1.it)('should return same instance', () => {
            const instance1 = (0, multi_tenant_rbac_js_1.getMultiTenantRBAC)();
            const instance2 = (0, multi_tenant_rbac_js_1.getMultiTenantRBAC)();
            (0, globals_1.expect)(instance1).toBe(instance2);
        });
        (0, globals_1.it)('should reset instance', () => {
            const instance1 = (0, multi_tenant_rbac_js_1.getMultiTenantRBAC)();
            (0, multi_tenant_rbac_js_1.resetMultiTenantRBAC)();
            const instance2 = (0, multi_tenant_rbac_js_1.getMultiTenantRBAC)();
            (0, globals_1.expect)(instance1).not.toBe(instance2);
        });
    });
});
