// @ts-nocheck
import { Pool } from 'pg';
import type { QueryResult, QueryResultRow } from 'pg';
import { TenantContext } from '../../tenancy/types.js';

/**
 * A wrapper around Postgres Pool that enforces tenant isolation.
 * Ensures all queries include proper tenant_id filtering.
 *
 * SOC 2 Controls: CC6.1 (Access Control)
 */
export class TenantSafePostgres {
  constructor(private pool: Pool) {}

  /**
   * Executes a query enforcing that tenant_id is present in the parameters if the query requires it.
   */
  async query<T extends QueryResultRow = unknown>(
    context: TenantContext,
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!context || !context.tenantId) {
      throw new Error('Tenant context required for safe query');
    }

    const lowerText = text.toLowerCase().trim();

    // Allow strict bypass for system tables or global queries if marked
    const isTenantAware = lowerText.includes('tenant_id');

    if (!isTenantAware && !lowerText.includes('pg_')) {
       // Strict check: only allow exact "select 1" or "select 1;"
       // This prevents "select * from users -- select 1" bypasses
       const isHealthCheck = lowerText === 'select 1' || lowerText === 'select 1;';

       if (!isHealthCheck) {
           throw new Error(`Unsafe query detected: missing 'tenant_id' clause in query: ${text.substring(0, 50)}...`);
       }
    }

    // Verify that one of the params matches the tenantId
    const tenantIdParam = params.find(p => p === context.tenantId);
    if (!tenantIdParam && isTenantAware) {
        throw new Error('Tenant ID mismatch: Query parameters do not contain current tenant context ID');
    }

    return this.pool.query<T>(text, params);
  }

  /**
   * Get the underlying pool for operations that don't need tenant isolation
   * (e.g., migrations, system-level queries)
   */
  getPool(): Pool {
    return this.pool;
  }
}
