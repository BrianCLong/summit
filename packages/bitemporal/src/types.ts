import { z } from 'zod';

/**
 * Temporal interval representing valid time and transaction time
 */
export const TemporalIntervalSchema = z.object({
  validFrom: z.date(),
  validTo: z.date(),
  txFrom: z.date(),
  txTo: z.date(),
});

export type TemporalInterval = z.infer<typeof TemporalIntervalSchema>;

/**
 * Bitemporal record with both valid and transaction time dimensions
 */
export interface BitemporalRecord<T = any> {
  id: string;
  entityKey: string;
  data: T;
  validFrom: Date;
  validTo: Date;
  txFrom: Date;
  txTo: Date;
  createdBy?: string;
  modifiedBy?: string;
  metadata?: Record<string, any>;
}

/**
 * Temporal snapshot at a specific point in time
 */
export interface TemporalSnapshot<T = any> {
  asOfValidTime: Date;
  asOfTxTime: Date;
  records: Array<BitemporalRecord<T>>;
  totalCount: number;
}

/**
 * Temporal diff between two snapshots
 */
export interface TemporalDiff<T = any> {
  fromSnapshot: {
    validTime: Date;
    txTime: Date;
  };
  toSnapshot: {
    validTime: Date;
    txTime: Date;
  };
  added: Array<BitemporalRecord<T>>;
  removed: Array<BitemporalRecord<T>>;
  modified: Array<{
    before: BitemporalRecord<T>;
    after: BitemporalRecord<T>;
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }>;
}

/**
 * Signed audit record
 */
export interface SignedAudit {
  id: string;
  entityKey: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  validTime: Date;
  txTime: Date;
  userId?: string;
  data: any;
  hash: string;
  signature?: string;
  timestamp: Date;
}

/**
 * Query options for temporal queries
 */
export interface TemporalQueryOptions {
  asOfValidTime?: Date;
  asOfTxTime?: Date;
  validTimeRange?: {
    from: Date;
    to: Date;
  };
  txTimeRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;
  offset?: number;
}

/**
 * Upsert options
 */
export interface UpsertOptions {
  validFrom: Date;
  validTo?: Date; // Defaults to MAX_DATE
  userId?: string;
  metadata?: Record<string, any>;
}
