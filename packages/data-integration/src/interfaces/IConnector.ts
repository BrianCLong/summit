/**
 * Core connector interface
 */

import { EventEmitter } from 'events';
import {
  ConnectionConfig,
  ConnectorMetadata,
  ConnectorCapabilities,
  ReadOptions,
  WriteOptions,
  SchemaInfo,
} from '../types';

/**
 * Base interface for all data connectors
 */
export interface IConnector extends EventEmitter {
  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata;

  /**
   * Test connection to data source
   */
  testConnection(): Promise<boolean>;

  /**
   * Connect to data source
   */
  connect(config: ConnectionConfig): Promise<void>;

  /**
   * Disconnect from data source
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Get schema information
   */
  getSchema(tableName?: string): Promise<SchemaInfo | SchemaInfo[]>;

  /**
   * Read data from source
   */
  read(options?: ReadOptions): AsyncIterableIterator<any>;

  /**
   * Write data to target
   */
  write(data: any[], options?: WriteOptions): Promise<WriteResult>;

  /**
   * Get connector capabilities
   */
  getCapabilities(): ConnectorCapabilities;

  /**
   * Validate configuration
   */
  validateConfig(config: ConnectionConfig): Promise<ValidationResult>;
}

/**
 * Batch read interface for connectors that support batch operations
 */
export interface IBatchConnector extends IConnector {
  /**
   * Read data in batches
   */
  readBatch(batchSize: number, options?: ReadOptions): AsyncIterableIterator<any[]>;

  /**
   * Write data in batches
   */
  writeBatch(batches: any[][], options?: WriteOptions): Promise<WriteResult>;
}

/**
 * Streaming interface for connectors that support real-time streaming
 */
export interface IStreamingConnector extends IConnector {
  /**
   * Start streaming data
   */
  startStream(options?: StreamOptions): AsyncIterableIterator<any>;

  /**
   * Stop streaming
   */
  stopStream(): Promise<void>;

  /**
   * Pause streaming
   */
  pauseStream(): Promise<void>;

  /**
   * Resume streaming
   */
  resumeStream(): Promise<void>;
}

/**
 * CDC interface for connectors that support change data capture
 */
export interface ICDCConnector extends IConnector {
  /**
   * Start change data capture
   */
  startCDC(options: CDCOptions): AsyncIterableIterator<ChangeRecord>;

  /**
   * Stop change data capture
   */
  stopCDC(): Promise<void>;

  /**
   * Get current CDC position/watermark
   */
  getCDCPosition(): Promise<string | number>;

  /**
   * Set CDC position/watermark
   */
  setCDCPosition(position: string | number): Promise<void>;
}

/**
 * Schema evolution interface
 */
export interface ISchemaEvolution {
  /**
   * Detect schema changes
   */
  detectSchemaChanges(oldSchema: SchemaInfo, newSchema: SchemaInfo): SchemaChange[];

  /**
   * Apply schema changes
   */
  applySchemaChanges(changes: SchemaChange[]): Promise<void>;

  /**
   * Get schema history
   */
  getSchemaHistory(tableName: string): Promise<SchemaVersion[]>;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface WriteResult {
  recordsWritten: number;
  recordsFailed: number;
  errors?: WriteError[];
  duration: number;
  metadata?: Record<string, any>;
}

export interface WriteError {
  record: any;
  error: Error;
  index: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StreamOptions {
  fromBeginning?: boolean;
  fromTimestamp?: Date;
  fromOffset?: number | string;
  batchSize?: number;
  timeout?: number;
}

export interface CDCOptions {
  tables?: string[];
  operations?: ('insert' | 'update' | 'delete')[];
  fromPosition?: string | number;
  includeOldValues?: boolean;
  pollInterval?: number;
}

export interface ChangeRecord {
  operation: 'insert' | 'update' | 'delete';
  table: string;
  schema?: string;
  key: Record<string, any>;
  before?: Record<string, any>;
  after?: Record<string, any>;
  timestamp: Date;
  position?: string | number;
  metadata?: Record<string, any>;
}

export interface SchemaChange {
  type: 'add_column' | 'drop_column' | 'modify_column' | 'add_index' | 'drop_index';
  table: string;
  column?: string;
  details: Record<string, any>;
}

export interface SchemaVersion {
  version: string;
  timestamp: Date;
  changes: SchemaChange[];
  appliedBy?: string;
}
