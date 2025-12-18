/**
 * Lakehouse Catalog
 * Metadata management for lakehouse tables
 */

import { TableMetadata } from './types.js';
import pino from 'pino';

const logger = pino({ name: 'lakehouse-catalog' });

export interface CatalogEntry {
  metadata: TableMetadata;
  registeredAt: Date;
  lastAccessed: Date;
}

export class LakehouseCatalog {
  private entries: Map<string, CatalogEntry>;

  constructor() {
    this.entries = new Map();
    logger.info('Lakehouse catalog initialized');
  }

  async registerTable(metadata: TableMetadata): Promise<void> {
    const entry: CatalogEntry = {
      metadata,
      registeredAt: new Date(),
      lastAccessed: new Date()
    };

    this.entries.set(metadata.name, entry);
    logger.info({ table: metadata.name }, 'Table registered in catalog');
  }

  async unregisterTable(name: string): Promise<void> {
    this.entries.delete(name);
    logger.info({ table: name }, 'Table unregistered from catalog');
  }

  async getTableMetadata(name: string): Promise<TableMetadata | undefined> {
    const entry = this.entries.get(name);
    if (entry) {
      entry.lastAccessed = new Date();
      return entry.metadata;
    }
    return undefined;
  }

  async listTables(): Promise<TableMetadata[]> {
    return Array.from(this.entries.values()).map(e => e.metadata);
  }

  async searchTables(pattern: string): Promise<TableMetadata[]> {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.entries.values())
      .filter(e => regex.test(e.metadata.name))
      .map(e => e.metadata);
  }

  async updateTableMetadata(name: string, updates: Partial<TableMetadata>): Promise<void> {
    const entry = this.entries.get(name);
    if (!entry) {
      throw new Error(`Table ${name} not found in catalog`);
    }

    Object.assign(entry.metadata, updates);
    entry.metadata.updatedAt = new Date();
    logger.info({ table: name }, 'Table metadata updated');
  }

  async getStatistics(): Promise<any> {
    return {
      totalTables: this.entries.size,
      tablesByFormat: this.getTablesByFormat(),
      totalSize: this.getTotalSize()
    };
  }

  private getTablesByFormat(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.entries.values()) {
      const format = entry.metadata.format;
      counts[format] = (counts[format] || 0) + 1;
    }
    return counts;
  }

  private getTotalSize(): number {
    // Would calculate total size from table metadata
    return 0;
  }
}
