/**
 * Incremental Loading with Watermarking
 * Manages state and watermarks for incremental data loading patterns
 */

import { Pool, PoolClient } from 'pg';
import { Logger } from 'winston';

export interface WatermarkConfig {
  watermarkTable?: string;
  watermarkColumn: string;
  watermarkType: 'timestamp' | 'numeric' | 'string';
  initialValue?: any;
  lookbackWindow?: number; // For timestamp watermarks, lookback in seconds
}

export interface IncrementalConfig {
  sourceTable: string;
  sourceSchema?: string;
  targetTable: string;
  targetSchema?: string;
  incrementalColumn: string;
  primaryKeys: string[];
  watermark: WatermarkConfig;
  batchSize?: number;
  parallelLoads?: number;
}

export interface LoadState {
  sourceTable: string;
  lastLoadedValue: any;
  lastLoadTime: Date;
  recordsLoaded: number;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class IncrementalLoader {
  private config: IncrementalConfig;
  private logger: Logger;
  private sourcePool: Pool | null = null;
  private targetPool: Pool | null = null;

  constructor(config: IncrementalConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async connect(sourceConnectionString: string, targetConnectionString: string): Promise<void> {
    this.sourcePool = new Pool({ connectionString: sourceConnectionString });
    this.targetPool = new Pool({ connectionString: targetConnectionString });

    await this.ensureWatermarkTable();

    this.logger.info('Incremental loader connected to source and target databases');
  }

  async disconnect(): Promise<void> {
    if (this.sourcePool) {
      await this.sourcePool.end();
      this.sourcePool = null;
    }

    if (this.targetPool) {
      await this.targetPool.end();
      this.targetPool = null;
    }

    this.logger.info('Incremental loader disconnected');
  }

  /**
   * Perform incremental load
   */
  async load(): Promise<LoadState> {
    if (!this.sourcePool || !this.targetPool) {
      throw new Error('Not connected. Call connect() first.');
    }

    const startTime = Date.now();
    const loadState: LoadState = {
      sourceTable: this.config.sourceTable,
      lastLoadedValue: null,
      lastLoadTime: new Date(),
      recordsLoaded: 0,
      status: 'success'
    };

    try {
      // Get current watermark
      const watermark = await this.getWatermark();
      this.logger.info(`Starting incremental load from watermark: ${watermark}`);

      // Extract incremental data
      const data = await this.extractIncrementalData(watermark);

      if (data.length === 0) {
        this.logger.info('No new data to load');
        return loadState;
      }

      this.logger.info(`Extracted ${data.length} records for incremental load`);

      // Load data in batches
      const batchSize = this.config.batchSize || 1000;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await this.loadBatch(batch);
        loadState.recordsLoaded += batch.length;
      }

      // Update watermark
      const newWatermark = this.getMaxWatermarkValue(data);
      await this.updateWatermark(newWatermark, loadState);

      loadState.lastLoadedValue = newWatermark;

      const durationSeconds = (Date.now() - startTime) / 1000;
      this.logger.info(
        `Incremental load completed: ${loadState.recordsLoaded} records in ${durationSeconds.toFixed(2)}s`
      );

      return loadState;
    } catch (error) {
      loadState.status = 'failed';
      loadState.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Incremental load failed', { error });

      throw error;
    }
  }

  /**
   * Extract data that has changed since last watermark
   */
  private async extractIncrementalData(watermark: any): Promise<any[]> {
    if (!this.sourcePool) throw new Error('Source pool not initialized');

    const client = await this.sourcePool.connect();

    try {
      const sourceTable = this.getFullSourceTableName();
      const incrementalColumn = this.config.incrementalColumn;
      const batchSize = this.config.batchSize || 10000;

      // Apply lookback window for timestamp watermarks
      let adjustedWatermark = watermark;

      if (this.config.watermark.watermarkType === 'timestamp' && this.config.watermark.lookbackWindow) {
        const lookbackSeconds = this.config.watermark.lookbackWindow;
        const watermarkDate = new Date(watermark);
        watermarkDate.setSeconds(watermarkDate.getSeconds() - lookbackSeconds);
        adjustedWatermark = watermarkDate.toISOString();

        this.logger.debug(`Applied lookback window: ${lookbackSeconds}s, adjusted watermark: ${adjustedWatermark}`);
      }

      const query = `
        SELECT *
        FROM ${sourceTable}
        WHERE ${incrementalColumn} > $1
        ORDER BY ${incrementalColumn} ASC
        LIMIT $2
      `;

      const result = await client.query(query, [adjustedWatermark, batchSize]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Load a batch of data to target
   */
  private async loadBatch(batch: any[]): Promise<void> {
    if (!this.targetPool) throw new Error('Target pool not initialized');

    const client = await this.targetPool.connect();

    try {
      await client.query('BEGIN');

      const targetTable = this.getFullTargetTableName();
      const primaryKeys = this.config.primaryKeys;

      for (const record of batch) {
        // Use upsert strategy (INSERT ... ON CONFLICT DO UPDATE)
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

        const updateSet = columns
          .filter(col => !primaryKeys.includes(col))
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');

        const conflictColumns = primaryKeys.join(', ');

        const query = `
          INSERT INTO ${targetTable} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (${conflictColumns})
          DO UPDATE SET ${updateSet}
        `;

        await client.query(query, values);
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
   * Get current watermark value
   */
  private async getWatermark(): Promise<any> {
    if (!this.targetPool) throw new Error('Target pool not initialized');

    const client = await this.targetPool.connect();

    try {
      const watermarkTable = this.config.watermark.watermarkTable || 'etl_watermarks';

      const result = await client.query(
        `SELECT last_loaded_value FROM ${watermarkTable}
         WHERE source_table = $1
         ORDER BY last_load_time DESC
         LIMIT 1`,
        [this.config.sourceTable]
      );

      if (result.rows.length === 0) {
        // Return initial value
        return this.getInitialWatermark();
      }

      return result.rows[0].last_loaded_value;
    } finally {
      client.release();
    }
  }

  /**
   * Update watermark after successful load
   */
  private async updateWatermark(newValue: any, loadState: LoadState): Promise<void> {
    if (!this.targetPool) throw new Error('Target pool not initialized');

    const client = await this.targetPool.connect();

    try {
      const watermarkTable = this.config.watermark.watermarkTable || 'etl_watermarks';

      await client.query(
        `INSERT INTO ${watermarkTable}
         (source_table, last_loaded_value, last_load_time, records_loaded, status, error_message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          this.config.sourceTable,
          newValue,
          loadState.lastLoadTime,
          loadState.recordsLoaded,
          loadState.status,
          loadState.errorMessage,
          JSON.stringify(loadState.metadata || {})
        ]
      );

      this.logger.debug(`Updated watermark to: ${newValue}`);
    } finally {
      client.release();
    }
  }

  /**
   * Ensure watermark tracking table exists
   */
  private async ensureWatermarkTable(): Promise<void> {
    if (!this.targetPool) return;

    const client = await this.targetPool.connect();

    try {
      const watermarkTable = this.config.watermark.watermarkTable || 'etl_watermarks';

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${watermarkTable} (
          id SERIAL PRIMARY KEY,
          source_table VARCHAR(255) NOT NULL,
          last_loaded_value TEXT NOT NULL,
          last_load_time TIMESTAMP NOT NULL,
          records_loaded INTEGER DEFAULT 0,
          status VARCHAR(50) NOT NULL,
          error_message TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_watermarks_source_table
        ON ${watermarkTable}(source_table, last_load_time DESC)
      `);

      this.logger.debug('Watermark table ensured');
    } finally {
      client.release();
    }
  }

  /**
   * Get initial watermark value
   */
  private getInitialWatermark(): any {
    if (this.config.watermark.initialValue !== undefined) {
      return this.config.watermark.initialValue;
    }

    switch (this.config.watermark.watermarkType) {
      case 'timestamp':
        return new Date('1970-01-01').toISOString();
      case 'numeric':
        return 0;
      case 'string':
        return '';
      default:
        return null;
    }
  }

  /**
   * Get maximum watermark value from data batch
   */
  private getMaxWatermarkValue(data: any[]): any {
    const watermarkColumn = this.config.watermark.watermarkColumn;
    const values = data.map(record => record[watermarkColumn]).filter(val => val != null);

    if (values.length === 0) {
      return this.getInitialWatermark();
    }

    switch (this.config.watermark.watermarkType) {
      case 'timestamp':
        return new Date(Math.max(...values.map(v => new Date(v).getTime()))).toISOString();
      case 'numeric':
        return Math.max(...values.map(Number));
      case 'string':
        return values.sort().pop();
      default:
        return values[values.length - 1];
    }
  }

  /**
   * Get load history
   */
  async getLoadHistory(limit: number = 10): Promise<LoadState[]> {
    if (!this.targetPool) throw new Error('Target pool not initialized');

    const client = await this.targetPool.connect();

    try {
      const watermarkTable = this.config.watermark.watermarkTable || 'etl_watermarks';

      const result = await client.query(
        `SELECT * FROM ${watermarkTable}
         WHERE source_table = $1
         ORDER BY last_load_time DESC
         LIMIT $2`,
        [this.config.sourceTable, limit]
      );

      return result.rows.map(row => ({
        sourceTable: row.source_table,
        lastLoadedValue: row.last_loaded_value,
        lastLoadTime: row.last_load_time,
        recordsLoaded: row.records_loaded,
        status: row.status,
        errorMessage: row.error_message,
        metadata: row.metadata
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Reset watermark (useful for full reloads)
   */
  async resetWatermark(): Promise<void> {
    if (!this.targetPool) throw new Error('Target pool not initialized');

    const client = await this.targetPool.connect();

    try {
      const watermarkTable = this.config.watermark.watermarkTable || 'etl_watermarks';
      const initialValue = this.getInitialWatermark();

      await client.query(
        `INSERT INTO ${watermarkTable}
         (source_table, last_loaded_value, last_load_time, records_loaded, status, metadata)
         VALUES ($1, $2, CURRENT_TIMESTAMP, 0, 'success', '{"reset": true}')`,
        [this.config.sourceTable, initialValue]
      );

      this.logger.info(`Watermark reset for table: ${this.config.sourceTable}`);
    } finally {
      client.release();
    }
  }

  private getFullSourceTableName(): string {
    const { sourceSchema, sourceTable } = this.config;
    return sourceSchema ? `${sourceSchema}.${sourceTable}` : sourceTable;
  }

  private getFullTargetTableName(): string {
    const { targetSchema, targetTable } = this.config;
    return targetSchema ? `${targetSchema}.${targetTable}` : targetTable;
  }
}
