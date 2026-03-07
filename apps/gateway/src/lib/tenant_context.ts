export interface TenantContext {
  tenantId: string;
}

export function requireTenant(
  headers: Record<string, string | string[] | undefined>
): TenantContext {
  const candidate = headers["x-tenant-id"] || headers["x-tenant"];
  const tenantId = Array.isArray(candidate) ? candidate[0] : candidate;
  if (!tenantId) {
    throw new Error("Tenant header is required for data access");
  }
  return { tenantId };
}

export function withTenant<T extends { [key: string]: unknown }>(
  tenant: TenantContext,
  payload: T
): T {
  return { ...payload, tenantId: tenant.tenantId };
}
