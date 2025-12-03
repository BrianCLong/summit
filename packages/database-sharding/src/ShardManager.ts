import { Pool } from 'pg';
import { trace, context } from '@opentelemetry/api';
import pino from 'pino';
import { ShardConfig, ShardingConfig, ShardMetrics } from './types';
import { ShardConnectionPool } from './ShardConnectionPool';

const logger = pino({ name: 'ShardManager' });
const tracer = trace.getTracer('database-sharding');

/**
 * Manages database shards, connection pools, and health monitoring
 */
export class ShardManager {
  private shards: Map<string, ShardConfig> = new Map();
  private connectionPools: Map<string, ShardConnectionPool> = new Map();
  private metrics: Map<string, ShardMetrics> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(private config: ShardingConfig) {
    this.initializeShards();
    this.startHealthChecks();
  }

  private initializeShards(): void {
    const span = tracer.startSpan('ShardManager.initializeShards');

    try {
      for (const shard of this.config.shards) {
        this.shards.set(shard.id, shard);

        const pool = new ShardConnectionPool(shard);
        this.connectionPools.set(shard.id, pool);

        this.metrics.set(shard.id, {
          shardId: shard.id,
          queryCount: 0,
          errorCount: 0,
          avgLatency: 0,
          p95Latency: 0,
          p99Latency: 0,
          activeConnections: 0,
          queuedQueries: 0,
        });

        logger.info({ shardId: shard.id, name: shard.name }, 'Shard initialized');
      }

      span.setAttributes({
        'shard.count': this.shards.size,
        'strategy': this.config.strategy,
      });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get shard configuration by ID
   */
  getShard(shardId: string): ShardConfig | undefined {
    return this.shards.get(shardId);
  }

  /**
   * Get all shards
   */
  getAllShards(): ShardConfig[] {
    return Array.from(this.shards.values());
  }

  /**
   * Get connection pool for a shard
   */
  getConnectionPool(shardId: string): ShardConnectionPool | undefined {
    return this.connectionPools.get(shardId);
  }

  /**
   * Get metrics for a shard
   */
  getMetrics(shardId: string): ShardMetrics | undefined {
    return this.metrics.get(shardId);
  }

  /**
   * Get metrics for all shards
   */
  getAllMetrics(): ShardMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Update metrics for a shard
   */
  updateMetrics(shardId: string, updates: Partial<ShardMetrics>): void {
    const current = this.metrics.get(shardId);
    if (current) {
      this.metrics.set(shardId, { ...current, ...updates });
    }
  }

  /**
   * Add a new shard dynamically
   */
  async addShard(shard: ShardConfig): Promise<void> {
    const span = tracer.startSpan('ShardManager.addShard');

    try {
      if (this.shards.has(shard.id)) {
        throw new Error(`Shard ${shard.id} already exists`);
      }

      this.shards.set(shard.id, shard);

      const pool = new ShardConnectionPool(shard);
      await pool.initialize();
      this.connectionPools.set(shard.id, pool);

      this.metrics.set(shard.id, {
        shardId: shard.id,
        queryCount: 0,
        errorCount: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        activeConnections: 0,
        queuedQueries: 0,
      });

      logger.info({ shardId: shard.id, name: shard.name }, 'Shard added dynamically');
      span.setAttributes({ 'shard.id': shard.id });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Remove a shard (drain connections first)
   */
  async removeShard(shardId: string): Promise<void> {
    const span = tracer.startSpan('ShardManager.removeShard');

    try {
      const pool = this.connectionPools.get(shardId);
      if (pool) {
        await pool.drain();
        this.connectionPools.delete(shardId);
      }

      this.shards.delete(shardId);
      this.metrics.delete(shardId);

      logger.info({ shardId }, 'Shard removed');
      span.setAttributes({ 'shard.id': shardId });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Health check for all shards
   */
  private async checkHealth(): Promise<void> {
    const checks = Array.from(this.connectionPools.entries()).map(
      async ([shardId, pool]) => {
        try {
          const isHealthy = await pool.healthCheck();
          if (!isHealthy) {
            logger.warn({ shardId }, 'Shard health check failed');
          }
          return { shardId, healthy: isHealthy };
        } catch (error) {
          logger.error({ shardId, error }, 'Health check error');
          return { shardId, healthy: false };
        }
      }
    );

    await Promise.all(checks);
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth().catch((error) => {
        logger.error({ error }, 'Health check interval error');
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop health checks and close all connections
   */
  async shutdown(): Promise<void> {
    const span = tracer.startSpan('ShardManager.shutdown');

    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      const drainPromises = Array.from(this.connectionPools.values()).map(
        (pool) => pool.drain()
      );

      await Promise.all(drainPromises);

      logger.info('ShardManager shutdown complete');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Rebalance data across shards (for range-based sharding)
   */
  async rebalance(): Promise<void> {
    const span = tracer.startSpan('ShardManager.rebalance');

    try {
      // Implementation would depend on strategy
      // This is a placeholder for rebalancing logic
      logger.info('Starting shard rebalancing');

      // For hash-based: add consistent hashing virtual nodes
      // For range-based: split ranges and migrate data
      // For geographic: redistribute based on load

      logger.info('Shard rebalancing complete');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}
