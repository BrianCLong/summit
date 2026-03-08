"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const multi_tenant_rbac_1 = require("../../src/auth/multi-tenant-rbac");
// Mock logger
globals_1.jest.mock('../../src/config/logger.js', () => ({
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
}));
(0, globals_1.describe)('MultiTenantRBACManager', () => {
    let rbac;
    (0, globals_1.beforeEach)(() => {
        rbac = new multi_tenant_rbac_1.MultiTenantRBACManager({ enabled: true });
    });
    const createMockUser = (roles = [], globalRoles = []) => ({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        primaryTenantId: 'tenant-1',
        roles: roles,
        globalRoles: globalRoles,
        attributes: {},
        clearanceLevel: 'unclassified',
        lastAuthenticated: new Date(),
        mfaVerified: true,
    });
    (0, globals_1.it)('should allow access if user has permission', () => {
        const user = createMockUser([
            { tenantId: 'tenant-1', role: 'viewer', permissions: [], scope: 'full', grantedBy: 'admin', grantedAt: new Date() }
        ]);
        // viewer has 'investigation:read'
        (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);
    });
    (0, globals_1.it)('should deny access if user lacks permission', () => {
        const user = createMockUser([
            { tenantId: 'tenant-1', role: 'viewer', permissions: [], scope: 'full', grantedBy: 'admin', grantedAt: new Date() }
        ]);
        // viewer does NOT have 'investigation:create'
        (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:create', 'tenant-1')).toBe(false);
    });
    (0, globals_1.it)('should allow access for global admin', () => {
        const user = createMockUser([], ['global-admin']);
        (0, globals_1.expect)(rbac.hasPermission(user, 'anything:do', 'tenant-1')).toBe(true);
    });
    (0, globals_1.it)('should enforce tenant isolation', () => {
        const user = createMockUser([
            { tenantId: 'tenant-1', role: 'admin', permissions: ['*'], scope: 'full', grantedBy: 'admin', grantedAt: new Date() }
        ]);
        // User has admin in tenant-1, but checks permission in tenant-2
        // roles filter matches tenantId. If no role in tenant-2, denied.
        (0, globals_1.expect)(rbac.hasPermission(user, 'investigation:read', 'tenant-2')).toBe(false);
    });
});
