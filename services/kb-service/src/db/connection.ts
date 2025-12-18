/**
 * Database Connection Pool
 * PostgreSQL connection management for KB service
 */

import pg from 'pg';

const { Pool } = pg;

export interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

let pool: pg.Pool | null = null;

export function getDBConfig(): DBConfig {
  return {
    host: process.env.KB_DB_HOST || process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.KB_DB_NAME || process.env.POSTGRES_DB || 'intelgraph',
    user: process.env.KB_DB_USER || process.env.POSTGRES_USER || 'postgres',
    password: process.env.KB_DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
    max: parseInt(process.env.KB_DB_POOL_SIZE || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

export function getPool(): pg.Pool {
  if (!pool) {
    const config = getDBConfig();
    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const client = await getPool().connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 AS health');
    return result.rows.length === 1;
  } catch {
    return false;
  }
}
