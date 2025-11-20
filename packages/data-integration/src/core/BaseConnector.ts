/**
 * Base connector implementation
 */

import { EventEmitter } from 'events';
import {
  IConnector,
  ValidationResult,
  WriteResult,
} from '../interfaces/IConnector';
import {
  ConnectionConfig,
  ConnectorMetadata,
  ConnectorCapabilities,
  ReadOptions,
  WriteOptions,
  SchemaInfo,
} from '../types';

/**
 * Abstract base class for all connectors
 */
export abstract class BaseConnector extends EventEmitter implements IConnector {
  protected config!: ConnectionConfig;
  protected connected: boolean = false;
  protected metadata: ConnectorMetadata;

  constructor(metadata: ConnectorMetadata) {
    super();
    this.metadata = metadata;
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return this.metadata;
  }

  /**
   * Get connector capabilities
   */
  getCapabilities(): ConnectorCapabilities {
    return this.metadata.capabilities;
  }

  /**
   * Test connection to data source
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect(this.config);
      await this.disconnect();
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Validate configuration
   */
  async validateConfig(config: ConnectionConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.type) {
      errors.push('Connection type is required');
    }

    if (!config.name) {
      errors.push('Connection name is required');
    }

    // Subclass-specific validation
    const customValidation = await this.customValidation(config);
    errors.push(...customValidation.errors);
    warnings.push(...customValidation.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Custom validation hook for subclasses
   */
  protected async customValidation(config: ConnectionConfig): Promise<ValidationResult> {
    return { valid: true, errors: [], warnings: [] };
  }

  // ============================================================================
  // Abstract methods to be implemented by subclasses
  // ============================================================================

  abstract connect(config: ConnectionConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getSchema(tableName?: string): Promise<SchemaInfo | SchemaInfo[]>;
  abstract read(options?: ReadOptions): AsyncIterableIterator<any>;
  abstract write(data: any[], options?: WriteOptions): Promise<WriteResult>;

  // ============================================================================
  // Helper methods
  // ============================================================================

  /**
   * Emit progress event
   */
  protected emitProgress(processed: number, total?: number): void {
    this.emit('progress', { processed, total });
  }

  /**
   * Emit error event
   */
  protected emitError(error: Error, context?: any): void {
    this.emit('error', { error, context });
  }

  /**
   * Emit data event
   */
  protected emitData(data: any): void {
    this.emit('data', data);
  }
}

/**
 * Base database connector with common SQL functionality
 */
export abstract class BaseDatabaseConnector extends BaseConnector {
  protected abstract executeQuery(query: string, params?: any[]): Promise<any[]>;
  protected abstract executeUpdate(query: string, params?: any[]): Promise<number>;

  /**
   * Get schema for database
   */
  async getSchema(tableName?: string): Promise<SchemaInfo | SchemaInfo[]> {
    if (tableName) {
      return this.getTableSchema(tableName);
    }
    return this.getAllSchemas();
  }

  protected abstract getTableSchema(tableName: string): Promise<SchemaInfo>;
  protected abstract getAllSchemas(): Promise<SchemaInfo[]>;

  /**
   * Read with SQL query
   */
  async *readWithQuery(query: string, params?: any[], batchSize: number = 1000): AsyncIterableIterator<any> {
    const results = await this.executeQuery(query, params);

    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      for (const row of batch) {
        yield row;
      }
      this.emitProgress(Math.min(i + batchSize, results.length), results.length);
    }
  }

  /**
   * Write with batch insert
   */
  async writeBatch(data: any[], tableName: string, options?: WriteOptions): Promise<WriteResult> {
    const startTime = Date.now();
    const batchSize = options?.batchSize || 1000;
    let recordsWritten = 0;
    let recordsFailed = 0;
    const errors: any[] = [];

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      try {
        const written = await this.insertBatch(tableName, batch, options);
        recordsWritten += written;
      } catch (error) {
        recordsFailed += batch.length;
        errors.push({ batch: i / batchSize, error });
      }
      this.emitProgress(i + batch.length, data.length);
    }

    return {
      recordsWritten,
      recordsFailed,
      errors,
      duration: Date.now() - startTime,
    };
  }

  protected abstract insertBatch(tableName: string, data: any[], options?: WriteOptions): Promise<number>;
}
