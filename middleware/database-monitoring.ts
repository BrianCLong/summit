/**
 * Database Monitoring and Performance Metrics
 *
 * Tracks:
 * - Query performance metrics
 * - Connection pool utilization
 * - Cache hit/miss rates
 * - Slow query detection
 * - Resource usage trends
 */

import { Pool as PostgresPool } from 'pg';
import { Driver as Neo4jDriver } from 'neo4j-driver';
import Redis from 'ioredis';
import pino from 'pino';
import { register, Counter, Histogram, Gauge } from 'prom-client';

const logger = pino();

/**
 * Prometheus metrics for database monitoring
 */

// PostgreSQL metrics
export const postgresQueryDuration = new Histogram({
  name: 'postgres_query_duration_seconds',
  help: 'Duration of PostgreSQL queries in seconds',
  labelNames: ['query_type', 'table', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

export const postgresQueryTotal = new Counter({
  name: 'postgres_query_total',
  help: 'Total number of PostgreSQL queries executed',
  labelNames: ['query_type', 'table', 'operation', 'status'],
});

export const postgresSlowQueryTotal = new Counter({
  name: 'postgres_slow_query_total',
  help: 'Total number of slow PostgreSQL queries (>100ms)',
  labelNames: ['query_type', 'table'],
});

export const postgresPoolSize = new Gauge({
  name: 'postgres_pool_size',
  help: 'Current size of PostgreSQL connection pool',
  labelNames: ['pool_type'],
});

export const postgresPoolIdle = new Gauge({
  name: 'postgres_pool_idle',
  help: 'Number of idle connections in PostgreSQL pool',
  labelNames: ['pool_type'],
});

export const postgresPoolWaiting = new Gauge({
  name: 'postgres_pool_waiting',
  help: 'Number of clients waiting for PostgreSQL connection',
  labelNames: ['pool_type'],
});

// Neo4j metrics
export const neo4jQueryDuration = new Histogram({
  name: 'neo4j_query_duration_seconds',
  help: 'Duration of Neo4j queries in seconds',
  labelNames: ['operation', 'label'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

export const neo4jQueryTotal = new Counter({
  name: 'neo4j_query_total',
  help: 'Total number of Neo4j queries executed',
  labelNames: ['operation', 'label', 'status'],
});

export const neo4jSlowQueryTotal = new Counter({
  name: 'neo4j_slow_query_total',
  help: 'Total number of slow Neo4j queries (>100ms)',
  labelNames: ['operation'],
});

// Redis cache metrics
export const redisCacheHits = new Counter({
  name: 'redis_cache_hits_total',
  help: 'Total number of Redis cache hits',
  labelNames: ['cache_type', 'tenant_id'],
});

export const redisCacheMisses = new Counter({
  name: 'redis_cache_misses_total',
  help: 'Total number of Redis cache misses',
  labelNames: ['cache_type', 'tenant_id'],
});

export const redisCacheHitRate = new Gauge({
  name: 'redis_cache_hit_rate',
  help: 'Redis cache hit rate (0-1)',
  labelNames: ['cache_type'],
});

export const redisCacheSize = new Gauge({
  name: 'redis_cache_size_bytes',
  help: 'Estimated size of Redis cache in bytes',
  labelNames: ['cache_type'],
});

export const redisConnectionsActive = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections',
});

// DataLoader metrics
export const dataLoaderBatchSize = new Histogram({
  name: 'dataloader_batch_size',
  help: 'Size of DataLoader batches',
  labelNames: ['loader_type'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
});

export const dataLoaderCacheHitRate = new Gauge({
  name: 'dataloader_cache_hit_rate',
  help: 'DataLoader cache hit rate (0-1)',
  labelNames: ['loader_type'],
});

/**
 * PostgreSQL Pool Monitor
 */
export class PostgresPoolMonitor {
  private pool: PostgresPool;
  private poolType: string;
  private intervalId?: NodeJS.Timeout;

  constructor(pool: PostgresPool, poolType: string = 'default') {
    this.pool = pool;
    this.poolType = poolType;
  }

  /**
   * Start monitoring pool metrics
   */
  startMonitoring(intervalMs: number = 10000): void {
    this.intervalId = setInterval(() => {
      this.recordMetrics();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Record current pool metrics
   */
  recordMetrics(): void {
    try {
      const stats = {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount,
      };

      postgresPoolSize.set({ pool_type: this.poolType }, stats.total);
      postgresPoolIdle.set({ pool_type: this.poolType }, stats.idle);
      postgresPoolWaiting.set({ pool_type: this.poolType }, stats.waiting);

      const utilization = stats.total > 0 ? (stats.total - stats.idle) / stats.total : 0;

      logger.debug({
        msg: 'PostgreSQL pool metrics',
        poolType: this.poolType,
        ...stats,
        utilization: utilization.toFixed(2),
      });

      // Alert if pool is heavily utilized
      if (utilization > 0.9) {
        logger.warn({
          msg: 'PostgreSQL pool heavily utilized',
          poolType: this.poolType,
          utilization: utilization.toFixed(2),
          stats,
        });
      }

      // Alert if clients are waiting
      if (stats.waiting > 0) {
        logger.warn({
          msg: 'Clients waiting for PostgreSQL connections',
          poolType: this.poolType,
          waiting: stats.waiting,
        });
      }
    } catch (error) {
      logger.error('Failed to record PostgreSQL pool metrics:', error);
    }
  }

  /**
   * Get current pool statistics
   */
  getStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      utilization: this.pool.totalCount > 0
        ? (this.pool.totalCount - this.pool.idleCount) / this.pool.totalCount
        : 0,
    };
  }
}

/**
 * Query Performance Tracker
 */
export class QueryPerformanceTracker {
  private slowQueries: Map<string, { count: number; totalTime: number; maxTime: number }>;
  private slowQueryThreshold: number;

  constructor(slowQueryThreshold: number = 100) {
    this.slowQueries = new Map();
    this.slowQueryThreshold = slowQueryThreshold;
  }

  /**
   * Track query execution
   */
  trackQuery(
    database: 'postgres' | 'neo4j',
    query: string,
    duration: number,
    metadata: {
      queryType?: string;
      table?: string;
      operation?: string;
      status?: 'success' | 'error';
    } = {},
  ): void {
    const {
      queryType = 'unknown',
      table = 'unknown',
      operation = 'unknown',
      status = 'success',
    } = metadata;

    // Record metrics
    if (database === 'postgres') {
      postgresQueryDuration.observe(
        { query_type: queryType, table, operation },
        duration / 1000,
      );
      postgresQueryTotal.inc({ query_type: queryType, table, operation, status });

      if (duration > this.slowQueryThreshold) {
        postgresSlowQueryTotal.inc({ query_type: queryType, table });
        this.recordSlowQuery(query, duration);
      }
    } else if (database === 'neo4j') {
      neo4jQueryDuration.observe(
        { operation, label: table },
        duration / 1000,
      );
      neo4jQueryTotal.inc({ operation, label: table, status });

      if (duration > this.slowQueryThreshold) {
        neo4jSlowQueryTotal.inc({ operation });
        this.recordSlowQuery(query, duration);
      }
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn({
        msg: 'Slow query detected',
        database,
        query: query.substring(0, 200),
        duration,
        threshold: this.slowQueryThreshold,
        ...metadata,
      });
    }
  }

  /**
   * Record slow query for analysis
   */
  private recordSlowQuery(query: string, duration: number): void {
    const normalizedQuery = this.normalizeQuery(query);
    const existing = this.slowQueries.get(normalizedQuery);

    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.maxTime = Math.max(existing.maxTime, duration);
    } else {
      this.slowQueries.set(normalizedQuery, {
        count: 1,
        totalTime: duration,
        maxTime: duration,
      });
    }

    // Keep only top 100 slow queries
    if (this.slowQueries.size > 100) {
      const entries = Array.from(this.slowQueries.entries());
      entries.sort((a, b) => b[1].totalTime - a[1].totalTime);
      this.slowQueries = new Map(entries.slice(0, 100));
    }
  }

  /**
   * Normalize query for grouping
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '$N')
      .replace(/['"][^'"]*['"]/g, '?')
      .substring(0, 200);
  }

  /**
   * Get slow query report
   */
  getSlowQueryReport(limit: number = 10): any[] {
    const entries = Array.from(this.slowQueries.entries());
    entries.sort((a, b) => b[1].totalTime - a[1].totalTime);

    return entries.slice(0, limit).map(([query, stats]) => ({
      query,
      count: stats.count,
      totalTime: stats.totalTime,
      avgTime: stats.totalTime / stats.count,
      maxTime: stats.maxTime,
    }));
  }

  /**
   * Clear slow query history
   */
  clearSlowQueries(): void {
    this.slowQueries.clear();
  }
}

/**
 * Cache Performance Monitor
 */
export class CachePerformanceMonitor {
  private stats: Map<string, { hits: number; misses: number }>;

  constructor() {
    this.stats = new Map();
  }

  /**
   * Record cache hit
   */
  recordHit(cacheType: string, tenantId?: string): void {
    redisCacheHits.inc({ cache_type: cacheType, tenant_id: tenantId || 'global' });
    this.updateStats(cacheType, 'hit');
  }

  /**
   * Record cache miss
   */
  recordMiss(cacheType: string, tenantId?: string): void {
    redisCacheMisses.inc({ cache_type: cacheType, tenant_id: tenantId || 'global' });
    this.updateStats(cacheType, 'miss');
  }

  /**
   * Update internal statistics
   */
  private updateStats(cacheType: string, result: 'hit' | 'miss'): void {
    if (!this.stats.has(cacheType)) {
      this.stats.set(cacheType, { hits: 0, misses: 0 });
    }

    const stats = this.stats.get(cacheType)!;
    if (result === 'hit') {
      stats.hits++;
    } else {
      stats.misses++;
    }

    // Update hit rate gauge
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? stats.hits / total : 0;
    redisCacheHitRate.set({ cache_type: cacheType }, hitRate);
  }

  /**
   * Get cache statistics
   */
  getStats(cacheType?: string): any {
    if (cacheType) {
      const stats = this.stats.get(cacheType);
      if (!stats) return null;

      const total = stats.hits + stats.misses;
      return {
        hits: stats.hits,
        misses: stats.misses,
        total,
        hitRate: total > 0 ? stats.hits / total : 0,
      };
    }

    // Return all stats
    const result: any = {};
    for (const [type, stats] of this.stats.entries()) {
      const total = stats.hits + stats.misses;
      result[type] = {
        hits: stats.hits,
        misses: stats.misses,
        total,
        hitRate: total > 0 ? stats.hits / total : 0,
      };
    }
    return result;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.clear();
  }
}

/**
 * Database Health Monitor
 */
export class DatabaseHealthMonitor {
  private postgresMonitor?: PostgresPoolMonitor;
  private queryTracker: QueryPerformanceTracker;
  private cacheMonitor: CachePerformanceMonitor;

  constructor() {
    this.queryTracker = new QueryPerformanceTracker(100);
    this.cacheMonitor = new CachePerformanceMonitor();
  }

  /**
   * Monitor PostgreSQL pool
   */
  monitorPostgresPool(pool: PostgresPool, poolType: string = 'default'): void {
    this.postgresMonitor = new PostgresPoolMonitor(pool, poolType);
    this.postgresMonitor.startMonitoring(10000);
  }

  /**
   * Get query tracker
   */
  getQueryTracker(): QueryPerformanceTracker {
    return this.queryTracker;
  }

  /**
   * Get cache monitor
   */
  getCacheMonitor(): CachePerformanceMonitor {
    return this.cacheMonitor;
  }

  /**
   * Get comprehensive health report
   */
  getHealthReport(): any {
    return {
      postgres: {
        pool: this.postgresMonitor?.getStats(),
        slowQueries: this.queryTracker.getSlowQueryReport(10),
      },
      cache: this.cacheMonitor.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Stop all monitoring
   */
  stop(): void {
    this.postgresMonitor?.stopMonitoring();
  }
}

/**
 * Create and export singleton instance
 */
export const databaseHealthMonitor = new DatabaseHealthMonitor();

/**
 * Express middleware for query tracking
 */
export function createQueryTrackingMiddleware() {
  return (req: any, res: any, next: any) => {
    // Attach query tracker to request context
    req.queryTracker = databaseHealthMonitor.getQueryTracker();
    req.cacheMonitor = databaseHealthMonitor.getCacheMonitor();
    next();
  };
}

/**
 * Health check endpoint handler
 */
export async function handleHealthCheck(req: any, res: any): Promise<void> {
  try {
    const report = databaseHealthMonitor.getHealthReport();
    res.status(200).json({
      status: 'healthy',
      ...report,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: (error as Error).message,
    });
  }
}

export default {
  PostgresPoolMonitor,
  QueryPerformanceTracker,
  CachePerformanceMonitor,
  DatabaseHealthMonitor,
  databaseHealthMonitor,
  createQueryTrackingMiddleware,
  handleHealthCheck,
};
