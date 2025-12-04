/**
 * Data Lakehouse - Core Types
 * Types for lakehouse architecture with ACID transactions
 */

import { z } from 'zod';

// Table Format Types
export enum TableFormat {
  DELTA_LAKE = 'delta',
  ICEBERG = 'iceberg',
  HUDI = 'hudi',
  PARQUET = 'parquet'
}

export enum CompressionCodec {
  NONE = 'none',
  SNAPPY = 'snappy',
  GZIP = 'gzip',
  LZ4 = 'lz4',
  ZSTD = 'zstd'
}

// Schema Types
export const ColumnSchema = z.object({
  name: z.string(),
  type: z.enum([
    'string',
    'int',
    'bigint',
    'float',
    'double',
    'boolean',
    'timestamp',
    'date',
    'binary',
    'array',
    'map',
    'struct'
  ]),
  nullable: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});

export type Column = z.infer<typeof ColumnSchema>;

export const TableSchema = z.object({
  columns: z.array(ColumnSchema),
  partitionKeys: z.array(z.string()).optional(),
  sortKeys: z.array(z.string()).optional()
});

export type TableSchemaType = z.infer<typeof TableSchema>;

// Table Configuration
export const TableConfigSchema = z.object({
  name: z.string(),
  format: z.nativeEnum(TableFormat),
  schema: TableSchema,
  location: z.string(),
  compression: z.nativeEnum(CompressionCodec).default(CompressionCodec.SNAPPY),
  properties: z.record(z.any()).optional()
});

export type TableConfig = z.infer<typeof TableConfigSchema>;

// Transaction Types
export interface Transaction {
  id: string;
  tableId: string;
  operation: 'insert' | 'update' | 'delete' | 'merge';
  timestamp: Date;
  version: number;
  status: 'pending' | 'committed' | 'aborted';
  metadata: Record<string, any>;
}

// Snapshot and Time Travel
export interface Snapshot {
  id: string;
  tableId: string;
  version: number;
  timestamp: Date;
  operation: string;
  manifestFiles: string[];
  summary: {
    totalRecords: number;
    totalFiles: number;
    totalSize: number;
  };
}

export interface TimeTravel {
  version?: number;
  timestamp?: Date;
  snapshotId?: string;
}

// Partitioning
export enum PartitionTransform {
  IDENTITY = 'identity',
  YEAR = 'year',
  MONTH = 'month',
  DAY = 'day',
  HOUR = 'hour',
  BUCKET = 'bucket',
  TRUNCATE = 'truncate'
}

export interface PartitionSpec {
  sourceColumn: string;
  transform: PartitionTransform;
  name: string;
  params?: any;
}

// File Management
export interface DataFile {
  path: string;
  format: 'parquet' | 'orc' | 'avro';
  partition: Record<string, any>;
  recordCount: number;
  fileSizeBytes: number;
  columnStats?: Record<string, ColumnStats>;
}

export interface ColumnStats {
  nullCount: number;
  min: any;
  max: any;
  distinctCount?: number;
}

// Compaction and Optimization
export interface CompactionConfig {
  targetFileSize: number; // bytes
  maxFileAge: number; // milliseconds
  minInputFiles: number;
  rewriteDataFiles: boolean;
}

export interface OptimizeResult {
  filesAdded: number;
  filesRemoved: number;
  bytesAdded: number;
  bytesRemoved: number;
  duration: number;
}

// Z-Ordering
export interface ZOrderConfig {
  columns: string[];
  maxFileSize: number;
}

// Metadata Management
export interface TableMetadata {
  id: string;
  name: string;
  format: TableFormat;
  schema: TableSchemaType;
  location: string;
  currentSnapshotId?: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Query Planning
export interface QueryPlan {
  tableId: string;
  filters: Filter[];
  projections: string[];
  partitionPruning: {
    totalPartitions: number;
    prunedPartitions: number;
  };
  dataSkipping: {
    totalFiles: number;
    skippedFiles: number;
  };
  estimatedRows: number;
  estimatedBytes: number;
}

export interface Filter {
  column: string;
  operator: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'like';
  value: any;
}

// Change Data Capture (CDC)
export interface CDCRecord {
  operation: 'insert' | 'update' | 'delete';
  key: Record<string, any>;
  before?: Record<string, any>;
  after?: Record<string, any>;
  timestamp: Date;
  source: string;
}

// Streaming
export interface StreamingConfig {
  checkpointLocation: string;
  triggerInterval: number; // milliseconds
  maxRecordsPerBatch?: number;
  watermarkDelayMs?: number;
}
