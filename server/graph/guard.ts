export function enforceTenantInCypher(query: string, tenant: string) {
  if (!/WHERE\s+tenant_id\s*=/.test(query))
    throw new Error('tenant_filter_required');
}
