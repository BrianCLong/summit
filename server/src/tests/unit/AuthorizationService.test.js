"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AuthorizationService_js_1 = require("../../services/AuthorizationService.js");
// Mock dependencies
const mockRBAC = {
    hasPermission: globals_1.jest.fn(),
    evaluateAccess: globals_1.jest.fn(),
};
globals_1.jest.mock('../../auth/multi-tenant-rbac.js', () => ({
    getMultiTenantRBAC: () => mockRBAC,
    MultiTenantRBACManager: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: () => ({
        query: globals_1.jest.fn(),
    }),
}));
(0, globals_1.describe)('AuthorizationServiceImpl', () => {
    let authzService;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        authzService = new AuthorizationService_js_1.AuthorizationServiceImpl();
    });
    const principal = {
        kind: 'user',
        id: 'user-123',
        tenantId: 'tenant-A',
        roles: ['analyst'],
        scopes: [],
        user: { email: 'test@example.com' },
    };
    test('can() allows access when tenant matches and RBAC allows', async () => {
        // Setup mock to return true for RBAC check
        mockRBAC.hasPermission.mockReturnValue(true);
        mockRBAC.evaluateAccess.mockResolvedValue({ allowed: true });
        const resource = {
            type: 'investigation',
            id: 'inv-1',
            tenantId: 'tenant-A',
        };
        const result = await authzService.can(principal, 'view', resource);
        (0, globals_1.expect)(result).toBe(true);
        (0, globals_1.expect)(mockRBAC.hasPermission).toHaveBeenCalledWith(globals_1.expect.objectContaining({ id: principal.id, tenantId: 'tenant-A' }), 'investigation:read' // mapped permission
        );
    });
    test('can() denies access when tenant mismatch', async () => {
        const resource = {
            type: 'investigation',
            id: 'inv-1',
            tenantId: 'tenant-B', // Different tenant
        };
        const result = await authzService.can(principal, 'view', resource);
        (0, globals_1.expect)(result).toBe(false);
        (0, globals_1.expect)(mockRBAC.hasPermission).not.toHaveBeenCalled();
    });
    test('can() allows cross-tenant access for global admin', async () => {
        const adminPrincipal = {
            ...principal,
            roles: ['global-admin'],
        };
        mockRBAC.hasPermission.mockReturnValue(true);
        mockRBAC.evaluateAccess.mockResolvedValue({ allowed: true });
        const resource = {
            type: 'investigation',
            id: 'inv-1',
            tenantId: 'tenant-B', // Different tenant
        };
        const result = await authzService.can(adminPrincipal, 'view', resource);
        (0, globals_1.expect)(result).toBe(true);
        (0, globals_1.expect)(mockRBAC.hasPermission).toHaveBeenCalled();
    });
    test('assertCan() throws on denial', async () => {
        mockRBAC.hasPermission.mockReturnValue(false);
        const resource = {
            type: 'investigation',
            id: 'inv-1',
            tenantId: 'tenant-A',
        };
        await (0, globals_1.expect)(authzService.assertCan(principal, 'view', resource))
            .rejects.toThrow('Permission denied');
    });
});
