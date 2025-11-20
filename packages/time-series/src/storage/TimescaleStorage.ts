/**
 * IntelGraph TimescaleDB Storage Manager
 * Enterprise time series storage with hypertables, compression, and optimization
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Pool, QueryResult } from 'pg';
import {
  TimeSeries,
  TimeSeriesPoint,
  TimeSeriesMetric,
  HypertableConfig,
  ContinuousAggregateConfig,
  TimeSeriesQuery,
  CompressionStats,
  RetentionPolicy,
  TimeRangeStats
} from '../models/TimeSeries.js';

export class TimescaleStorage {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize TimescaleDB extension and create base schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Enable TimescaleDB extension
      await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

      // Create time series metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ts_metrics (
          time TIMESTAMPTZ NOT NULL,
          metric_name TEXT NOT NULL,
          entity_id TEXT,
          entity_type TEXT,
          value DOUBLE PRECISION NOT NULL,
          unit TEXT,
          tags JSONB,
          labels JSONB,
          dimensions JSONB,
          quality DOUBLE PRECISION DEFAULT 1.0,
          PRIMARY KEY (time, metric_name, entity_id)
        )
      `);

      // Create hypertable if not exists
      await client.query(`
        SELECT create_hypertable('ts_metrics', 'time',
          chunk_time_interval => INTERVAL '7 days',
          if_not_exists => TRUE
        )
      `);

      // Create indexes for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ts_metrics_entity
        ON ts_metrics (entity_id, entity_type, time DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ts_metrics_name
        ON ts_metrics (metric_name, time DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ts_metrics_tags
        ON ts_metrics USING GIN (tags)
      `);

    } finally {
      client.release();
    }
  }

  /**
   * Create a custom hypertable with specified configuration
   */
  async createHypertable(config: HypertableConfig): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT create_hypertable(
          $1::regclass,
          $2,
          chunk_time_interval => INTERVAL '${config.chunk_time_interval}',
          if_not_exists => TRUE
        )
      `;
      await client.query(query, [config.table_name, config.time_column]);

      // Enable compression if specified
      if (config.compression_enabled) {
        await this.enableCompression(config.table_name, config.compression_after);
      }

      // Create indexes
      if (config.indexes) {
        for (const indexDef of config.indexes) {
          await client.query(indexDef);
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Enable compression for a hypertable
   */
  async enableCompression(tableName: string, compressAfter?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        ALTER TABLE ${tableName} SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'metric_name, entity_id',
          timescaledb.compress_orderby = 'time DESC'
        )
      `);

      if (compressAfter) {
        await client.query(`
          SELECT add_compression_policy('${tableName}', INTERVAL '${compressAfter}')
        `);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Create continuous aggregate for downsampling
   */
  async createContinuousAggregate(config: ContinuousAggregateConfig): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${config.view_name}
        WITH (timescaledb.continuous) AS
        SELECT
          time_bucket('${config.time_bucket}', time) AS bucket,
          metric_name,
          entity_id,
          entity_type,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          SUM(value) as sum_value,
          COUNT(*) as count_value,
          STDDEV(value) as stddev_value
        FROM ${config.source_table}
        GROUP BY bucket, metric_name, entity_id, entity_type
      `;
      await client.query(query);

      // Add refresh policy if specified
      if (config.refresh_interval) {
        const refreshQuery = `
          SELECT add_continuous_aggregate_policy('${config.view_name}',
            start_offset => INTERVAL '${config.refresh_lag || '1 hour'}',
            end_offset => INTERVAL '${config.refresh_interval}',
            schedule_interval => INTERVAL '${config.refresh_interval}'
          )
        `;
        await client.query(refreshQuery);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Insert time series data points
   */
  async insertMetrics(metrics: TimeSeriesMetric[]): Promise<void> {
    if (metrics.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO ts_metrics (
          time, metric_name, entity_id, entity_type,
          value, unit, tags, labels, dimensions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (time, metric_name, entity_id)
        DO UPDATE SET value = EXCLUDED.value
      `;

      for (const metric of metrics) {
        await client.query(insertQuery, [
          metric.timestamp,
          metric.metric_name,
          metric.entity_id || null,
          metric.entity_type || null,
          metric.value,
          metric.unit || null,
          JSON.stringify(metric.tags || {}),
          JSON.stringify(metric.labels || {}),
          JSON.stringify(metric.dimensions || {})
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Query time series data with flexible filtering
   */
  async query(query: TimeSeriesQuery): Promise<TimeSeriesMetric[]> {
    const client = await this.pool.connect();
    try {
      let sql = `
        SELECT
          time as timestamp,
          metric_name,
          entity_id,
          entity_type,
          value,
          unit,
          tags,
          labels,
          dimensions
        FROM ts_metrics
        WHERE time >= $1 AND time <= $2
      `;
      const params: any[] = [query.start_time, query.end_time];
      let paramIndex = 3;

      if (query.metric_name) {
        sql += ` AND metric_name = $${paramIndex++}`;
        params.push(query.metric_name);
      }

      if (query.entity_id) {
        sql += ` AND entity_id = $${paramIndex++}`;
        params.push(query.entity_id);
      }

      if (query.entity_type) {
        sql += ` AND entity_type = $${paramIndex++}`;
        params.push(query.entity_type);
      }

      if (query.tags) {
        sql += ` AND tags @> $${paramIndex++}::jsonb`;
        params.push(JSON.stringify(query.tags));
      }

      sql += ' ORDER BY time DESC';

      if (query.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(query.offset);
      }

      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Query time series with aggregation and bucketing
   */
  async queryAggregated(query: TimeSeriesQuery): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const interval = query.interval || '1 hour';
      const aggregation = query.aggregation || 'avg';

      let aggFunction = 'AVG(value)';
      switch (aggregation) {
        case 'sum': aggFunction = 'SUM(value)'; break;
        case 'min': aggFunction = 'MIN(value)'; break;
        case 'max': aggFunction = 'MAX(value)'; break;
        case 'count': aggFunction = 'COUNT(*)'; break;
        case 'stddev': aggFunction = 'STDDEV(value)'; break;
      }

      let sql = `
        SELECT
          time_bucket('${interval}', time) AS bucket,
          metric_name,
          entity_id,
          entity_type,
          ${aggFunction} as value,
          COUNT(*) as sample_count
        FROM ts_metrics
        WHERE time >= $1 AND time <= $2
      `;
      const params: any[] = [query.start_time, query.end_time];
      let paramIndex = 3;

      if (query.metric_name) {
        sql += ` AND metric_name = $${paramIndex++}`;
        params.push(query.metric_name);
      }

      if (query.entity_id) {
        sql += ` AND entity_id = $${paramIndex++}`;
        params.push(query.entity_id);
      }

      sql += ' GROUP BY bucket, metric_name, entity_id, entity_type';
      sql += ' ORDER BY bucket DESC';

      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get compression statistics for a table
   */
  async getCompressionStats(tableName: string): Promise<CompressionStats> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          hypertable_name as table_name,
          SUM(before_compression_total_bytes) as uncompressed_bytes,
          SUM(after_compression_total_bytes) as compressed_bytes,
          SUM(before_compression_total_bytes)::float /
            NULLIF(SUM(after_compression_total_bytes), 0) as compression_ratio,
          COUNT(CASE WHEN compression_status = 'Compressed' THEN 1 END) as chunks_compressed,
          COUNT(*) as chunks_total
        FROM timescaledb_information.chunks
        WHERE hypertable_name = $1
        GROUP BY hypertable_name
      `, [tableName]);

      if (result.rows.length === 0) {
        return {
          table_name: tableName,
          uncompressed_bytes: 0,
          compressed_bytes: 0,
          compression_ratio: 1,
          chunks_compressed: 0,
          chunks_total: 0,
          last_compression: new Date()
        };
      }

      return {
        ...result.rows[0],
        last_compression: new Date()
      };
    } finally {
      client.release();
    }
  }

  /**
   * Add retention policy to automatically drop old data
   */
  async addRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        SELECT add_retention_policy(
          '${policy.table_name}',
          INTERVAL '${policy.drop_after}',
          if_not_exists => ${policy.if_not_exists !== false}
        )
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Get time range statistics for analysis
   */
  async getTimeRangeStats(
    metricName: string,
    startTime: Date,
    endTime: Date
  ): Promise<TimeRangeStats> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          MIN(time) as start_time,
          MAX(time) as end_time,
          COUNT(*) as count,
          MIN(value) as min_value,
          MAX(value) as max_value,
          AVG(value) as avg_value,
          SUM(value) as sum_value,
          STDDEV(value) as stddev_value
        FROM ts_metrics
        WHERE metric_name = $1
          AND time >= $2
          AND time <= $3
      `, [metricName, startTime, endTime]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Manually compress chunks older than specified interval
   */
  async compressChunks(tableName: string, olderThan: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT compress_chunk(show_chunks) as compressed_chunk
        FROM show_chunks('${tableName}', older_than => INTERVAL '${olderThan}')
      `);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get chunk information for monitoring
   */
  async getChunkInfo(tableName: string): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          chunk_name,
          range_start,
          range_end,
          compression_status,
          before_compression_total_bytes,
          after_compression_total_bytes
        FROM timescaledb_information.chunks
        WHERE hypertable_name = $1
        ORDER BY range_start DESC
      `, [tableName]);
      return result.rows;
    } finally {
      client.release();
    }
  }
}
