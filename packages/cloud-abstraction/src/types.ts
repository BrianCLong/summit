/**
 * Common types and interfaces for cloud abstraction
 */

import { z } from 'zod';

// Cloud provider enum
export enum CloudProvider {
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp'
}

// Configuration schemas
export const CloudConfigSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  region: z.string(),
  credentials: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    accountName: z.string().optional(),
    accountKey: z.string().optional(),
    projectId: z.string().optional(),
    keyFilename: z.string().optional()
  }).optional()
});

export type CloudConfig = z.infer<typeof CloudConfigSchema>;

// Storage types
export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  encryption?: boolean;
  storageClass?: string;
}

export interface StorageDownloadOptions {
  range?: {
    start: number;
    end: number;
  };
}

export interface StorageListOptions {
  prefix?: string;
  maxResults?: number;
  continuationToken?: string;
}

export interface StorageListResult {
  objects: StorageObject[];
  continuationToken?: string;
  isTruncated: boolean;
}

// Database types
export interface DatabaseItem {
  [key: string]: any;
}

export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  continuationToken?: string;
}

export interface DatabaseQueryResult<T = DatabaseItem> {
  items: T[];
  continuationToken?: string;
  count: number;
}

export interface DatabaseWriteOptions {
  upsert?: boolean;
  transaction?: boolean;
}

// Messaging types
export interface Message {
  id: string;
  body: string;
  attributes?: Record<string, string>;
  timestamp: Date;
  receiptHandle?: string;
}

export interface MessagePublishOptions {
  attributes?: Record<string, string>;
  delay?: number;
  deduplicationId?: string;
  groupId?: string;
}

export interface MessageReceiveOptions {
  maxMessages?: number;
  visibilityTimeout?: number;
  waitTimeSeconds?: number;
}

// Secrets types
export interface Secret {
  name: string;
  value: string;
  version?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: Record<string, string>;
}

export interface SecretCreateOptions {
  description?: string;
  tags?: Record<string, string>;
  kmsKeyId?: string;
}

export interface SecretUpdateOptions {
  description?: string;
  tags?: Record<string, string>;
}

// Error types
export class CloudAbstractionError extends Error {
  constructor(
    message: string,
    public provider: CloudProvider,
    public operation: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CloudAbstractionError';
  }
}

export class StorageError extends CloudAbstractionError {
  constructor(message: string, provider: CloudProvider, originalError?: Error) {
    super(message, provider, 'storage', originalError);
    this.name = 'StorageError';
  }
}

export class DatabaseError extends CloudAbstractionError {
  constructor(message: string, provider: CloudProvider, originalError?: Error) {
    super(message, provider, 'database', originalError);
    this.name = 'DatabaseError';
  }
}

export class MessagingError extends CloudAbstractionError {
  constructor(message: string, provider: CloudProvider, originalError?: Error) {
    super(message, provider, 'messaging', originalError);
    this.name = 'MessagingError';
  }
}

export class SecretsError extends CloudAbstractionError {
  constructor(message: string, provider: CloudProvider, originalError?: Error) {
    super(message, provider, 'secrets', originalError);
    this.name = 'SecretsError';
  }
}
