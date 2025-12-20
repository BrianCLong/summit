
import { Readable } from 'stream';

export interface ConnectorConfig {
  id: string;
  name: string;
  type: string;
  tenantId: string;
  config: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ConnectorSchema {
  fields: SchemaField[];
  metadata?: Record<string, any>;
  version: number;
}

export interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  piiCategory?: string;
}

export interface ConnectorMetrics {
  recordsProcessed: number;
  bytesProcessed: number;
  errors: number;
  latency: number;
}

export interface IngestionEvent {
  id: string;
  sourceId: string;
  timestamp: Date;
  data: any;
  metadata: Record<string, any>;
  provenance: {
    source: string;
    sourceId: string;
    ingestTimestamp: Date;
    connectorType: string;
    lineageId: string;
  };
}

export interface ConnectorHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  error?: string;
  timestamp: Date;
}

export enum OsintSourceType {
  SOCIAL = 'social',
  WEB = 'web',
  DARKNET = 'darknet',
}

export interface OsintSourceConfig extends ConnectorConfig {
  sourceType: OsintSourceType;
  rateLimit?: number; // requests per second
  credentials?: Record<string, string>;
}

export interface OsintRecord {
  id: string;
  content: string;
  author?: string;
  timestamp: Date;
  url?: string;
  metadata: Record<string, any>;
  sourceType: OsintSourceType;
  platform?: string; // e.g., Twitter, Reddit, Tor
}
