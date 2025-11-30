import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger.js';

const log = logger.child({ module: 'postgres' });

let pool: Pool | null = null;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

function getDefaultConfig(): DatabaseConfig {
  return {
    host: process.env.CONFIG_DB_HOST || process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(
      process.env.CONFIG_DB_PORT || process.env.POSTGRES_PORT || '5432',
      10,
    ),
    database:
      process.env.CONFIG_DB_NAME ||
      process.env.POSTGRES_DB ||
      'intelgraph_config',
    user:
      process.env.CONFIG_DB_USER || process.env.POSTGRES_USER || 'intelgraph',
    password:
      process.env.CONFIG_DB_PASSWORD ||
      process.env.POSTGRES_PASSWORD ||
      'devpassword',
    maxConnections: parseInt(
      process.env.CONFIG_DB_MAX_CONNECTIONS || '20',
      10,
    ),
    idleTimeoutMs: parseInt(
      process.env.CONFIG_DB_IDLE_TIMEOUT_MS || '30000',
      10,
    ),
    connectionTimeoutMs: parseInt(
      process.env.CONFIG_DB_CONNECTION_TIMEOUT_MS || '5000',
      10,
    ),
  };
}

export function initializePool(config?: Partial<DatabaseConfig>): Pool {
  if (pool) {
    return pool;
  }

  const fullConfig = { ...getDefaultConfig(), ...config };

  pool = new Pool({
    host: fullConfig.host,
    port: fullConfig.port,
    database: fullConfig.database,
    user: fullConfig.user,
    password: fullConfig.password,
    max: fullConfig.maxConnections,
    idleTimeoutMillis: fullConfig.idleTimeoutMs,
    connectionTimeoutMillis: fullConfig.connectionTimeoutMs,
    application_name: 'config-service',
  });

  pool.on('error', (err) => {
    log.error({ err }, 'Unexpected PostgreSQL client error');
  });

  pool.on('connect', () => {
    log.debug('New PostgreSQL client connected');
  });

  log.info(
    { host: fullConfig.host, database: fullConfig.database },
    'PostgreSQL pool initialized',
  );

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    return initializePool();
  }
  return pool;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const p = getPool();
  const start = Date.now();
  try {
    const result = await p.query<T>(text, params);
    const duration = Date.now() - start;
    log.debug(
      { duration, rows: result.rowCount, query: text.substring(0, 100) },
      'Query executed',
    );
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    log.error({ err, duration, query: text.substring(0, 100) }, 'Query failed');
    throw err;
  }
}

export async function getClient(): Promise<PoolClient> {
  const p = getPool();
  return p.connect();
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    log.info('PostgreSQL pool closed');
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1');
    return result.rowCount === 1;
  } catch {
    return false;
  }
}
