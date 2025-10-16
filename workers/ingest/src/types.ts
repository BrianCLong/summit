export interface ConnectorConfig {
  name: string;
  type: 's3csv' | 'http';
  url: string;
  schemaRef?: string;
  retention?: string;
  purpose?: string;
  pii?: boolean;
  expected_daily_rows?: number;
  polling_interval?: string;
  region?: string;
  transform_rules?: Record<string, any>;
}

export interface IngestRecord {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, any>;
  pii_flags: Record<string, boolean>;
  source_id: string;
  provenance: ProvenanceMetadata;
  retention_tier: string;
  purpose: string;
  region: string;
}

export interface ProvenanceMetadata {
  source_system: string;
  collection_method: string;
  source_url: string;
  collected_at: string;
  file_hash?: string;
  response_headers?: Record<string, any>;
  [key: string]: any;
}

export interface ProcessingMetrics {
  records_processed: number;
  records_failed: number;
  bytes_processed: number;
  processing_duration_ms: number;
  last_checkpoint?: string;
}

export interface HealthStatus {
  connector_name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  last_check: string;
  error_message?: string;
  metrics?: Record<string, number>;
}

export interface IngestJobConfig {
  connectors: ConnectorConfig[];
  batch_size: number;
  max_concurrent_jobs: number;
  checkpoint_interval: number;
  retry_policy: {
    max_retries: number;
    backoff_multiplier: number;
    max_backoff_seconds: number;
  };
}
