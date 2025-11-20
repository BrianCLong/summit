/**
 * Lakehouse Manager
 * Central management for data lakehouse operations
 */

import { TableFormat, TableConfig } from './types.js';
import { BaseTable } from './table-formats/base-table.js';
import { DeltaLakeTable } from './table-formats/delta-lake.js';
import { IcebergTable } from './table-formats/iceberg.js';
import { HudiTable, HudiTableType } from './table-formats/hudi.js';
import { LakehouseCatalog } from './catalog.js';
import pino from 'pino';

const logger = pino({ name: 'lakehouse-manager' });

export class LakehouseManager {
  private tables: Map<string, BaseTable>;
  private catalog: LakehouseCatalog;

  constructor() {
    this.tables = new Map();
    this.catalog = new LakehouseCatalog();
    logger.info('Lakehouse manager initialized');
  }

  async createTable(config: TableConfig): Promise<BaseTable> {
    if (this.tables.has(config.name)) {
      throw new Error(`Table ${config.name} already exists`);
    }

    let table: BaseTable;

    switch (config.format) {
      case TableFormat.DELTA_LAKE:
        table = new DeltaLakeTable(config);
        break;
      case TableFormat.ICEBERG:
        table = new IcebergTable(config);
        break;
      case TableFormat.HUDI:
        table = new HudiTable(config, HudiTableType.COPY_ON_WRITE);
        break;
      default:
        throw new Error(`Unsupported table format: ${config.format}`);
    }

    this.tables.set(config.name, table);
    await this.catalog.registerTable(table.getMetadata());

    logger.info({ table: config.name, format: config.format }, 'Table created');

    return table;
  }

  getTable(name: string): BaseTable | undefined {
    return this.tables.get(name);
  }

  async dropTable(name: string): Promise<void> {
    const table = this.tables.get(name);
    if (!table) {
      throw new Error(`Table ${name} not found`);
    }

    this.tables.delete(name);
    await this.catalog.unregisterTable(name);

    logger.info({ table: name }, 'Table dropped');
  }

  async listTables(): Promise<string[]> {
    return Array.from(this.tables.keys());
  }

  async getTableMetadata(name: string): Promise<any> {
    const table = this.tables.get(name);
    if (!table) {
      throw new Error(`Table ${name} not found`);
    }
    return table.getMetadata();
  }

  getCatalog(): LakehouseCatalog {
    return this.catalog;
  }

  async compactAllTables(): Promise<void> {
    logger.info('Starting compaction for all tables');

    for (const [name, table] of this.tables) {
      try {
        const result = await table.compact();
        logger.info({ table: name, result }, 'Table compacted');
      } catch (error) {
        logger.error({ error, table: name }, 'Failed to compact table');
      }
    }
  }

  async vacuumAllTables(olderThan: Date): Promise<void> {
    logger.info({ olderThan }, 'Starting vacuum for all tables');

    for (const [name, table] of this.tables) {
      try {
        const removed = await table.vacuum(olderThan);
        logger.info({ table: name, removed }, 'Table vacuumed');
      } catch (error) {
        logger.error({ error, table: name }, 'Failed to vacuum table');
      }
    }
  }
}
