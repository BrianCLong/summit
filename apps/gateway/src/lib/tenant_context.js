"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenant = requireTenant;
exports.withTenant = withTenant;
function requireTenant(headers) {
    const candidate = headers['x-tenant-id'] || headers['x-tenant'];
    const tenantId = Array.isArray(candidate) ? candidate[0] : candidate;
    if (!tenantId) {
        throw new Error('Tenant header is required for data access');
    }
    return { tenantId };
}
function withTenant(tenant, payload) {
    return { ...payload, tenantId: tenant.tenantId };
}
