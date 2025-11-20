/**
 * TimescaleDB Storage Adapter
 * High-performance time-series storage using TimescaleDB
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import pino from 'pino';
import { TimeSeriesDataPoint } from '@intelgraph/sensor-data';

const logger = pino({ name: 'timescaledb-adapter' });

export interface TimescaleDBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections?: number;
  ssl?: boolean;
}

export interface RetentionPolicy {
  tableName: string;
  retentionPeriod: string; // e.g., '30 days', '1 year'
  compressionAfter?: string; // e.g., '7 days'
  chunkInterval?: string; // e.g., '1 day', '1 week'
}

export class TimescaleDBAdapter {
  private pool: Pool;
  private initialized = false;

  constructor(private config: TimescaleDBConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections ?? 20,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });

    this.pool.on('error', (err) => {
      logger.error({ error: err }, 'Unexpected error on idle client');
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const client = await this.pool.connect();

    try {
      // Enable TimescaleDB extension
      await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

      // Create sensor_data hypertable
      await client.query(`
        CREATE TABLE IF NOT EXISTS sensor_data (
          time TIMESTAMPTZ NOT NULL,
          device_id TEXT NOT NULL,
          sensor_id TEXT NOT NULL,
          sensor_type TEXT NOT NULL,
          value DOUBLE PRECISION,
          unit TEXT,
          quality DOUBLE PRECISION,
          metadata JSONB,
          PRIMARY KEY (time, device_id, sensor_id)
        )
      `);

      // Convert to hypertable if not already
      await client.query(`
        SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day')
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sensor_data_device_time
        ON sensor_data (device_id, time DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_time
        ON sensor_data (sensor_id, time DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sensor_data_type_time
        ON sensor_data (sensor_type, time DESC)
      `);

      // Create aggregate tables for downsampling
      await client.query(`
        CREATE TABLE IF NOT EXISTS sensor_data_hourly (
          time_bucket TIMESTAMPTZ NOT NULL,
          device_id TEXT NOT NULL,
          sensor_id TEXT NOT NULL,
          sensor_type TEXT NOT NULL,
          avg_value DOUBLE PRECISION,
          min_value DOUBLE PRECISION,
          max_value DOUBLE PRECISION,
          count BIGINT,
          PRIMARY KEY (time_bucket, device_id, sensor_id)
        )
      `);

      await client.query(`
        SELECT create_hypertable('sensor_data_hourly', 'time_bucket', if_not_exists => TRUE, chunk_time_interval => INTERVAL '7 days')
      `);

      this.initialized = true;
      logger.info('TimescaleDB schema initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize TimescaleDB schema');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Write data points
   */
  async write(dataPoints: TimeSeriesDataPoint[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (dataPoints.length === 0) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO sensor_data (time, device_id, sensor_id, sensor_type, value, unit, quality, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (time, device_id, sensor_id) DO UPDATE
        SET value = EXCLUDED.value, quality = EXCLUDED.quality, metadata = EXCLUDED.metadata
      `;

      for (const point of dataPoints) {
        const value = typeof point.fields.value === 'number' ? point.fields.value : null;
        const quality = typeof point.fields.quality === 'number' ? point.fields.quality : null;

        await client.query(query, [
          point.timestamp,
          point.deviceId,
          point.sensorId,
          point.tags.sensorType,
          value,
          point.tags.unit,
          quality,
          JSON.stringify(point.fields),
        ]);
      }

      await client.query('COMMIT');

      logger.debug({ count: dataPoints.length }, 'Data points written to TimescaleDB');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, count: dataPoints.length }, 'Failed to write data points');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Query data points
   */
  async query(options: {
    deviceId?: string;
    sensorId?: string;
    sensorType?: string;
    startTime: Date;
    endTime: Date;
    limit?: number;
  }): Promise<TimeSeriesDataPoint[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const conditions: string[] = ['time >= $1', 'time <= $2'];
    const params: any[] = [options.startTime, options.endTime];
    let paramCount = 2;

    if (options.deviceId) {
      conditions.push(`device_id = $${++paramCount}`);
      params.push(options.deviceId);
    }

    if (options.sensorId) {
      conditions.push(`sensor_id = $${++paramCount}`);
      params.push(options.sensorId);
    }

    if (options.sensorType) {
      conditions.push(`sensor_type = $${++paramCount}`);
      params.push(options.sensorType);
    }

    const query = `
      SELECT time, device_id, sensor_id, sensor_type, value, unit, quality, metadata
      FROM sensor_data
      WHERE ${conditions.join(' AND ')}
      ORDER BY time DESC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      timestamp: row.time,
      deviceId: row.device_id,
      sensorId: row.sensor_id,
      fields: row.metadata,
      tags: {
        sensorType: row.sensor_type,
        unit: row.unit,
      },
    }));
  }

  /**
   * Create continuous aggregate for downsampling
   */
  async createContinuousAggregate(intervalMinutes: number): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const viewName = `sensor_data_${intervalMinutes}min`;

    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${viewName}
        WITH (timescaledb.continuous) AS
        SELECT time_bucket('${intervalMinutes} minutes', time) AS time_bucket,
               device_id,
               sensor_id,
               sensor_type,
               AVG(value) AS avg_value,
               MIN(value) AS min_value,
               MAX(value) AS max_value,
               COUNT(*) AS count
        FROM sensor_data
        GROUP BY time_bucket, device_id, sensor_id, sensor_type
        WITH NO DATA
      `);

      // Add refresh policy
      await client.query(`
        SELECT add_continuous_aggregate_policy('${viewName}',
          start_offset => INTERVAL '1 day',
          end_offset => INTERVAL '${intervalMinutes} minutes',
          schedule_interval => INTERVAL '${intervalMinutes} minutes',
          if_not_exists => TRUE
        )
      `);

      logger.info({ viewName, intervalMinutes }, 'Continuous aggregate created');
    } catch (error) {
      logger.error({ error }, 'Failed to create continuous aggregate');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Apply retention policy
   */
  async applyRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = await this.pool.connect();

    try {
      // Add retention policy
      await client.query(`
        SELECT add_retention_policy('${policy.tableName}', INTERVAL '${policy.retentionPeriod}', if_not_exists => TRUE)
      `);

      // Add compression policy if specified
      if (policy.compressionAfter) {
        await client.query(`
          ALTER TABLE ${policy.tableName} SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'device_id, sensor_id'
          )
        `);

        await client.query(`
          SELECT add_compression_policy('${policy.tableName}', INTERVAL '${policy.compressionAfter}', if_not_exists => TRUE)
        `);
      }

      logger.info({ policy }, 'Retention policy applied');
    } catch (error) {
      logger.error({ error, policy }, 'Failed to apply retention policy');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalRows: number;
    tableSize: string;
    indexSize: string;
    totalSize: string;
  }> {
    const result = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM sensor_data) as total_rows,
        pg_size_pretty(pg_total_relation_size('sensor_data')) as total_size,
        pg_size_pretty(pg_relation_size('sensor_data')) as table_size,
        pg_size_pretty(pg_indexes_size('sensor_data')) as index_size
    `);

    return {
      totalRows: parseInt(result.rows[0].total_rows),
      tableSize: result.rows[0].table_size,
      indexSize: result.rows[0].index_size,
      totalSize: result.rows[0].total_size,
    };
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('TimescaleDB connection pool closed');
  }
}
