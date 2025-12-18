/**
 * Database Connection Manager
 *
 * Manages PostgreSQL connection pools for the ER service.
 */

import { Pool, PoolClient } from 'pg';
import pino from 'pino';

const logger = pino({ name: 'ERDatabase' });

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

export class DatabaseManager {
  private writePool: Pool;
  private readPool: Pool;
  private initialized = false;

  constructor(config: DatabaseConfig) {
    const poolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      idleTimeoutMillis: config.idleTimeoutMs ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMs ?? 5000,
    };

    this.writePool = new Pool({
      ...poolConfig,
      max: config.maxConnections ?? 20,
    });

    this.readPool = new Pool({
      ...poolConfig,
      max: (config.maxConnections ?? 20) * 1.5,
    });

    this.writePool.on('error', (err) => {
      logger.error({ err }, 'Write pool error');
    });

    this.readPool.on('error', (err) => {
      logger.error({ err }, 'Read pool error');
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test connections
      const writeClient = await this.writePool.connect();
      await writeClient.query('SELECT 1');
      writeClient.release();

      const readClient = await this.readPool.connect();
      await readClient.query('SELECT 1');
      readClient.release();

      this.initialized = true;
      logger.info('Database connections established');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize database connections');
      throw error;
    }
  }

  async getWriteClient(): Promise<PoolClient> {
    return this.writePool.connect();
  }

  async getReadClient(): Promise<PoolClient> {
    return this.readPool.connect();
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = await this.readPool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async execute(sql: string, params?: unknown[]): Promise<number> {
    const client = await this.writePool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rowCount ?? 0;
    } finally {
      client.release();
    }
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.writePool.connect();
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
  }

  async close(): Promise<void> {
    await Promise.all([this.writePool.end(), this.readPool.end()]);
    this.initialized = false;
    logger.info('Database connections closed');
  }
}

let dbManager: DatabaseManager | null = null;

export function initializeDatabase(config: DatabaseConfig): DatabaseManager {
  if (dbManager) {
    return dbManager;
  }
  dbManager = new DatabaseManager(config);
  return dbManager;
}

export function getDatabase(): DatabaseManager {
  if (!dbManager) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return dbManager;
}
