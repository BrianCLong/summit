import { Pool, PoolClient, QueryResult } from 'pg';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { ShardConfig, DatabaseConfig } from './types';

const logger = pino({ name: 'ShardConnectionPool' });
const tracer = trace.getTracer('database-sharding');

/**
 * Manages connection pools for a single shard (primary + replicas)
 */
export class ShardConnectionPool {
  private primaryPool: Pool;
  private replicaPools: Pool[] = [];
  private currentReplicaIndex = 0;

  constructor(private config: ShardConfig) {
    this.primaryPool = this.createPool(config.primary);

    if (config.replicas) {
      this.replicaPools = config.replicas.map((replica) =>
        this.createPool(replica)
      );
    }
  }

  private createPool(dbConfig: DatabaseConfig): Pool {
    return new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      max: dbConfig.max || 20,
      min: dbConfig.min || 5,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis || 5000,
      ssl: dbConfig.ssl || false,
    });
  }

  /**
   * Initialize pools (test connections)
   */
  async initialize(): Promise<void> {
    const span = tracer.startSpan('ShardConnectionPool.initialize');

    try {
      // Test primary connection
      const primaryClient = await this.primaryPool.connect();
      await primaryClient.query('SELECT 1');
      primaryClient.release();

      // Test replica connections
      for (const pool of this.replicaPools) {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
      }

      logger.info(
        {
          shardId: this.config.id,
          replicas: this.replicaPools.length,
        },
        'Connection pools initialized'
      );
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get a connection from the primary pool
   */
  async getPrimaryClient(): Promise<PoolClient> {
    return this.primaryPool.connect();
  }

  /**
   * Get a connection from a replica pool (round-robin load balancing)
   */
  async getReplicaClient(): Promise<PoolClient> {
    if (this.replicaPools.length === 0) {
      // Fallback to primary if no replicas
      return this.getPrimaryClient();
    }

    const pool = this.replicaPools[this.currentReplicaIndex];
    this.currentReplicaIndex =
      (this.currentReplicaIndex + 1) % this.replicaPools.length;

    try {
      return await pool.connect();
    } catch (error) {
      logger.warn(
        { shardId: this.config.id, error },
        'Replica connection failed, falling back to primary'
      );
      return this.getPrimaryClient();
    }
  }

  /**
   * Execute a query on the primary
   */
  async queryPrimary<T = any>(
    sql: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const span = tracer.startSpan('ShardConnectionPool.queryPrimary');
    const startTime = Date.now();

    try {
      const result = await this.primaryPool.query<T>(sql, params);

      span.setAttributes({
        'shard.id': this.config.id,
        'query.rows': result.rowCount || 0,
        'query.duration': Date.now() - startTime,
      });

      return result;
    } catch (error) {
      span.recordException(error as Error);
      logger.error(
        { shardId: this.config.id, sql, error },
        'Primary query failed'
      );
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Execute a query on a replica (with fallback to primary)
   */
  async queryReplica<T = any>(
    sql: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const span = tracer.startSpan('ShardConnectionPool.queryReplica');
    const startTime = Date.now();

    if (this.replicaPools.length === 0) {
      span.setAttribute('fallback', 'primary');
      span.end();
      return this.queryPrimary<T>(sql, params);
    }

    const pool = this.replicaPools[this.currentReplicaIndex];
    this.currentReplicaIndex =
      (this.currentReplicaIndex + 1) % this.replicaPools.length;

    try {
      const result = await pool.query<T>(sql, params);

      span.setAttributes({
        'shard.id': this.config.id,
        'query.rows': result.rowCount || 0,
        'query.duration': Date.now() - startTime,
        'source': 'replica',
      });

      return result;
    } catch (error) {
      logger.warn(
        { shardId: this.config.id, error },
        'Replica query failed, falling back to primary'
      );
      span.setAttribute('fallback', 'primary');
      span.end();
      return this.queryPrimary<T>(sql, params);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.primaryPool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error({ shardId: this.config.id, error }, 'Health check failed');
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      shardId: this.config.id,
      primary: {
        total: this.primaryPool.totalCount,
        idle: this.primaryPool.idleCount,
        waiting: this.primaryPool.waitingCount,
      },
      replicas: this.replicaPools.map((pool, index) => ({
        index,
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      })),
    };
  }

  /**
   * Drain and close all connections
   */
  async drain(): Promise<void> {
    const span = tracer.startSpan('ShardConnectionPool.drain');

    try {
      await this.primaryPool.end();

      for (const pool of this.replicaPools) {
        await pool.end();
      }

      logger.info({ shardId: this.config.id }, 'Connection pools drained');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}
