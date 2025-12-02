/**
 * Database Connection Manager
 * PostgreSQL connection for ESG Reporting Service
 */

import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class Database {
  private pool: pg.Pool | null = null;
  private isConnected = false;

  async connect(config?: Partial<DatabaseConfig>): Promise<void> {
    if (this.isConnected && this.pool) {
      logger.debug('Database already connected');
      return;
    }

    const dbConfig: DatabaseConfig = {
      host: config?.host || process.env.POSTGRES_HOST || 'localhost',
      port: config?.port || parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: config?.database || process.env.POSTGRES_DB || 'summit_dev',
      user: config?.user || process.env.POSTGRES_USER || 'summit',
      password: config?.password || process.env.POSTGRES_PASSWORD || 'devpassword',
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      max: config?.max || 20,
      idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config?.connectionTimeoutMillis || 10000,
    };

    try {
      this.pool = new Pool(dbConfig);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info({ host: dbConfig.host, database: dbConfig.database }, 'Database connected');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to database');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('Database disconnected');
    }
  }

  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        logger.warn(
          { duration, query: text.substring(0, 100) },
          'Slow query detected',
        );
      } else {
        logger.debug({ duration, rows: result.rowCount }, 'Query executed');
      }

      return result;
    } catch (error) {
      logger.error({ error, query: text.substring(0, 100) }, 'Query failed');
      throw error;
    }
  }

  async transaction<T>(
    callback: (client: pg.PoolClient) => Promise<T>,
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
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

  get connected(): boolean {
    return this.isConnected;
  }

  getPool(): pg.Pool | null {
    return this.pool;
  }
}

export const db = new Database();
export default db;
