import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'intelgraph',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: parseInt(process.env.POSTGRES_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

export const db = {
  /**
   * Execute a query with parameters
   */
  query: async <T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 100) {
        logger.warn('Slow query detected', {
          duration,
          query: text.substring(0, 200),
        });
      }

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount,
      };
    } catch (error) {
      logger.error('Query execution failed', {
        query: text.substring(0, 200),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  /**
   * Execute a transaction with multiple queries
   */
  transaction: async <T>(
    fn: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get a client for manual transaction management
   */
  getClient: async (): Promise<pg.PoolClient> => {
    return pool.connect();
  },

  /**
   * Close all connections
   */
  end: async (): Promise<void> => {
    await pool.end();
    logger.info('Database pool closed');
  },

  /**
   * Check if database is healthy
   */
  healthCheck: async (): Promise<boolean> => {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  },
};
