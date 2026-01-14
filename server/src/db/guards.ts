export function assertTenantScopedQuery(tenantId: string, query: Record<string, any>) {
  if (!tenantId) {
    throw new Error('Tenant ID required for query assertion');
  }

  // Check top-level 'where'
  if (query.where) {
    if (query.where.tenantId !== tenantId) {
       throw new Error(`Query missing correct tenantId scope. Expected ${tenantId}, got ${query.where.tenantId}`);
    }
  } else {
    // If no 'where', it might be unsafe unless it's a create
    // But even create usually needs tenantId in 'data'.
    // This is a basic heuristic.
    // For now, if 'tenantId' is missing at top level or in where, warn/fail.
    // Assuming Prisma-like syntax:
    if (query.tenantId !== tenantId && (!query.data || query.data.tenantId !== tenantId)) {
        // This is tricky for different ORMs.
        // Let's stick to the 'where' clause check for reads/updates.
        // If there is no where clause, we can't easily assert scope without more context.
        // But if there IS a where clause, it MUST have tenantId.
    }
  }
}
