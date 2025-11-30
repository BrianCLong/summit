/**
 * Database connection management for Model Hub Service
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger.js';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  ssl?: boolean | object;
}

class DatabaseConnection {
  private pool: Pool | null = null;
  private isConnected = false;
  private config: DatabaseConfig | null = null;

  async connect(config?: DatabaseConfig): Promise<void> {
    if (this.isConnected && this.pool) {
      return;
    }

    this.config = config || {
      host: process.env.MODEL_HUB_DB_HOST || process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.MODEL_HUB_DB_PORT || process.env.POSTGRES_PORT || '5432'),
      database: process.env.MODEL_HUB_DB_NAME || process.env.POSTGRES_DB || 'intelgraph',
      user: process.env.MODEL_HUB_DB_USER || process.env.POSTGRES_USER || 'intelgraph',
      password: process.env.MODEL_HUB_DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'password',
      maxConnections: parseInt(process.env.MODEL_HUB_DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMs: parseInt(process.env.MODEL_HUB_DB_IDLE_TIMEOUT_MS || '30000'),
      connectionTimeoutMs: parseInt(process.env.MODEL_HUB_DB_CONNECTION_TIMEOUT_MS || '10000'),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMs,
        connectionTimeoutMillis: this.config.connectionTimeoutMs,
        ssl: this.config.ssl,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info({
        message: 'Database connection established',
        host: this.config.host,
        database: this.config.database,
        port: this.config.port,
      });
    } catch (error) {
      logger.error({
        message: 'Failed to connect to database',
        error: error instanceof Error ? error.message : String(error),
        host: this.config.host,
        database: this.config.database,
      });
      throw error;
    }
  }

  async query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
    client?: PoolClient,
  ): Promise<QueryResult<T>> {
    if (!this.pool && !client) {
      throw new Error('Database pool not initialized');
    }

    const queryClient = client || this.pool;
    const startTime = Date.now();

    try {
      const result = await queryClient!.query<T>(text, params);

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        logger.warn({
          message: 'Slow database query',
          duration,
          query: text.substring(0, 200),
        });
      }

      return result;
    } catch (error) {
      logger.error({
        message: 'Database query failed',
        query: text.substring(0, 200),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        message: 'Database transaction failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<{ status: string; details?: Record<string, unknown> }> {
    try {
      if (!this.pool) {
        return { status: 'disconnected' };
      }

      const result = await this.query('SELECT version(), now() as current_time');
      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
          serverInfo: result.rows[0],
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('Database connection closed');
    }
  }

  getPool(): Pool | null {
    return this.pool;
  }
}

export const db = new DatabaseConnection();
