/**
 * Base Table Format
 * Abstract base class for all table format implementations
 */

import {
  TableFormat,
  TableConfig,
  Transaction,
  Snapshot,
  TimeTravel,
  DataFile,
  OptimizeResult,
  TableMetadata
} from '../types.js';

export abstract class BaseTable {
  protected config: TableConfig;
  protected metadata: TableMetadata;

  constructor(config: TableConfig) {
    this.config = config;
    this.metadata = this.initializeMetadata();
  }

  protected initializeMetadata(): TableMetadata {
    return {
      id: `${this.config.name}-${Date.now()}`,
      name: this.config.name,
      format: this.config.format,
      schema: this.config.schema,
      location: this.config.location,
      properties: this.config.properties || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  abstract beginTransaction(operation: 'insert' | 'update' | 'delete' | 'merge'): Promise<Transaction>;
  abstract commitTransaction(transaction: Transaction): Promise<void>;
  abstract abortTransaction(transaction: Transaction): Promise<void>;

  abstract createSnapshot(): Promise<Snapshot>;
  abstract getSnapshot(snapshotId: string): Promise<Snapshot>;
  abstract listSnapshots(): Promise<Snapshot[]>;
  abstract rollbackToSnapshot(snapshotId: string): Promise<void>;

  abstract readAtVersion(timeTravel: TimeTravel): Promise<any[]>;
  abstract getHistory(): Promise<Snapshot[]>;

  abstract addDataFiles(files: DataFile[]): Promise<void>;
  abstract listDataFiles(): Promise<DataFile[]>;
  abstract deleteDataFiles(paths: string[]): Promise<void>;

  abstract optimize(targetFileSize?: number): Promise<OptimizeResult>;
  abstract compact(): Promise<OptimizeResult>;
  abstract vacuum(olderThan: Date): Promise<number>;

  abstract updateSchema(newSchema: any): Promise<void>;
  abstract evolveSchema(changes: any): Promise<void>;

  getMetadata(): TableMetadata {
    return this.metadata;
  }

  getName(): string {
    return this.config.name;
  }

  getFormat(): TableFormat {
    return this.config.format;
  }

  getLocation(): string {
    return this.config.location;
  }
}
