/**
 * Data loading engine with multiple load strategies
 */

import { Pool, PoolClient } from 'pg';
import { Logger } from 'winston';
import { LoadConfig, LoadStrategy, PipelineError } from '@intelgraph/data-integration/src/types';

export interface LoadResult {
  recordsLoaded: number;
  recordsFailed: number;
  errors: PipelineError[];
}

export class DataLoader {
  private config: LoadConfig;
  private logger: Logger;
  private pool: Pool | null = null;
  private client: PoolClient | null = null;

  constructor(config: LoadConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    // Using PostgreSQL as default target - would support multiple targets
    this.pool = new Pool({
      // Connection config would come from environment or config
      connectionString: process.env.TARGET_DATABASE_URL
    });

    this.client = await this.pool.connect();
    this.logger.info('Connected to target database');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.logger.info('Disconnected from target database');
  }

  /**
   * Load data to target using configured strategy
   */
  async load(data: any[]): Promise<LoadResult> {
    const result: LoadResult = {
      recordsLoaded: 0,
      recordsFailed: 0,
      errors: []
    };

    if (data.length === 0) {
      return result;
    }

    try {
      switch (this.config.strategy) {
        case LoadStrategy.BULK:
          await this.bulkLoad(data, result);
          break;
        case LoadStrategy.UPSERT:
          await this.upsertLoad(data, result);
          break;
        case LoadStrategy.SCD_TYPE2:
          await this.scdType2Load(data, result);
          break;
        case LoadStrategy.APPEND_ONLY:
          await this.appendOnlyLoad(data, result);
          break;
        case LoadStrategy.DELTA:
          await this.deltaLoad(data, result);
          break;
        default:
          await this.bulkLoad(data, result);
      }

      return result;
    } catch (error) {
      this.logger.error('Error loading data', { error });
      result.errors.push({
        timestamp: new Date(),
        stage: 'loading',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
      return result;
    }
  }

  private async bulkLoad(data: any[], result: LoadResult): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const batchSize = this.config.batchSize || 1000;
    const tableName = this.getFullTableName();

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      try {
        await this.client.query('BEGIN');

        for (const record of batch) {
          const { columns, values, placeholders } = this.prepareInsert(record);
          const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

          await this.client.query(query, values);
          result.recordsLoaded++;
        }

        await this.client.query('COMMIT');
      } catch (error) {
        await this.client.query('ROLLBACK');
        result.recordsFailed += batch.length;
        result.errors.push({
          timestamp: new Date(),
          stage: 'loading',
          message: `Bulk load failed for batch starting at index ${i}`,
          details: error
        });
      }
    }
  }

  private async upsertLoad(data: any[], result: LoadResult): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const tableName = this.getFullTableName();
    const upsertKeys = this.config.upsertKey || ['id'];

    for (const record of data) {
      try {
        const { columns, values, placeholders } = this.prepareInsert(record);
        const updateSet = columns
          .split(',')
          .map((col, idx) => `${col.trim()} = $${idx + 1}`)
          .join(', ');

        const conflictColumns = upsertKeys.join(', ');

        const query = `
          INSERT INTO ${tableName} (${columns})
          VALUES (${placeholders})
          ON CONFLICT (${conflictColumns})
          DO UPDATE SET ${updateSet}
        `;

        await this.client.query(query, values);
        result.recordsLoaded++;
      } catch (error) {
        result.recordsFailed++;
        result.errors.push({
          timestamp: new Date(),
          stage: 'loading',
          message: 'Upsert failed for record',
          details: error
        });
      }
    }
  }

  private async scdType2Load(data: any[], result: LoadResult): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const tableName = this.getFullTableName();
    const naturalKeys = this.config.upsertKey || ['id'];
    const effectiveFrom = 'effective_from';
    const effectiveTo = 'effective_to';
    const isCurrent = 'is_current';

    for (const record of data) {
      try {
        await this.client.query('BEGIN');

        // Close current record
        const whereClause = naturalKeys
          .map((key, idx) => `${key} = $${idx + 1}`)
          .join(' AND ');
        const keyValues = naturalKeys.map(key => record[key]);

        await this.client.query(
          `UPDATE ${tableName}
           SET ${effectiveTo} = CURRENT_TIMESTAMP, ${isCurrent} = false
           WHERE ${whereClause} AND ${isCurrent} = true`,
          keyValues
        );

        // Insert new record
        const enrichedRecord = {
          ...record,
          [effectiveFrom]: new Date(),
          [effectiveTo]: new Date('9999-12-31'),
          [isCurrent]: true
        };

        const { columns, values, placeholders } = this.prepareInsert(enrichedRecord);
        const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

        await this.client.query(query, values);
        await this.client.query('COMMIT');

        result.recordsLoaded++;
      } catch (error) {
        await this.client.query('ROLLBACK');
        result.recordsFailed++;
        result.errors.push({
          timestamp: new Date(),
          stage: 'loading',
          message: 'SCD Type 2 load failed for record',
          details: error
        });
      }
    }
  }

  private async appendOnlyLoad(data: any[], result: LoadResult): Promise<void> {
    await this.bulkLoad(data, result);
  }

  private async deltaLoad(data: any[], result: LoadResult): Promise<void> {
    // Similar to upsert but only updates changed fields
    await this.upsertLoad(data, result);
  }

  private prepareInsert(record: any): { columns: string; values: any[]; placeholders: string } {
    const columns: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(record)) {
      columns.push(key);
      values.push(value);
    }

    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');

    return {
      columns: columns.join(', '),
      values,
      placeholders
    };
  }

  private getFullTableName(): string {
    const { targetSchema, targetTable } = this.config;
    return targetSchema ? `${targetSchema}.${targetTable}` : targetTable;
  }
}
