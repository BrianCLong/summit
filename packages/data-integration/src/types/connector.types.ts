/**
 * Connector-specific types
 */

import { ConnectionConfig } from './index';

// ============================================================================
// Connector Interface Types
// ============================================================================

export interface ConnectorCapabilities {
  supportsStreaming: boolean;
  supportsBatch: boolean;
  supportsIncremental: boolean;
  supportsCDC: boolean;
  supportsSchema: boolean;
  supportsPartitioning: boolean;
  supportsTransactions: boolean;
  maxBatchSize?: number;
  maxConcurrency?: number;
}

export interface ConnectorMetadata {
  name: string;
  version: string;
  description: string;
  type: string;
  capabilities: ConnectorCapabilities;
  configSchema: any;
  documentationUrl?: string;
}

export interface ReadOptions {
  batchSize?: number;
  offset?: number;
  limit?: number;
  filter?: any;
  projection?: string[];
  sort?: Record<string, 'asc' | 'desc'>;
  partitionKey?: string;
  partitionValue?: any;
  incrementalKey?: string;
  incrementalValue?: any;
  timeout?: number;
}

export interface WriteOptions {
  mode: 'append' | 'overwrite' | 'upsert' | 'merge';
  batchSize?: number;
  transactional?: boolean;
  idempotent?: boolean;
  upsertKey?: string[];
  mergeCondition?: string;
  timeout?: number;
  onConflict?: 'ignore' | 'update' | 'fail';
}

export interface SchemaInfo {
  name: string;
  type: string;
  fields: FieldInfo[];
  primaryKey?: string[];
  indexes?: IndexInfo[];
  constraints?: ConstraintInfo[];
  metadata?: Record<string, any>;
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
  description?: string;
}

export interface IndexInfo {
  name: string;
  fields: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ConstraintInfo {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  fields: string[];
  reference?: {
    table: string;
    fields: string[];
  };
  expression?: string;
}

// ============================================================================
// Database-specific Types
// ============================================================================

export interface SQLQueryConfig {
  query: string;
  parameters?: any[];
  timeout?: number;
  fetchSize?: number;
}

export interface NoSQLQueryConfig {
  collection?: string;
  filter?: any;
  projection?: any;
  sort?: any;
  limit?: number;
  skip?: number;
}

// ============================================================================
// Cloud Storage Types
// ============================================================================

export interface StorageObjectInfo {
  key: string;
  bucket: string;
  size: number;
  lastModified: Date;
  etag?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageListOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  continuationToken?: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface APIRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  body?: any;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    backoff: 'linear' | 'exponential';
  };
  pagination?: {
    type: 'offset' | 'cursor' | 'page';
    pageSize: number;
    maxPages?: number;
  };
}

export interface APIResponseInfo {
  statusCode: number;
  headers: Record<string, string>;
  data: any;
  metadata?: Record<string, any>;
}

// ============================================================================
// Message Queue Types
// ============================================================================

export interface MessageQueueConfig {
  topic?: string;
  queue?: string;
  exchange?: string;
  routingKey?: string;
  consumerGroup?: string;
  partition?: number;
  offset?: 'earliest' | 'latest' | number;
  maxMessages?: number;
  timeout?: number;
}

export interface Message {
  id: string;
  key?: string;
  value: any;
  headers?: Record<string, string>;
  timestamp: Date;
  partition?: number;
  offset?: number;
}

// ============================================================================
// File Format Types
// ============================================================================

export interface CSVConfig {
  delimiter?: string;
  quote?: string;
  escape?: string;
  header?: boolean;
  skipRows?: number;
  encoding?: string;
  nullValue?: string;
}

export interface JSONConfig {
  jsonPath?: string;
  multiline?: boolean;
  encoding?: string;
}

export interface XMLConfig {
  rootElement?: string;
  rowElement?: string;
  attributePrefix?: string;
  encoding?: string;
}

export interface ParquetConfig {
  compression?: 'none' | 'snappy' | 'gzip' | 'lzo' | 'brotli' | 'lz4' | 'zstd';
  rowGroupSize?: number;
  pageSize?: number;
}

// ============================================================================
// SaaS Application Types
// ============================================================================

export interface SalesforceConfig extends ConnectionConfig {
  instanceUrl: string;
  accessToken: string;
  refreshToken?: string;
  apiVersion?: string;
  sandbox?: boolean;
}

export interface HubSpotConfig extends ConnectionConfig {
  apiKey: string;
  portalId?: string;
}

export interface JiraConfig extends ConnectionConfig {
  host: string;
  email: string;
  apiToken: string;
  cloudId?: string;
}

// ============================================================================
// Custom Connector Types
// ============================================================================

export interface CustomConnectorConfig {
  type: 'custom';
  implementation: string; // Path to implementation
  config: Record<string, any>;
}
