/**
 * Data Factory Service - Database Connection
 *
 * PostgreSQL connection pool management with health checking and graceful shutdown.
 */

import pg from 'pg';
import pino from 'pino';

const { Pool } = pg;

const logger = pino({
  name: 'data-factory-db',
  level: process.env.LOG_LEVEL || 'info',
});

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  ssl?: boolean;
}

const defaultConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'intelgraph_data_factory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'devpassword',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
  ssl: process.env.DB_SSL === 'true',
};

let pool: pg.Pool | null = null;

export function createPool(config: Partial<DatabaseConfig> = {}): pg.Pool {
  const finalConfig = { ...defaultConfig, ...config };

  pool = new Pool({
    host: finalConfig.host,
    port: finalConfig.port,
    database: finalConfig.database,
    user: finalConfig.user,
    password: finalConfig.password,
    max: finalConfig.maxConnections,
    idleTimeoutMillis: finalConfig.idleTimeoutMs,
    connectionTimeoutMillis: finalConfig.connectionTimeoutMs,
    ssl: finalConfig.ssl ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('connect', () => {
    logger.debug('New client connected to database');
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle client');
  });

  pool.on('remove', () => {
    logger.debug('Client removed from pool');
  });

  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;

  logger.debug({
    query: text.slice(0, 100),
    duration,
    rows: result.rowCount,
  }, 'Executed query');

  return result;
}

export async function getClient(): Promise<pg.PoolClient> {
  return getPool().connect();
}

export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
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

export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency: number;
  poolSize: number;
  idleCount: number;
  waitingCount: number;
}> {
  const start = Date.now();
  try {
    await query('SELECT 1');
    const p = getPool();
    return {
      status: 'healthy',
      latency: Date.now() - start,
      poolSize: p.totalCount,
      idleCount: p.idleCount,
      waitingCount: p.waitingCount,
    };
  } catch {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      poolSize: 0,
      idleCount: 0,
      waitingCount: 0,
    };
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    logger.info('Closing database pool');
    await pool.end();
    pool = null;
  }
}

export default {
  createPool,
  getPool,
  query,
  getClient,
  transaction,
  healthCheck,
  closePool,
};
