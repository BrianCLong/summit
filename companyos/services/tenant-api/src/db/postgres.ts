/**
 * CompanyOS Tenant API - PostgreSQL Connection
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:devpassword@localhost:5432/intelgraph',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[tenant-api] Unexpected PostgreSQL error:', err);
});

export { pool };

export async function healthCheck(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('[tenant-api] PostgreSQL health check failed:', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
