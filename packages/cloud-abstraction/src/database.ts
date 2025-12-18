/**
 * Cloud-agnostic NoSQL database interface
 *
 * Placeholder for future implementation of DynamoDB, Cosmos DB, Firestore abstractions
 */

import {
  CloudProvider,
  DatabaseItem,
  DatabaseQueryOptions,
  DatabaseQueryResult,
  DatabaseWriteOptions,
  DatabaseError
} from './types.js';

export interface IDatabaseProvider {
  readonly provider: CloudProvider;

  /**
   * Get item by key
   */
  get(table: string, key: Record<string, any>): Promise<DatabaseItem | null>;

  /**
   * Put item
   */
  put(table: string, item: DatabaseItem, options?: DatabaseWriteOptions): Promise<void>;

  /**
   * Delete item
   */
  delete(table: string, key: Record<string, any>): Promise<void>;

  /**
   * Query items
   */
  query(
    table: string,
    filter: Record<string, any>,
    options?: DatabaseQueryOptions
  ): Promise<DatabaseQueryResult>;

  /**
   * Scan all items
   */
  scan(table: string, options?: DatabaseQueryOptions): Promise<DatabaseQueryResult>;

  /**
   * Batch get items
   */
  batchGet(table: string, keys: Record<string, any>[]): Promise<DatabaseItem[]>;

  /**
   * Batch write items
   */
  batchWrite(
    table: string,
    items: DatabaseItem[],
    options?: DatabaseWriteOptions
  ): Promise<void>;

  /**
   * Create table
   */
  createTable(table: string, schema: any): Promise<void>;

  /**
   * Delete table
   */
  deleteTable(table: string): Promise<void>;
}

// Re-export types for convenience
export type { DatabaseItem, DatabaseQueryOptions, DatabaseQueryResult, DatabaseWriteOptions, DatabaseError };
