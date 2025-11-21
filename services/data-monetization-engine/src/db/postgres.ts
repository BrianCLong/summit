import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger.js';

class PostgreSQLConnection {
  private pool: Pool | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.pool) return;

    const config = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'intelgraph',
      user: process.env.POSTGRES_USER || 'intelgraph',
      password: process.env.POSTGRES_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    try {
      this.pool = new Pool(config);
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('PostgreSQL connected');
    } catch (error) {
      logger.error({ error }, 'PostgreSQL connection failed');
      throw error;
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) throw new Error('Database not connected');
    return this.pool.query(text, params);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('Database not connected');
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

  async healthCheck(): Promise<{ status: string }> {
    try {
      await this.query('SELECT 1');
      return { status: 'healthy' };
    } catch {
      return { status: 'unhealthy' };
    }
  }
}

export const postgresConnection = new PostgreSQLConnection();
