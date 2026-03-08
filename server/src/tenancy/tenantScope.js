"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTenantMatch = exports.appendTenantFilter = exports.resolveTenantId = exports.TenantScopeError = void 0;
const logger_js_1 = __importDefault(require("../config/logger.js"));
class TenantScopeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TenantScopeError';
    }
}
exports.TenantScopeError = TenantScopeError;
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default_tenant';
const resolveTenantId = (tenantId, resource) => {
    const resolved = tenantId || DEFAULT_TENANT_ID;
    if (!resolved) {
        logger_js_1.default.error({ resource }, 'Tenant context is missing for scoped operation');
        throw new TenantScopeError('Tenant context is required for multi-tenant operations');
    }
    return resolved;
};
exports.resolveTenantId = resolveTenantId;
const appendTenantFilter = (query, parameterPosition, column = 'tenant_id') => {
    const clause = `${column} = $${parameterPosition}`;
    const normalized = query.toLowerCase();
    const hasWhere = normalized.includes(' where ');
    const hasWhereKeyword = normalized.includes('\nwhere ');
    if (hasWhere || hasWhereKeyword || normalized.includes(' where')) {
        return `${query} AND ${clause}`;
    }
    return `${query} WHERE ${clause}`;
};
exports.appendTenantFilter = appendTenantFilter;
const assertTenantMatch = (rowTenantId, expectedTenantId, resource) => {
    if (rowTenantId && rowTenantId !== expectedTenantId) {
        logger_js_1.default.error({ rowTenantId, expectedTenantId, resource }, 'Cross-tenant data detected');
        throw new TenantScopeError(`Cross-tenant data access blocked for ${resource} (expected ${expectedTenantId}, found ${rowTenantId})`);
    }
};
exports.assertTenantMatch = assertTenantMatch;
