/**
 * Change Data Capture (CDC) Engine
 * Supports multiple CDC strategies for capturing data changes
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Pool, PoolClient } from 'pg';

export enum CDCStrategy {
  TIMESTAMP = 'timestamp', // Last modified timestamp
  VERSION = 'version', // Version number/sequence
  TRIGGER = 'trigger', // Database triggers
  LOG_BASED = 'log_based', // Transaction log parsing (WAL, binlog, etc.)
  DIFF = 'diff', // Full scan + diff
  HYBRID = 'hybrid' // Combination of strategies
}

export enum ChangeType {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export interface CDCConfig {
  strategy: CDCStrategy;
  sourceTable: string;
  sourceDatabase?: string;
  sourceSchema?: string;
  trackingColumn?: string; // For timestamp/version strategies
  primaryKeys: string[];
  captureDeletes?: boolean;
  pollIntervalSeconds?: number;
  batchSize?: number;
  watermarkTable?: string;
  includeOldValues?: boolean;
}

export interface CDCRecord {
  changeType: ChangeType;
  tableName: string;
  primaryKeyValues: Record<string, any>;
  newValues: Record<string, any>;
  oldValues?: Record<string, any>;
  changeTimestamp: Date;
  transactionId?: string;
  sequence?: number;
  metadata?: Record<string, any>;
}

export interface CDCWatermark {
  sourceTable: string;
  lastProcessedValue: any;
  lastProcessedTime: Date;
  strategy: CDCStrategy;
  metadata?: Record<string, any>;
}

export class CDCEngine extends EventEmitter {
  private config: CDCConfig;
  private logger: Logger;
  private pool: Pool | null = null;
  private isRunning: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(config: CDCConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async connect(connectionString: string): Promise<void> {
    this.pool = new Pool({ connectionString });
    this.logger.info('CDC Engine connected to source database');
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    this.isRunning = false;
    this.logger.info('CDC Engine disconnected');
  }

  /**
   * Start CDC capture process
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('CDC Engine is already running');
    }

    if (!this.pool) {
      throw new Error('CDC Engine not connected. Call connect() first.');
    }

    this.isRunning = true;

    switch (this.config.strategy) {
      case CDCStrategy.TIMESTAMP:
        await this.startTimestampCDC();
        break;
      case CDCStrategy.VERSION:
        await this.startVersionCDC();
        break;
      case CDCStrategy.TRIGGER:
        await this.startTriggerCDC();
        break;
      case CDCStrategy.LOG_BASED:
        await this.startLogBasedCDC();
        break;
      case CDCStrategy.DIFF:
        await this.startDiffCDC();
        break;
      default:
        throw new Error(`Unsupported CDC strategy: ${this.config.strategy}`);
    }

    this.logger.info(`CDC Engine started with strategy: ${this.config.strategy}`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.logger.info('CDC Engine stopped');
  }

  /**
   * Timestamp-based CDC: Track changes using last_modified timestamp
   */
  private async startTimestampCDC(): Promise<void> {
    const pollIntervalMs = (this.config.pollIntervalSeconds || 60) * 1000;

    this.pollInterval = setInterval(async () => {
      try {
        await this.captureTimestampChanges();
      } catch (error) {
        this.logger.error('Error capturing timestamp changes', { error });
        this.emit('error', error);
      }
    }, pollIntervalMs);

    // Initial capture
    await this.captureTimestampChanges();
  }

  private async captureTimestampChanges(): Promise<void> {
    if (!this.pool) return;

    const client = await this.pool.connect();

    try {
      // Get last watermark
      const watermark = await this.getWatermark(client);
      const lastValue = watermark?.lastProcessedValue || new Date('1970-01-01');

      const tableName = this.getFullTableName();
      const trackingColumn = this.config.trackingColumn || 'updated_at';
      const batchSize = this.config.batchSize || 1000;

      // Query for changes since last watermark
      const query = `
        SELECT *
        FROM ${tableName}
        WHERE ${trackingColumn} > $1
        ORDER BY ${trackingColumn} ASC
        LIMIT $2
      `;

      const result = await client.query(query, [lastValue, batchSize]);

      if (result.rows.length === 0) {
        return;
      }

      // Convert to CDC records
      const cdcRecords: CDCRecord[] = result.rows.map(row => ({
        changeType: ChangeType.UPDATE, // Timestamp-based can't distinguish INSERT from UPDATE
        tableName: this.config.sourceTable,
        primaryKeyValues: this.extractPrimaryKeys(row),
        newValues: row,
        changeTimestamp: row[trackingColumn],
        metadata: {
          strategy: CDCStrategy.TIMESTAMP,
          trackingColumn
        }
      }));

      // Emit changes
      this.emit('changes', cdcRecords);

      // Update watermark
      const maxTimestamp = result.rows[result.rows.length - 1][trackingColumn];
      await this.updateWatermark(client, maxTimestamp);

      this.logger.debug(`Captured ${cdcRecords.length} timestamp-based changes`);
    } finally {
      client.release();
    }
  }

  /**
   * Version-based CDC: Track changes using version/sequence number
   */
  private async startVersionCDC(): Promise<void> {
    const pollIntervalMs = (this.config.pollIntervalSeconds || 60) * 1000;

    this.pollInterval = setInterval(async () => {
      try {
        await this.captureVersionChanges();
      } catch (error) {
        this.logger.error('Error capturing version changes', { error });
        this.emit('error', error);
      }
    }, pollIntervalMs);

    await this.captureVersionChanges();
  }

  private async captureVersionChanges(): Promise<void> {
    if (!this.pool) return;

    const client = await this.pool.connect();

    try {
      const watermark = await this.getWatermark(client);
      const lastVersion = watermark?.lastProcessedValue || 0;

      const tableName = this.getFullTableName();
      const versionColumn = this.config.trackingColumn || 'version';
      const batchSize = this.config.batchSize || 1000;

      const query = `
        SELECT *
        FROM ${tableName}
        WHERE ${versionColumn} > $1
        ORDER BY ${versionColumn} ASC
        LIMIT $2
      `;

      const result = await client.query(query, [lastVersion, batchSize]);

      if (result.rows.length === 0) {
        return;
      }

      const cdcRecords: CDCRecord[] = result.rows.map(row => ({
        changeType: ChangeType.UPDATE,
        tableName: this.config.sourceTable,
        primaryKeyValues: this.extractPrimaryKeys(row),
        newValues: row,
        changeTimestamp: new Date(),
        sequence: row[versionColumn],
        metadata: {
          strategy: CDCStrategy.VERSION,
          versionColumn
        }
      }));

      this.emit('changes', cdcRecords);

      const maxVersion = result.rows[result.rows.length - 1][versionColumn];
      await this.updateWatermark(client, maxVersion);

      this.logger.debug(`Captured ${cdcRecords.length} version-based changes`);
    } finally {
      client.release();
    }
  }

  /**
   * Trigger-based CDC: Read from change tracking table populated by triggers
   */
  private async startTriggerCDC(): Promise<void> {
    const pollIntervalMs = (this.config.pollIntervalSeconds || 10) * 1000;

    // Ensure trigger and change table exist
    await this.setupTriggerCDC();

    this.pollInterval = setInterval(async () => {
      try {
        await this.captureTriggerChanges();
      } catch (error) {
        this.logger.error('Error capturing trigger changes', { error });
        this.emit('error', error);
      }
    }, pollIntervalMs);

    await this.captureTriggerChanges();
  }

  private async setupTriggerCDC(): Promise<void> {
    if (!this.pool) return;

    const client = await this.pool.connect();

    try {
      const changeTableName = `${this.config.sourceTable}_changes`;
      const tableName = this.getFullTableName();

      // Create change tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${changeTableName} (
          change_id SERIAL PRIMARY KEY,
          operation VARCHAR(10) NOT NULL,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          table_name VARCHAR(255) NOT NULL,
          primary_key_values JSONB NOT NULL,
          old_values JSONB,
          new_values JSONB,
          transaction_id BIGINT
        )
      `);

      // Create trigger function
      await client.query(`
        CREATE OR REPLACE FUNCTION ${this.config.sourceTable}_change_trigger()
        RETURNS TRIGGER AS $$
        BEGIN
          IF (TG_OP = 'INSERT') THEN
            INSERT INTO ${changeTableName} (operation, table_name, primary_key_values, new_values, transaction_id)
            VALUES ('INSERT', TG_TABLE_NAME, row_to_json(NEW)::jsonb, row_to_json(NEW)::jsonb, txid_current());
            RETURN NEW;
          ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO ${changeTableName} (operation, table_name, primary_key_values, old_values, new_values, transaction_id)
            VALUES ('UPDATE', TG_TABLE_NAME, row_to_json(NEW)::jsonb, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, txid_current());
            RETURN NEW;
          ELSIF (TG_OP = 'DELETE') THEN
            INSERT INTO ${changeTableName} (operation, table_name, primary_key_values, old_values, transaction_id)
            VALUES ('DELETE', TG_TABLE_NAME, row_to_json(OLD)::jsonb, row_to_json(OLD)::jsonb, txid_current());
            RETURN OLD;
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Create trigger
      await client.query(`
        DROP TRIGGER IF EXISTS ${this.config.sourceTable}_cdc_trigger ON ${tableName};
        CREATE TRIGGER ${this.config.sourceTable}_cdc_trigger
        AFTER INSERT OR UPDATE OR DELETE ON ${tableName}
        FOR EACH ROW EXECUTE FUNCTION ${this.config.sourceTable}_change_trigger();
      `);

      this.logger.info('Trigger-based CDC setup completed');
    } finally {
      client.release();
    }
  }

  private async captureTriggerChanges(): Promise<void> {
    if (!this.pool) return;

    const client = await this.pool.connect();

    try {
      const changeTableName = `${this.config.sourceTable}_changes`;
      const watermark = await this.getWatermark(client);
      const lastChangeId = watermark?.lastProcessedValue || 0;
      const batchSize = this.config.batchSize || 1000;

      const query = `
        SELECT *
        FROM ${changeTableName}
        WHERE change_id > $1
        ORDER BY change_id ASC
        LIMIT $2
      `;

      const result = await client.query(query, [lastChangeId, batchSize]);

      if (result.rows.length === 0) {
        return;
      }

      const cdcRecords: CDCRecord[] = result.rows.map(row => ({
        changeType: row.operation as ChangeType,
        tableName: row.table_name,
        primaryKeyValues: row.primary_key_values,
        newValues: row.new_values,
        oldValues: row.old_values,
        changeTimestamp: row.changed_at,
        transactionId: row.transaction_id?.toString(),
        metadata: {
          strategy: CDCStrategy.TRIGGER,
          changeId: row.change_id
        }
      }));

      this.emit('changes', cdcRecords);

      const maxChangeId = result.rows[result.rows.length - 1].change_id;
      await this.updateWatermark(client, maxChangeId);

      this.logger.debug(`Captured ${cdcRecords.length} trigger-based changes`);
    } finally {
      client.release();
    }
  }

  /**
   * Log-based CDC: Parse database transaction logs (WAL for PostgreSQL)
   */
  private async startLogBasedCDC(): Promise<void> {
    // This would integrate with logical replication slots or external tools like Debezium
    this.logger.warn('Log-based CDC requires external tools like Debezium or logical replication');
    throw new Error('Log-based CDC not yet implemented - use Debezium or logical replication');
  }

  /**
   * Diff-based CDC: Compare full snapshots to detect changes
   */
  private async startDiffCDC(): Promise<void> {
    const pollIntervalMs = (this.config.pollIntervalSeconds || 300) * 1000;

    this.pollInterval = setInterval(async () => {
      try {
        await this.captureDiffChanges();
      } catch (error) {
        this.logger.error('Error capturing diff changes', { error });
        this.emit('error', error);
      }
    }, pollIntervalMs);

    await this.captureDiffChanges();
  }

  private async captureDiffChanges(): Promise<void> {
    // This would require storing snapshots and comparing them
    // Complex implementation - typically used only when other methods aren't available
    this.logger.info('Diff-based CDC - taking snapshot for comparison');
    // Placeholder implementation
  }

  /**
   * Get current watermark from tracking table
   */
  private async getWatermark(client: PoolClient): Promise<CDCWatermark | null> {
    const watermarkTable = this.config.watermarkTable || 'etl_cdc_watermarks';

    try {
      const result = await client.query(
        `SELECT * FROM ${watermarkTable} WHERE source_table = $1 ORDER BY last_processed_time DESC LIMIT 1`,
        [this.config.sourceTable]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        sourceTable: row.source_table,
        lastProcessedValue: row.last_processed_value,
        lastProcessedTime: row.last_processed_time,
        strategy: row.strategy,
        metadata: row.metadata
      };
    } catch (error) {
      // Table might not exist yet
      await this.createWatermarkTable(client);
      return null;
    }
  }

  /**
   * Update watermark after processing changes
   */
  private async updateWatermark(client: PoolClient, value: any): Promise<void> {
    const watermarkTable = this.config.watermarkTable || 'etl_cdc_watermarks';

    await client.query(
      `INSERT INTO ${watermarkTable} (source_table, last_processed_value, last_processed_time, strategy)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3)`,
      [this.config.sourceTable, value, this.config.strategy]
    );
  }

  /**
   * Create watermark tracking table
   */
  private async createWatermarkTable(client: PoolClient): Promise<void> {
    const watermarkTable = this.config.watermarkTable || 'etl_cdc_watermarks';

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${watermarkTable} (
        id SERIAL PRIMARY KEY,
        source_table VARCHAR(255) NOT NULL,
        last_processed_value TEXT NOT NULL,
        last_processed_time TIMESTAMP NOT NULL,
        strategy VARCHAR(50) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cdc_watermarks_source_table
      ON ${watermarkTable}(source_table, last_processed_time DESC)
    `);
  }

  private extractPrimaryKeys(row: any): Record<string, any> {
    const keys: Record<string, any> = {};

    for (const pkColumn of this.config.primaryKeys) {
      keys[pkColumn] = row[pkColumn];
    }

    return keys;
  }

  private getFullTableName(): string {
    const { sourceSchema, sourceTable, sourceDatabase } = this.config;

    if (sourceDatabase && sourceSchema) {
      return `${sourceDatabase}.${sourceSchema}.${sourceTable}`;
    } else if (sourceSchema) {
      return `${sourceSchema}.${sourceTable}`;
    }

    return sourceTable;
  }
}
