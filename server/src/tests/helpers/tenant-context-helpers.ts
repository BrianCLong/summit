/**
 * Test Helpers for Tenant Context
 *
 * Provides utilities for creating mock tenant contexts in unit and integration tests
 */

import { randomUUID } from 'crypto';
import {
  TenantContext,
  MinimalTenantContext,
} from '../../security/tenant-context.js';
import { Principal, TenantId, UserId } from '../../types/identity.js';

/**
 * Options for creating a test tenant context
 */
export interface TestTenantContextOptions {
  tenantId?: TenantId;
  userId?: UserId;
  roles?: string[];
  scopes?: string[];
  email?: string;
  username?: string;
  requestId?: string;
  traceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a mock tenant context for testing
 *
 * @example
 * ```typescript
 * const ctx = createTestTenantContext({ tenantId: 'tenant-a' });
 * const result = await repository.findById(ctx, 'some-id');
 * ```
 */
export function createTestTenantContext(
  options: TestTenantContextOptions = {}
): TenantContext {
  const tenantId = options.tenantId || `test-tenant-${randomUUID().substring(0, 8)}`;
  const userId = options.userId || `test-user-${randomUUID().substring(0, 8)}`;

  const principal: Principal = {
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
    requestId: options.requestId || `test-req-${randomUUID()}`,
    traceId: options.traceId || `test-trace-${randomUUID()}`,
    ipAddress: options.ipAddress || '127.0.0.1',
    userAgent: options.userAgent || 'test-agent',
    metadata: options.metadata,
  };
}

/**
 * Creates a minimal tenant context (for system operations)
 */
export function createMinimalTestContext(
  tenantId?: TenantId,
  subjectId?: string
): MinimalTenantContext {
  return {
    tenantId: tenantId || `test-tenant-${randomUUID().substring(0, 8)}`,
    subjectId: subjectId || 'system',
    requestId: `test-req-${randomUUID()}`,
    traceId: `test-trace-${randomUUID()}`,
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
export function createMultiTenantContexts(
  tenantIds: TenantId[]
): TenantContext[] {
  return tenantIds.map((tenantId) =>
    createTestTenantContext({ tenantId })
  );
}

/**
 * Creates a tenant context with admin role
 */
export function createAdminTenantContext(
  options: Omit<TestTenantContextOptions, 'roles' | 'scopes'> = {}
): TenantContext {
  return createTestTenantContext({
    ...options,
    roles: ['admin', 'tenant_admin'],
    scopes: ['*'], // Wildcard admin access
  });
}

/**
 * Creates a tenant context with viewer role (read-only)
 */
export function createViewerTenantContext(
  options: Omit<TestTenantContextOptions, 'roles' | 'scopes'> = {}
): TenantContext {
  return createTestTenantContext({
    ...options,
    roles: ['viewer'],
    scopes: ['graph:read', 'investigation:read', 'entity:read'],
  });
}

/**
 * Creates a tenant context for a service account
 */
export function createServiceAccountContext(
  tenantId?: TenantId,
  serviceName?: string
): TenantContext {
  const serviceId = serviceName || `test-service-${randomUUID().substring(0, 8)}`;

  const principal: Principal = {
    kind: 'service_account',
    id: serviceId,
    tenantId: tenantId || `test-tenant-${randomUUID().substring(0, 8)}`,
    roles: ['service_account'],
    scopes: ['graph:read', 'graph:write'],
    metadata: { serviceName: serviceId },
  };

  return {
    tenantId: principal.tenantId,
    principal,
    requestId: `svc-req-${randomUUID()}`,
    traceId: `svc-trace-${randomUUID()}`,
  };
}

/**
 * Creates a tenant context for API key authentication
 */
export function createApiKeyContext(
  tenantId?: TenantId,
  keyLabel?: string
): TenantContext {
  const keyId = `test-key-${randomUUID().substring(0, 8)}`;

  const principal: Principal = {
    kind: 'api_key',
    id: keyId,
    tenantId: tenantId || `test-tenant-${randomUUID().substring(0, 8)}`,
    roles: ['api_user'],
    scopes: ['graph:read', 'maestro:runs.create'],
    metadata: { keyLabel: keyLabel || 'test-api-key' },
  };

  return {
    tenantId: principal.tenantId,
    principal,
    requestId: `api-req-${randomUUID()}`,
    traceId: `api-trace-${randomUUID()}`,
  };
}

/**
 * Mock tenant IDs for testing
 */
export const TEST_TENANTS = {
  TENANT_A: 'test-tenant-alpha',
  TENANT_B: 'test-tenant-beta',
  TENANT_C: 'test-tenant-gamma',
  GLOBAL: 'global',
} as const;

/**
 * Creates contexts for the standard test tenants
 */
export function createStandardTestContexts(): Record<
  keyof typeof TEST_TENANTS,
  TenantContext
> {
  return {
    TENANT_A: createTestTenantContext({ tenantId: TEST_TENANTS.TENANT_A }),
    TENANT_B: createTestTenantContext({ tenantId: TEST_TENANTS.TENANT_B }),
    TENANT_C: createTestTenantContext({ tenantId: TEST_TENANTS.TENANT_C }),
    GLOBAL: createTestTenantContext({ tenantId: TEST_TENANTS.GLOBAL }),
  };
}
