"use strict";
/**
 * Test Helpers for Tenant Context
 *
 * Provides utilities for creating mock tenant contexts in unit and integration tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_TENANTS = void 0;
exports.createTestTenantContext = createTestTenantContext;
exports.createMinimalTestContext = createMinimalTestContext;
exports.createMultiTenantContexts = createMultiTenantContexts;
exports.createAdminTenantContext = createAdminTenantContext;
exports.createViewerTenantContext = createViewerTenantContext;
exports.createServiceAccountContext = createServiceAccountContext;
exports.createApiKeyContext = createApiKeyContext;
exports.createStandardTestContexts = createStandardTestContexts;
const crypto_1 = require("crypto");
/**
 * Creates a mock tenant context for testing
 *
 * @example
 * ```typescript
 * const ctx = createTestTenantContext({ tenantId: 'tenant-a' });
 * const result = await repository.findById(ctx, 'some-id');
 * ```
 */
function createTestTenantContext(options = {}) {
    const tenantId = options.tenantId || `test-tenant-${(0, crypto_1.randomUUID)().substring(0, 8)}`;
    const userId = options.userId || `test-user-${(0, crypto_1.randomUUID)().substring(0, 8)}`;
    const principal = {
        kind: 'user',
        id: userId,
        tenantId,
        roles: options.roles || ['analyst'],
        scopes: options.scopes || ['graph:read', 'graph:write'],
        user: {
            email: options.email || `${userId}@test.example.com`,
            username: options.username || userId,
        },
        metadata: options.metadata,
    };
    return {
        tenantId,
        principal,
        requestId: options.requestId || `test-req-${(0, crypto_1.randomUUID)()}`,
        traceId: options.traceId || `test-trace-${(0, crypto_1.randomUUID)()}`,
        ipAddress: options.ipAddress || '127.0.0.1',
        userAgent: options.userAgent || 'test-agent',
        metadata: options.metadata,
    };
}
/**
 * Creates a minimal tenant context (for system operations)
 */
function createMinimalTestContext(tenantId, subjectId) {
    return {
        tenantId: tenantId || `test-tenant-${(0, crypto_1.randomUUID)().substring(0, 8)}`,
        subjectId: subjectId || 'system',
        requestId: `test-req-${(0, crypto_1.randomUUID)()}`,
        traceId: `test-trace-${(0, crypto_1.randomUUID)()}`,
    };
}
/**
 * Creates multiple tenant contexts for cross-tenant testing
 *
 * @example
 * ```typescript
 * const [tenantA, tenantB] = createMultiTenantContexts(['tenant-a', 'tenant-b']);
 * // Create data in tenant A
 * await repository.create(tenantA, { name: 'secret' });
 * // Attempt read from tenant B (should fail)
 * const result = await repository.findAll(tenantB);
 * expect(result).toHaveLength(0);
 * ```
 */
function createMultiTenantContexts(tenantIds) {
    return tenantIds.map((tenantId) => createTestTenantContext({ tenantId }));
}
/**
 * Creates a tenant context with admin role
 */
function createAdminTenantContext(options = {}) {
    return createTestTenantContext({
        ...options,
        roles: ['admin', 'tenant_admin'],
        scopes: ['*'], // Wildcard admin access
    });
}
/**
 * Creates a tenant context with viewer role (read-only)
 */
function createViewerTenantContext(options = {}) {
    return createTestTenantContext({
        ...options,
        roles: ['viewer'],
        scopes: ['graph:read', 'investigation:read', 'entity:read'],
    });
}
/**
 * Creates a tenant context for a service account
 */
function createServiceAccountContext(tenantId, serviceName) {
    const serviceId = serviceName || `test-service-${(0, crypto_1.randomUUID)().substring(0, 8)}`;
    const principal = {
        kind: 'service_account',
        id: serviceId,
        tenantId: tenantId || `test-tenant-${(0, crypto_1.randomUUID)().substring(0, 8)}`,
        roles: ['service_account'],
        scopes: ['graph:read', 'graph:write'],
        metadata: { serviceName: serviceId },
    };
    return {
        tenantId: principal.tenantId,
        principal,
        requestId: `svc-req-${(0, crypto_1.randomUUID)()}`,
        traceId: `svc-trace-${(0, crypto_1.randomUUID)()}`,
    };
}
/**
 * Creates a tenant context for API key authentication
 */
function createApiKeyContext(tenantId, keyLabel) {
    const keyId = `test-key-${(0, crypto_1.randomUUID)().substring(0, 8)}`;
    const principal = {
        kind: 'api_key',
        id: keyId,
        tenantId: tenantId || `test-tenant-${(0, crypto_1.randomUUID)().substring(0, 8)}`,
        roles: ['api_user'],
        scopes: ['graph:read', 'maestro:runs.create'],
        metadata: { keyLabel: keyLabel || 'test-api-key' },
    };
    return {
        tenantId: principal.tenantId,
        principal,
        requestId: `api-req-${(0, crypto_1.randomUUID)()}`,
        traceId: `api-trace-${(0, crypto_1.randomUUID)()}`,
    };
}
/**
 * Mock tenant IDs for testing
 */
exports.TEST_TENANTS = {
    TENANT_A: 'test-tenant-alpha',
    TENANT_B: 'test-tenant-beta',
    TENANT_C: 'test-tenant-gamma',
    GLOBAL: 'global',
};
/**
 * Creates contexts for the standard test tenants
 */
function createStandardTestContexts() {
    return {
        TENANT_A: createTestTenantContext({ tenantId: exports.TEST_TENANTS.TENANT_A }),
        TENANT_B: createTestTenantContext({ tenantId: exports.TEST_TENANTS.TENANT_B }),
        TENANT_C: createTestTenantContext({ tenantId: exports.TEST_TENANTS.TENANT_C }),
        GLOBAL: createTestTenantContext({ tenantId: exports.TEST_TENANTS.GLOBAL }),
    };
}
