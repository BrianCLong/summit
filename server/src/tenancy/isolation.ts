import { getPostgresPool } from '../db/postgres.js';

/**
 * sets the current tenant in the database session.
 * This should be used within a transaction or a dedicated client session.
 * NOTE: Since we use a connection pool, setting this on a client that is returned to the pool
 * can be dangerous if not reset.
 *
 * A safer approach with pg-pool is to use a client for a transaction and set it there.
 */
export async function setDbTenantContext(client: any, tenantId: string) {
  await client.query("SELECT set_current_tenant($1)", [tenantId]);
}

export async function clearDbTenantContext(client: any) {
  await client.query("SELECT set_config('app.current_tenant', '', false)");
}
