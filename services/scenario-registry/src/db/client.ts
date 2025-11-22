/**
 * PostgreSQL database client for scenario registry
 */

import pg from 'pg';
import { pino } from 'pino';

const { Pool } = pg;

const logger = pino({ name: 'scenario-registry:db' });

/**
 * Database configuration
 */
export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Get database configuration from environment
 */
export function getDbConfig(): DbConfig {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'intelgraph',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
  };
}

/**
 * Database connection pool
 */
export class DbClient {
  private pool: pg.Pool;

  constructor(config: DbConfig) {
    this.pool = new Pool(config);

    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database pool error');
    });

    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    this.pool.on('remove', () => {
      logger.debug('Database connection removed from pool');
    });
  }

  /**
   * Execute a query
   */
  async query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug({ query: text, duration, rows: result.rowCount }, 'Executed query');
      return result;
    } catch (err) {
      logger.error({ err, query: text }, 'Query failed');
      throw err;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<pg.PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute a callback within a transaction
   */
  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1');
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (err) {
      logger.error({ err }, 'Database health check failed');
      return { healthy: false, latency: Date.now() - start };
    }
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

/**
 * Singleton database client instance
 */
let dbClientInstance: DbClient | null = null;

/**
 * Get or create the database client instance
 */
export function getDbClient(): DbClient {
  if (!dbClientInstance) {
    const config = getDbConfig();
    dbClientInstance = new DbClient(config);
  }
  return dbClientInstance;
}

/**
 * Close the database client instance
 */
export async function closeDbClient(): Promise<void> {
  if (dbClientInstance) {
    await dbClientInstance.close();
    dbClientInstance = null;
  }
}
