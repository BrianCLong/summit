"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const can_1 = require("../../server/src/authz/can");
const permissions_1 = require("../../server/src/authz/permissions");
describe('authorization helper', () => {
    const tenantContext = {
        role: permissions_1.Role.ADMIN,
        tenantId: 'tenant-a',
        resourceTenantId: 'tenant-a',
    };
    it('denies when the role is missing a permission with a stable error reason', () => {
        const result = (0, can_1.can)(permissions_1.Permission.WRITE_TENANT_DATA, {
            ...tenantContext,
            role: permissions_1.Role.VIEWER,
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('role_missing_permission');
        expect(result.permission).toBe(permissions_1.Permission.WRITE_TENANT_DATA);
        expect(result.role).toBe(permissions_1.Role.VIEWER);
    });
    it('allows when the role includes the permission', () => {
        const result = (0, can_1.can)(permissions_1.Permission.WRITE_TENANT_DATA, tenantContext);
        expect(result.allowed).toBe(true);
    });
    it('prevents cross-tenant access even when the role has permission', () => {
        const result = (0, can_1.can)(permissions_1.Permission.READ_TENANT_DATA, {
            ...tenantContext,
            resourceTenantId: 'tenant-b',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('cross_tenant_denied');
    });
});
