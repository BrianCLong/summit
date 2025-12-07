
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
  };
}

export interface ConnectorHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  error?: string;
  timestamp: Date;
}
