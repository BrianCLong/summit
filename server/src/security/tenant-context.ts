/**
 * Tenant Context - Canonical identity claims for request/operation attribution
 *
 * This context MUST be present for all data access operations to enforce
 * multi-tenant isolation and provide audit trail correlation.
 */

import { TenantId, UserId, Principal } from '../types/identity.js';

/**
 * Core tenant execution context
 * Every data access operation MUST include this context
 */
export interface TenantContext {
  /** Required: The tenant ID this operation is scoped to */
  tenantId: TenantId;

  /** Required: The principal (user/service/API key) performing this operation */
  principal: Principal;

  /** Required: Request/operation correlation ID for tracing */
  requestId: string;

  /** Optional: Distributed trace ID (for OpenTelemetry/Jaeger) */
  traceId?: string;

  /** Optional: IP address of the originating request */
  ipAddress?: string;

  /** Optional: User agent of the originating request */
  userAgent?: string;

  /** Optional: Additional context for audit/logging */
  metadata?: Record<string, unknown>;
}

/**
 * Minimal tenant context for scenarios where full principal is not available
 * (e.g., system background jobs, migrations)
 */
export interface MinimalTenantContext {
  tenantId: TenantId;
  subjectId?: string; // User ID or service account ID
  requestId: string;
  traceId?: string;
}

/**
 * Error thrown when tenant context is missing or invalid
 */
export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

/**
 * Error thrown when attempting cross-tenant access
 */
export class CrossTenantAccessError extends Error {
  constructor(
    public readonly attemptedTenantId: TenantId,
    public readonly contextTenantId: TenantId,
    public readonly resourceType: string,
    public readonly resourceId?: string,
  ) {
    super(
      `Cross-tenant access denied: context tenant ${contextTenantId} attempted to access ${resourceType}${resourceId ? `:${resourceId}` : ''} in tenant ${attemptedTenantId}`
    );
    this.name = 'CrossTenantAccessError';
  }
}

/**
 * Validates that a tenant context is complete and valid
 */
export function validateTenantContext(
  context: TenantContext | MinimalTenantContext | undefined | null
): asserts context is TenantContext | MinimalTenantContext {
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
export function assertSameTenant(
  context: TenantContext | MinimalTenantContext,
  resourceTenantId: TenantId,
  resourceType: string,
  resourceId?: string
): void {
  if (context.tenantId !== resourceTenantId) {
    throw new CrossTenantAccessError(
      resourceTenantId,
      context.tenantId,
      resourceType,
      resourceId
    );
  }
}

/**
 * Type guard to check if context is a full TenantContext
 */
export function isFullTenantContext(
  context: TenantContext | MinimalTenantContext
): context is TenantContext {
  return 'principal' in context && context.principal !== undefined;
}
