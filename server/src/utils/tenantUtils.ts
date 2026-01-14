import { TenantContext } from '../middleware/tenantContext.js';

/**
 * Asserts that the provided context has a valid tenantId.
 * @throws Error if tenantId is missing
 */
export function requireTenant(ctx: Partial<TenantContext> | undefined): asserts ctx is TenantContext {
  if (!ctx || !ctx.tenantId) {
    const error = new Error('Tenant context required');
    (error as any).status = 400;
    (error as any).code = 'TENANT_REQUIRED';
    throw error;
  }
}

/**
 * Returns the tenantId from the context, throwing if missing.
 */
export function getTenantId(ctx: Partial<TenantContext> | undefined): string {
  requireTenant(ctx);
  return ctx.tenantId;
}
