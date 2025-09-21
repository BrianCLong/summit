import { Pool, PoolClient } from 'pg';

// It is recommended to use a single pool instance for the entire application.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Executes a database operation within a tenant-specific context.
 * It sets a session variable `app.tenant_id` which is used by RLS policies.
 * 
 * @param tenantId The UUID of the tenant to scope the operation to.
 * @param fn A function that takes a connected and authorized client and performs DB operations.
 * @returns The result of the callback function.
 */
export async function withTenant<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    // Set the tenant_id for the current session. RLS policies will use this.
    await client.query(`SET LOCAL app.tenant_id = $1`, [tenantId]);
    return await fn(client);
  } finally {
    // Release the client back to the pool. The session-local setting is automatically discarded.
    client.release();
  }
}
