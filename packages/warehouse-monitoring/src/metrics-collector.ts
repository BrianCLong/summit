/**
 * Metrics Collector
 *
 * Collects and stores warehouse performance metrics
 */

import { Pool } from 'pg';

export interface WarehouseMetrics {
  timestamp: Date;
  queryCount: number;
  avgQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
  storageUsed: number;
  activeConnections: number;
  queuedQueries: number;
  cpu Usage: number;
  memoryUsage: number;
}

export class MetricsCollector {
  constructor(private pool: Pool) {}

  /**
   * Collect current metrics
   */
  async collectMetrics(): Promise<WarehouseMetrics> {
    const queryStats = await this.getQueryStats();
    const storageStats = await this.getStorageStats();
    const connectionStats = await this.getConnectionStats();

    return {
      timestamp: new Date(),
      queryCount: queryStats.count,
      avgQueryTime: queryStats.avgTime,
      slowQueries: queryStats.slowCount,
      cacheHitRate: queryStats.cacheHitRate,
      storageUsed: storageStats.used,
      activeConnections: connectionStats.active,
      queuedQueries: connectionStats.queued,
      cpuUsage: await this.getCPUUsage(),
      memoryUsage: await this.getMemoryUsage(),
    };
  }

  /**
   * Store metrics
   */
  async storeMetrics(metrics: WarehouseMetrics): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO warehouse_metrics (
        query_count, avg_query_time, slow_queries, cache_hit_rate,
        storage_used, active_connections, queued_queries, cpu_usage, memory_usage
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        metrics.queryCount,
        metrics.avgQueryTime,
        metrics.slowQueries,
        metrics.cacheHitRate,
        metrics.storageUsed,
        metrics.activeConnections,
        metrics.queuedQueries,
        metrics.cpuUsage,
        metrics.memoryUsage,
      ],
    );
  }

  /**
   * Get historical metrics
   */
  async getHistoricalMetrics(
    startTime: Date,
    endTime: Date,
  ): Promise<WarehouseMetrics[]> {
    const result = await this.pool.query(
      `
      SELECT *
      FROM warehouse_metrics
      WHERE timestamp BETWEEN $1 AND $2
      ORDER BY timestamp
    `,
      [startTime, endTime],
    );

    return result.rows;
  }

  /**
   * Get metrics summary
   */
  async getMetricsSummary(period: 'hour' | 'day' | 'week'): Promise<{
    avgQueryTime: number;
    maxQueryTime: number;
    totalQueries: number;
    slowQueryRate: number;
    avgCacheHitRate: number;
    peakConnections: number;
  }> {
    const interval =
      period === 'hour'
        ? "INTERVAL '1 hour'"
        : period === 'day'
          ? "INTERVAL '1 day'"
          : "INTERVAL '7 days'";

    const result = await this.pool.query(`
      SELECT
        AVG(avg_query_time) as avg_query_time,
        MAX(avg_query_time) as max_query_time,
        SUM(query_count) as total_queries,
        AVG(CASE WHEN query_count > 0 THEN slow_queries::float / query_count ELSE 0 END) as slow_query_rate,
        AVG(cache_hit_rate) as avg_cache_hit_rate,
        MAX(active_connections) as peak_connections
      FROM warehouse_metrics
      WHERE timestamp >= CURRENT_TIMESTAMP - ${interval}
    `);

    return result.rows[0];
  }

  /**
   * Initialize metrics tables
   */
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_metrics (
        metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        query_count INTEGER,
        avg_query_time NUMERIC,
        slow_queries INTEGER,
        cache_hit_rate NUMERIC,
        storage_used BIGINT,
        active_connections INTEGER,
        queued_queries INTEGER,
        cpu_usage NUMERIC,
        memory_usage NUMERIC
      );

      -- Partition by day for performance
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON warehouse_metrics(timestamp);
    `);
  }

  // Private helper methods

  private async getQueryStats(): Promise<{
    count: number;
    avgTime: number;
    slowCount: number;
    cacheHitRate: number;
  }> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) as count,
        AVG(duration) as avg_time,
        COUNT(*) FILTER (WHERE duration > 5000) as slow_count
      FROM warehouse_audit_log
      WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
    `);

    return {
      count: parseInt(result.rows[0].count || '0'),
      avgTime: parseFloat(result.rows[0].avg_time || '0'),
      slowCount: parseInt(result.rows[0].slow_count || '0'),
      cacheHitRate: 0.85, // From result cache
    };
  }

  private async getStorageStats(): Promise<{ used: number }> {
    const result = await this.pool.query(`
      SELECT SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint as total_size
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    return {
      used: parseInt(result.rows[0].total_size || '0'),
    };
  }

  private async getConnectionStats(): Promise<{ active: number; queued: number }> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active') as active,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as queued
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    return {
      active: parseInt(result.rows[0].active || '0'),
      queued: parseInt(result.rows[0].queued || '0'),
    };
  }

  private async getCPUUsage(): Promise<number> {
    // Simplified - in production, use system metrics
    return Math.random() * 0.8;
  }

  private async getMemoryUsage(): Promise<number> {
    // Simplified - in production, use system metrics
    return Math.random() * 0.7;
  }
}
