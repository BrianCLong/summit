"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock dependencies before imports
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        query: globals_1.jest.fn(),
        connect: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
    })),
}));
globals_1.jest.mock('../../auth/multi-tenant-rbac.js', () => {
    const mockRbacManager = {
        hasPermission: globals_1.jest.fn(),
        evaluateAccess: globals_1.jest.fn(),
    };
    return {
        getMultiTenantRBAC: globals_1.jest.fn(() => mockRbacManager),
        MultiTenantRBACManager: globals_1.jest.fn(() => mockRbacManager),
    };
});
globals_1.jest.mock('../../utils/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
const AuthorizationService_js_1 = require("../AuthorizationService.js");
const multi_tenant_rbac_js_1 = require("../../auth/multi-tenant-rbac.js");
(0, globals_1.describe)('AuthorizationService', () => {
    let authService;
    let mockRbac;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockRbac = {
            hasPermission: globals_1.jest.fn(),
            evaluateAccess: globals_1.jest.fn(),
        };
        multi_tenant_rbac_js_1.getMultiTenantRBAC.mockReturnValue(mockRbac);
        mockRbac = (0, multi_tenant_rbac_js_1.getMultiTenantRBAC)();
        authService = new AuthorizationService_js_1.AuthorizationServiceImpl();
    });
    (0, globals_1.describe)('can()', () => {
        const userPrincipal = {
            id: 'user-123',
            kind: 'user',
            tenantId: 'tenant-a',
            roles: ['analyst'],
            scopes: [],
            user: {
                email: 'analyst@example.com',
                username: 'analyst1',
            },
        };
        const resource = {
            type: 'investigation',
            id: 'inv-456',
            tenantId: 'tenant-a',
        };
        (0, globals_1.it)('allows access when principal has permission and passes OPA check', async () => {
            mockRbac.hasPermission.mockReturnValue(true);
            mockRbac.evaluateAccess.mockImplementation(() => Promise.resolve({ allowed: true }));
            const result = await authService.can(userPrincipal, 'view', resource);
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockRbac.hasPermission).toHaveBeenCalled();
            (0, globals_1.expect)(mockRbac.evaluateAccess).toHaveBeenCalled();
        });
        (0, globals_1.it)('denies access when RBAC permission check fails', async () => {
            mockRbac.hasPermission.mockReturnValue(false);
            const result = await authService.can(userPrincipal, 'delete', resource);
            (0, globals_1.expect)(result).toBe(false);
            (0, globals_1.expect)(mockRbac.evaluateAccess).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('denies cross-tenant access for regular users', async () => {
            const crossTenantResource = {
                type: 'investigation',
                id: 'inv-789',
                tenantId: 'tenant-b',
            };
            const result = await authService.can(userPrincipal, 'view', crossTenantResource);
            (0, globals_1.expect)(result).toBe(false);
            (0, globals_1.expect)(mockRbac.hasPermission).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('allows cross-tenant access for global-admin role', async () => {
            const globalAdminPrincipal = {
                ...userPrincipal,
                roles: ['global-admin'],
            };
            const crossTenantResource = {
                type: 'investigation',
                id: 'inv-789',
                tenantId: 'tenant-b',
            };
            mockRbac.hasPermission.mockReturnValue(true);
            mockRbac.evaluateAccess.mockImplementation(() => Promise.resolve({ allowed: true }));
            const result = await authService.can(globalAdminPrincipal, 'view', crossTenantResource);
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.describe)('action to permission mapping', () => {
            (0, globals_1.beforeEach)(() => {
                mockRbac.hasPermission.mockReturnValue(true);
                mockRbac.evaluateAccess.mockImplementation(() => Promise.resolve({ allowed: true }));
            });
            (0, globals_1.it)('maps view action to read permission', async () => {
                await authService.can(userPrincipal, 'view', resource);
                (0, globals_1.expect)(mockRbac.hasPermission).toHaveBeenCalledWith(globals_1.expect.anything(), 'investigation:read');
            });
            (0, globals_1.it)('maps create action to create permission', async () => {
                await authService.can(userPrincipal, 'create', resource);
                (0, globals_1.expect)(mockRbac.hasPermission).toHaveBeenCalledWith(globals_1.expect.anything(), 'investigation:create');
            });
            (0, globals_1.it)('maps delete action to delete permission', async () => {
                await authService.can(userPrincipal, 'delete', resource);
                (0, globals_1.expect)(mockRbac.hasPermission).toHaveBeenCalledWith(globals_1.expect.anything(), 'investigation:delete');
            });
        });
    });
    (0, globals_1.describe)('assertCan()', () => {
        const principal = {
            id: 'user-123',
            kind: 'user',
            tenantId: 'tenant-a',
            roles: ['analyst'],
            scopes: [],
        };
        const resource = {
            type: 'report',
            id: 'report-456',
            tenantId: 'tenant-a',
        };
        (0, globals_1.it)('does not throw when access is allowed', async () => {
            mockRbac.hasPermission.mockReturnValue(true);
            mockRbac.evaluateAccess.mockImplementation(() => Promise.resolve({ allowed: true }));
            await (0, globals_1.expect)(authService.assertCan(principal, 'view', resource)).resolves.not.toThrow();
        });
        (0, globals_1.it)('throws descriptive error when access is denied', async () => {
            mockRbac.hasPermission.mockReturnValue(false);
            await (0, globals_1.expect)(authService.assertCan(principal, 'delete', resource)).rejects.toThrow('Permission denied: Cannot delete report');
        });
    });
});
