/**
 * Database Connection Management
 *
 * Handles connections to PostgreSQL and Neo4j databases
 * with health checking and graceful shutdown.
 */

import { Pool, type PoolClient, type QueryResult } from 'pg';
import neo4j, { type Driver, type Session } from 'neo4j-driver';
import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

/**
 * Database health status
 */
export interface DatabaseHealth {
  postgres: 'healthy' | 'unhealthy' | 'unavailable';
  neo4j: 'healthy' | 'unhealthy' | 'unavailable';
  redis: 'healthy' | 'unhealthy' | 'unavailable';
}

/**
 * Database connection manager
 */
export class DatabaseConnections {
  private _pgPool: Pool | null = null;
  private _neo4jDriver: Driver | null = null;
  private _redisClient: RedisClientType | null = null;
  private _isConnected = false;

  /**
   * Get PostgreSQL pool
   */
  get postgres(): Pool {
    if (!this._pgPool) {
      throw new Error('PostgreSQL not connected');
    }
    return this._pgPool;
  }

  /**
   * Get Neo4j driver
   */
  get neo4j(): Driver | undefined {
    return this._neo4jDriver || undefined;
  }

  /**
   * Get Redis client
   */
  get redis(): RedisClientType | undefined {
    return this._redisClient || undefined;
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Connect to all databases
   */
  async connect(): Promise<void> {
    logger.info('Connecting to databases...');

    // Connect to PostgreSQL (required)
    await this.connectPostgres();

    // Connect to Neo4j (optional)
    await this.connectNeo4j();

    // Connect to Redis (optional)
    await this.connectRedis();

    this._isConnected = true;
    logger.info('Database connections established');
  }

  /**
   * Connect to PostgreSQL
   */
  private async connectPostgres(): Promise<void> {
    const pgConfig = config.database.postgres;

    this._pgPool = new Pool({
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
      password: pgConfig.password,
      max: pgConfig.maxConnections,
      idleTimeoutMillis: pgConfig.idleTimeoutMs,
      connectionTimeoutMillis: 10000,
    });

    // Test connection
    try {
      const client = await this._pgPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('PostgreSQL connected successfully');
    } catch (error) {
      logger.error({ error }, 'PostgreSQL connection failed');
      throw new Error('Failed to connect to PostgreSQL');
    }

    // Handle pool errors
    this._pgPool.on('error', (err) => {
      logger.error({ error: err }, 'PostgreSQL pool error');
    });
  }

  /**
   * Connect to Neo4j
   */
  private async connectNeo4j(): Promise<void> {
    const neo4jConfig = config.database.neo4j;

    if (!neo4jConfig.uri || !neo4jConfig.password) {
      logger.warn('Neo4j credentials not configured, skipping');
      return;
    }

    try {
      this._neo4jDriver = neo4j.driver(
        neo4jConfig.uri,
        neo4j.auth.basic(neo4jConfig.username, neo4jConfig.password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 10000,
        }
      );

      // Test connection
      const session = this._neo4jDriver.session();
      await session.run('RETURN 1');
      await session.close();
      logger.info('Neo4j connected successfully');
    } catch (error) {
      logger.warn({ error }, 'Neo4j connection failed, graph queries will use PostgreSQL fallback');
      this._neo4jDriver = null;
    }
  }

  /**
   * Connect to Redis
   */
  private async connectRedis(): Promise<void> {
    const redisConfig = config.database.redis;

    if (!redisConfig.host) {
      logger.warn('Redis not configured, caching disabled');
      return;
    }

    try {
      this._redisClient = createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port,
        },
        password: redisConfig.password,
        database: redisConfig.db,
      });

      this._redisClient.on('error', (err) => {
        logger.error({ error: err }, 'Redis client error');
      });

      await this._redisClient.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn({ error }, 'Redis connection failed, caching disabled');
      this._redisClient = null;
    }
  }

  /**
   * Check health of all database connections
   */
  async checkHealth(): Promise<DatabaseHealth> {
    const health: DatabaseHealth = {
      postgres: 'unavailable',
      neo4j: 'unavailable',
      redis: 'unavailable',
    };

    // Check PostgreSQL
    if (this._pgPool) {
      try {
        await this._pgPool.query('SELECT 1');
        health.postgres = 'healthy';
      } catch {
        health.postgres = 'unhealthy';
      }
    }

    // Check Neo4j
    if (this._neo4jDriver) {
      try {
        const session = this._neo4jDriver.session();
        await session.run('RETURN 1');
        await session.close();
        health.neo4j = 'healthy';
      } catch {
        health.neo4j = 'unhealthy';
      }
    }

    // Check Redis
    if (this._redisClient) {
      try {
        await this._redisClient.ping();
        health.redis = 'healthy';
      } catch {
        health.redis = 'unhealthy';
      }
    }

    return health;
  }

  /**
   * Execute a PostgreSQL query
   */
  async query<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this._pgPool) {
      throw new Error('PostgreSQL not connected');
    }
    return this._pgPool.query(text, params);
  }

  /**
   * Execute a query within a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this._pgPool) {
      throw new Error('PostgreSQL not connected');
    }

    const client = await this._pgPool.connect();
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

  /**
   * Execute a Neo4j query
   */
  async cypherQuery<T>(
    cypher: string,
    params?: Record<string, unknown>
  ): Promise<T[]> {
    if (!this._neo4jDriver) {
      throw new Error('Neo4j not connected');
    }

    const session = this._neo4jDriver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map(record => record.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /**
   * Get value from Redis cache
   */
  async cacheGet<T>(key: string): Promise<T | null> {
    if (!this._redisClient) {
      return null;
    }

    try {
      const value = await this._redisClient.get(key);
      return value ? JSON.parse(value) as T : null;
    } catch {
      return null;
    }
  }

  /**
   * Set value in Redis cache
   */
  async cacheSet(
    key: string,
    value: unknown,
    ttlSeconds: number = 300
  ): Promise<void> {
    if (!this._redisClient) {
      return;
    }

    try {
      await this._redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.warn({ error, key }, 'Cache set failed');
    }
  }

  /**
   * Delete value from Redis cache
   */
  async cacheDelete(key: string): Promise<void> {
    if (!this._redisClient) {
      return;
    }

    try {
      await this._redisClient.del(key);
    } catch (error) {
      logger.warn({ error, key }, 'Cache delete failed');
    }
  }

  /**
   * Gracefully close all connections
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting from databases...');

    if (this._pgPool) {
      await this._pgPool.end();
      this._pgPool = null;
      logger.info('PostgreSQL disconnected');
    }

    if (this._neo4jDriver) {
      await this._neo4jDriver.close();
      this._neo4jDriver = null;
      logger.info('Neo4j disconnected');
    }

    if (this._redisClient) {
      await this._redisClient.quit();
      this._redisClient = null;
      logger.info('Redis disconnected');
    }

    this._isConnected = false;
    logger.info('All database connections closed');
  }
}

// Singleton instance
export const db = new DatabaseConnections();
