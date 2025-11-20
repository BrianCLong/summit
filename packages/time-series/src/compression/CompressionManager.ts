/**
 * IntelGraph Time Series Compression Manager
 * Advanced compression algorithms and strategies for time series data
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Pool } from 'pg';

export interface CompressionConfig {
  tableName: string;
  segmentBy?: string[];
  orderBy?: string[];
  compressAfter?: string;
  compressionAlgorithm?: 'lz4' | 'zstd' | 'gorilla';
}

export interface CompressionJob {
  job_id: number;
  table_name: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  chunks_compressed: number;
  compression_ratio: number;
  started_at?: Date;
  completed_at?: Date;
}

export class CompressionManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Configure compression for a hypertable
   */
  async configureCompression(config: CompressionConfig): Promise<void> {
    const client = await this.pool.connect();
    try {
      const segmentBy = config.segmentBy?.join(', ') || '';
      const orderBy = config.orderBy?.join(' DESC, ') + ' DESC' || 'time DESC';

      await client.query(`
        ALTER TABLE ${config.tableName} SET (
          timescaledb.compress,
          ${segmentBy ? `timescaledb.compress_segmentby = '${segmentBy}',` : ''}
          timescaledb.compress_orderby = '${orderBy}'
        )
      `);

      if (config.compressAfter) {
        await this.addCompressionPolicy(config.tableName, config.compressAfter);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Add automatic compression policy
   */
  async addCompressionPolicy(tableName: string, compressAfter: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT add_compression_policy('${tableName}', INTERVAL '${compressAfter}')
      `);
      return result.rows[0].add_compression_policy;
    } finally {
      client.release();
    }
  }

  /**
   * Remove compression policy
   */
  async removeCompressionPolicy(tableName: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        SELECT remove_compression_policy('${tableName}')
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Manually compress specific chunks
   */
  async compressChunks(tableName: string, olderThan?: string): Promise<CompressionJob> {
    const client = await this.pool.connect();
    const startTime = new Date();
    let chunksCompressed = 0;

    try {
      const query = olderThan
        ? `SELECT compress_chunk(show_chunks) FROM show_chunks('${tableName}', older_than => INTERVAL '${olderThan}')`
        : `SELECT compress_chunk(show_chunks) FROM show_chunks('${tableName}')`;

      const result = await client.query(query);
      chunksCompressed = result.rowCount || 0;

      // Get compression stats
      const statsResult = await client.query(`
        SELECT
          SUM(before_compression_total_bytes)::float /
          NULLIF(SUM(after_compression_total_bytes), 0) as compression_ratio
        FROM timescaledb_information.chunks
        WHERE hypertable_name = $1
      `, [tableName]);

      return {
        job_id: Date.now(),
        table_name: tableName,
        status: 'completed',
        chunks_compressed: chunksCompressed,
        compression_ratio: statsResult.rows[0]?.compression_ratio || 1,
        started_at: startTime,
        completed_at: new Date()
      };
    } catch (error) {
      return {
        job_id: Date.now(),
        table_name: tableName,
        status: 'failed',
        chunks_compressed: chunksCompressed,
        compression_ratio: 1,
        started_at: startTime,
        completed_at: new Date()
      };
    } finally {
      client.release();
    }
  }

  /**
   * Decompress chunks for modification
   */
  async decompressChunks(tableName: string, newerThan?: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const query = newerThan
        ? `SELECT decompress_chunk(show_chunks) FROM show_chunks('${tableName}', newer_than => INTERVAL '${newerThan}')`
        : `SELECT decompress_chunk(show_chunks) FROM show_chunks('${tableName}')`;

      const result = await client.query(query);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get compression statistics
   */
  async getCompressionStats(tableName: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          hypertable_name,
          compression_status,
          COUNT(*) as chunk_count,
          SUM(before_compression_total_bytes) as uncompressed_bytes,
          SUM(after_compression_total_bytes) as compressed_bytes,
          SUM(before_compression_total_bytes)::float /
            NULLIF(SUM(after_compression_total_bytes), 0) as compression_ratio,
          AVG(before_compression_total_bytes) as avg_chunk_size_uncompressed,
          AVG(after_compression_total_bytes) as avg_chunk_size_compressed
        FROM timescaledb_information.chunks
        WHERE hypertable_name = $1
        GROUP BY hypertable_name, compression_status
      `, [tableName]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get compression jobs status
   */
  async getCompressionJobs(tableName?: string): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT
          job_id,
          hypertable_name as table_name,
          config,
          scheduled,
          last_run_status,
          last_run_started_at,
          last_run_finished_at,
          next_start
        FROM timescaledb_information.jobs
        WHERE proc_name = 'policy_compression'
      `;

      if (tableName) {
        query += ` AND hypertable_name = '${tableName}'`;
      }

      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Optimize compression settings based on data patterns
   */
  async optimizeCompression(tableName: string): Promise<CompressionConfig> {
    const client = await this.pool.connect();
    try {
      // Analyze data patterns
      const result = await client.query(`
        SELECT
          COUNT(DISTINCT metric_name) as unique_metrics,
          COUNT(DISTINCT entity_id) as unique_entities,
          COUNT(DISTINCT entity_type) as unique_types,
          AVG(pg_column_size(value)) as avg_value_size,
          AVG(pg_column_size(tags)) as avg_tags_size
        FROM ts_metrics
        WHERE time > NOW() - INTERVAL '7 days'
      `);

      const stats = result.rows[0];

      // Determine optimal segment_by columns
      const segmentBy: string[] = [];
      if (stats.unique_metrics < 1000) {
        segmentBy.push('metric_name');
      }
      if (stats.unique_entities < 10000) {
        segmentBy.push('entity_id');
      }

      // Recommend compression after 7 days for recent data access
      const compressAfter = '7 days';

      return {
        tableName,
        segmentBy,
        orderBy: ['time'],
        compressAfter,
        compressionAlgorithm: 'lz4' // Fast compression/decompression
      };
    } finally {
      client.release();
    }
  }
}
