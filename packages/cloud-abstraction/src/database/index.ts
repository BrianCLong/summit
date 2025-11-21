/**
 * Cloud-agnostic NoSQL database interface
 */

import {
  CloudProvider,
  DatabaseItem,
  DatabaseQueryOptions,
  DatabaseQueryResult,
  DatabaseWriteOptions,
  DatabaseError
} from '../types';

export interface IDatabaseProvider {
  readonly provider: CloudProvider;

  /**
   * Get a single item by key
   */
  get<T = DatabaseItem>(
    table: string,
    key: Record<string, any>
  ): Promise<T | null>;

  /**
   * Put an item
   */
  put(
    table: string,
    item: DatabaseItem,
    options?: DatabaseWriteOptions
  ): Promise<void>;

  /**
   * Delete an item
   */
  delete(table: string, key: Record<string, any>): Promise<void>;

  /**
   * Query items
   */
  query<T = DatabaseItem>(
    table: string,
    conditions: Record<string, any>,
    options?: DatabaseQueryOptions
  ): Promise<DatabaseQueryResult<T>>;

  /**
   * Scan all items (use sparingly)
   */
  scan<T = DatabaseItem>(
    table: string,
    options?: DatabaseQueryOptions
  ): Promise<DatabaseQueryResult<T>>;

  /**
   * Batch get items
   */
  batchGet<T = DatabaseItem>(
    table: string,
    keys: Record<string, any>[]
  ): Promise<T[]>;

  /**
   * Batch write items
   */
  batchWrite(
    table: string,
    items: { put?: DatabaseItem[]; delete?: Record<string, any>[] }
  ): Promise<void>;

  /**
   * Execute a transaction
   */
  transaction(
    operations: Array<{
      type: 'put' | 'delete' | 'update';
      table: string;
      item?: DatabaseItem;
      key?: Record<string, any>;
      update?: Record<string, any>;
    }>
  ): Promise<void>;
}

export { AWSDatabaseProvider } from './aws-database';
export { AzureDatabaseProvider } from './azure-database';
export { GCPDatabaseProvider } from './gcp-database';
