import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
}

class Database {
  private pool: pg.Pool | null = null;
  private isConnected = false;

  async connect(dbConfig?: Partial<DatabaseConfig>): Promise<void> {
    if (this.isConnected && this.pool) {
      return;
    }

    const poolConfig: pg.PoolConfig = {
      host: dbConfig?.host ?? config.postgres.host,
      port: dbConfig?.port ?? config.postgres.port,
      database: dbConfig?.database ?? config.postgres.database,
      user: dbConfig?.user ?? config.postgres.user,
      password: dbConfig?.password ?? config.postgres.password,
      max: dbConfig?.max ?? config.postgres.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.pool = new Pool(poolConfig);

    // Test connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      this.isConnected = true;
      logger.info(
        { host: poolConfig.host, database: poolConfig.database },
        'Database connected',
      );
    } finally {
      client.release();
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database pool error');
    });
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
          { query: text.substring(0, 100), duration },
          'Slow query detected',
        );
      }

      return result;
    } catch (error) {
      logger.error({ query: text.substring(0, 100), error }, 'Query failed');
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

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('Database disconnected');
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.pool || !this.isConnected) {
      return false;
    }
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export const db = new Database();
