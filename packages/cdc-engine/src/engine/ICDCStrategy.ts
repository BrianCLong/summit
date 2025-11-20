/**
 * CDC Strategy interface
 */

import { IConnector, CDCConfig, ChangeRecord } from '@intelgraph/data-integration';

/**
 * Interface for CDC capture strategies
 */
export interface CDCStrategy {
  /**
   * Capture changes from source
   */
  captureChanges(connector: IConnector, config: CDCConfig): Promise<ChangeRecord[]>;
}

/**
 * Base CDC strategy
 */
export abstract class BaseCDCStrategy implements CDCStrategy {
  abstract captureChanges(connector: IConnector, config: CDCConfig): Promise<ChangeRecord[]>;

  /**
   * Convert record to change record
   */
  protected toChangeRecord(
    operation: 'insert' | 'update' | 'delete',
    table: string,
    key: Record<string, any>,
    data?: Record<string, any>,
    oldData?: Record<string, any>
  ): ChangeRecord {
    return {
      operation,
      table,
      key,
      after: data,
      before: oldData,
      timestamp: new Date(),
      metadata: {},
    };
  }
}
