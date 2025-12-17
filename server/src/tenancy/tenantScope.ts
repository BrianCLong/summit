import logger from '../config/logger.js';

export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default_tenant';

export interface TenantScopedRow {
  tenant_id?: string | null;
}

export const resolveTenantId = (
  tenantId?: string | null,
  resource?: string,
): string => {
  const resolved = tenantId || DEFAULT_TENANT_ID;

  if (!resolved) {
    logger.error({ resource }, 'Tenant context is missing for scoped operation');
    throw new TenantScopeError('Tenant context is required for multi-tenant operations');
  }

  return resolved;
};

export const appendTenantFilter = (
  query: string,
  parameterPosition: number,
  column = 'tenant_id',
): string => {
  const clause = `${column} = $${parameterPosition}`;
  const normalized = query.toLowerCase();
  const hasWhere = normalized.includes(' where ');
  const hasWhereKeyword = normalized.includes('\nwhere ');

  if (hasWhere || hasWhereKeyword || normalized.includes(' where')) {
    return `${query} AND ${clause}`;
  }

  return `${query} WHERE ${clause}`;
};

export const assertTenantMatch = (
  rowTenantId: string | null | undefined,
  expectedTenantId: string,
  resource: string,
): void => {
  if (rowTenantId && rowTenantId !== expectedTenantId) {
    logger.error(
      { rowTenantId, expectedTenantId, resource },
      'Cross-tenant data detected',
    );
    throw new TenantScopeError(
      `Cross-tenant data access blocked for ${resource} (expected ${expectedTenantId}, found ${rowTenantId})`,
    );
  }
};
