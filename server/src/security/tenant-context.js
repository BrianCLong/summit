"use strict";
/**
 * Tenant Context - Canonical identity claims for request/operation attribution
 *
 * This context MUST be present for all data access operations to enforce
 * multi-tenant isolation and provide audit trail correlation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossTenantAccessError = exports.TenantContextError = void 0;
exports.validateTenantContext = validateTenantContext;
exports.assertSameTenant = assertSameTenant;
exports.isFullTenantContext = isFullTenantContext;
/**
 * Error thrown when tenant context is missing or invalid
 */
class TenantContextError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TenantContextError';
    }
}
exports.TenantContextError = TenantContextError;
/**
 * Error thrown when attempting cross-tenant access
 */
class CrossTenantAccessError extends Error {
    attemptedTenantId;
    contextTenantId;
    resourceType;
    resourceId;
    constructor(attemptedTenantId, contextTenantId, resourceType, resourceId) {
        super(`Cross-tenant access denied: context tenant ${contextTenantId} attempted to access ${resourceType}${resourceId ? `:${resourceId}` : ''} in tenant ${attemptedTenantId}`);
        this.attemptedTenantId = attemptedTenantId;
        this.contextTenantId = contextTenantId;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.name = 'CrossTenantAccessError';
    }
}
exports.CrossTenantAccessError = CrossTenantAccessError;
/**
 * Validates that a tenant context is complete and valid
 */
function validateTenantContext(context) {
    if (!context) {
        throw new TenantContextError('Tenant context is required but was not provided');
    }
    if (!context.tenantId) {
        throw new TenantContextError('Tenant context must include tenantId');
    }
    if (!context.requestId) {
        throw new TenantContextError('Tenant context must include requestId for audit correlation');
    }
}
/**
 * Asserts that a resource belongs to the context tenant
 * Throws CrossTenantAccessError if there's a mismatch
 */
function assertSameTenant(context, resourceTenantId, resourceType, resourceId) {
    if (context.tenantId !== resourceTenantId) {
        throw new CrossTenantAccessError(resourceTenantId, context.tenantId, resourceType, resourceId);
    }
}
/**
 * Type guard to check if context is a full TenantContext
 */
function isFullTenantContext(context) {
    return 'principal' in context && context.principal !== undefined;
}
