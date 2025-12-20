// @ts-nocheck
/**
 * Ingest Adapter Types
 *
 * Core type definitions for the ingest/ETL pipeline with backpressure,
 * replay, and idempotency support.
 */

import { z } from 'zod';

// ============================================================================
// Ingest Source Types
// ============================================================================

export type SourceType = 's3' | 'gcs' | 'azure_blob' | 'kafka' | 'webhook' | 'sftp' | 'api' | 'file';
export type DataFormat = 'jsonl' | 'json' | 'csv' | 'parquet' | 'avro' | 'xml' | 'binary';
export type Classification = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';

// ============================================================================
// Ingest Envelope Schema (matches input.schema.json)
// ============================================================================

export const IngestMetadataSchema = z.object({
  source: z.string().min(1).max(2048),
  source_type: z.enum(['s3', 'gcs', 'azure_blob', 'kafka', 'webhook', 'sftp', 'api', 'file']),
  format: z.enum(['jsonl', 'json', 'csv', 'parquet', 'avro', 'xml', 'binary']),
  batch_id: z.string().nullable().optional(),
  batch_sequence: z.number().int().min(0).nullable().optional(),
  batch_size: z.number().int().min(1).nullable().optional(),
  file_path: z.string().nullable().optional(),
  file_checksum: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  byte_offset: z.number().int().min(0).nullable().optional(),
  partition: z.number().int().min(0).nullable().optional(),
  offset: z.number().int().min(0).nullable().optional(),
});

export const EntitySchema = z.object({
  type: z.string().min(1).max(255),
  id: z.string().min(1).max(1024),
  external_id: z.string().nullable().optional(),
});

export const RevisionSchema = z.object({
  number: z.number().int().min(1),
  timestamp: z.string().datetime(),
  previous_hash: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
});

export const RecordMetadataSchema = z.object({
  priority: z.number().int().min(0).max(100).default(50),
  ttl_seconds: z.number().int().min(1).nullable().optional(),
  legal_hold: z.boolean().default(false),
  classification: z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']).nullable().optional(),
  retention_days: z.number().int().min(1).nullable().optional(),
  tags: z.array(z.string().max(255)).max(50).optional(),
});

export const IngestEnvelopeSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.string().regex(/^ingest\.[a-z0-9_.]+\.v[0-9]+$/),
  event_version: z.string().regex(/^v[0-9]+$/),
  occurred_at: z.string().datetime(),
  recorded_at: z.string().datetime(),
  tenant_id: z.string().min(1).max(255),
  subject_id: z.string().nullable().optional(),
  source_service: z.string(),
  trace_id: z.string().regex(/^[a-f0-9]{32}$/).nullable().optional(),
  span_id: z.string().regex(/^[a-f0-9]{16}$/).nullable().optional(),
  correlation_id: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  ingest: IngestMetadataSchema,
  entity: EntitySchema,
  revision: RevisionSchema,
  dedupe_key: z.string().regex(/^[a-f0-9]{64}$/),
  schema_version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  data: z.record(z.unknown()),
  metadata: RecordMetadataSchema.optional(),
});

export type IngestEnvelope = z.infer<typeof IngestEnvelopeSchema>;
export type IngestMetadata = z.infer<typeof IngestMetadataSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Revision = z.infer<typeof RevisionSchema>;
export type RecordMetadata = z.infer<typeof RecordMetadataSchema>;

// ============================================================================
// Adapter Configuration Types
// ============================================================================

export interface BaseAdapterConfig {
  name: string;
  enabled: boolean;
  tenant_id: string;
  source_type: SourceType;
  polling_interval_ms?: number;
  max_batch_size?: number;
  backpressure?: BackpressureConfig;
  retry?: RetryConfig;
}

export interface S3AdapterConfig extends BaseAdapterConfig {
  source_type: 's3';
  bucket: string;
  prefix?: string;
  region: string;
  endpoint?: string;
  delete_after_process?: boolean;
  file_pattern?: string;
}

export interface GCSAdapterConfig extends BaseAdapterConfig {
  source_type: 'gcs';
  bucket: string;
  prefix?: string;
  project_id: string;
  delete_after_process?: boolean;
  file_pattern?: string;
}

export interface KafkaAdapterConfig extends BaseAdapterConfig {
  source_type: 'kafka';
  brokers: string[];
  topic: string;
  group_id: string;
  from_beginning?: boolean;
  session_timeout_ms?: number;
  heartbeat_interval_ms?: number;
  max_bytes_per_partition?: number;
}

export interface WebhookAdapterConfig extends BaseAdapterConfig {
  source_type: 'webhook';
  path: string;
  method?: 'POST' | 'PUT';
  validate_signature?: boolean;
  signature_header?: string;
  max_body_size?: number;
}

export interface SFTPAdapterConfig extends BaseAdapterConfig {
  source_type: 'sftp';
  host: string;
  port?: number;
  username: string;
  remote_path: string;
  file_pattern?: string;
  delete_after_process?: boolean;
  archive_path?: string;
}

export type AdapterConfig =
  | S3AdapterConfig
  | GCSAdapterConfig
  | KafkaAdapterConfig
  | WebhookAdapterConfig
  | SFTPAdapterConfig;

// ============================================================================
// Backpressure Configuration
// ============================================================================

export interface BackpressureConfig {
  /** Maximum concurrent operations */
  max_concurrency: number;
  /** Rate limit (records per second) */
  rate_limit_rps?: number;
  /** Token bucket capacity */
  token_bucket_capacity?: number;
  /** Token refill rate per second */
  token_refill_rate?: number;
  /** Queue high water mark - trigger backpressure */
  high_water_mark?: number;
  /** Queue low water mark - release backpressure */
  low_water_mark?: number;
  /** Enable drain mode (finish in-flight, stop pulling) */
  drain_mode?: boolean;
  /** Enable brownout (sample/drop non-critical streams) */
  brownout_enabled?: boolean;
  /** Brownout sample rate (0-1) */
  brownout_sample_rate?: number;
}

export interface RetryConfig {
  /** Maximum retry attempts */
  max_attempts: number;
  /** Initial delay in ms */
  initial_delay_ms: number;
  /** Maximum delay in ms */
  max_delay_ms: number;
  /** Backoff multiplier */
  backoff_multiplier: number;
  /** Jitter factor (0-1) */
  jitter_factor: number;
}

// ============================================================================
// Backpressure State
// ============================================================================

export type BackpressureState = 'normal' | 'throttled' | 'drain' | 'brownout' | 'paused';

export interface BackpressureMetrics {
  state: BackpressureState;
  concurrency_used: number;
  concurrency_max: number;
  queue_depth: number;
  tokens_available: number;
  records_per_second: number;
  throttle_count: number;
  drop_count: number;
}

// ============================================================================
// DLQ Types
// ============================================================================

export type DLQReasonCode =
  | 'SCHEMA_DRIFT'
  | 'VALIDATION_FAIL'
  | 'OLDER_REVISION'
  | 'SINK_TIMEOUT'
  | 'CONSTRAINT_VIOLATION'
  | 'SERIALIZATION_ERROR'
  | 'CONNECTION_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export interface DLQRecord {
  id: string;
  envelope: IngestEnvelope;
  reason_code: DLQReasonCode;
  error_message: string;
  error_stack?: string;
  retry_count: number;
  first_failed_at: string;
  last_failed_at: string;
  can_redrive: boolean;
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface Checkpoint {
  id: string;
  tenant_id: string;
  source: string;
  source_type: SourceType;
  /** Kafka offset, S3 last processed key, etc. */
  position: string;
  /** Additional position metadata (partition, etc.) */
  position_metadata?: Record<string, unknown>;
  /** Last processed timestamp */
  last_processed_at: string;
  /** Records processed since last checkpoint */
  records_since_checkpoint: number;
  /** Total records processed */
  total_records_processed: number;
  /** Trace ID for correlation */
  trace_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Replay Types
// ============================================================================

export interface ReplayPlan {
  id: string;
  tenant_id: string;
  sources: string[];
  from_timestamp: string;
  to_timestamp: string;
  dry_run: boolean;
  throttle_rps?: number;
  created_by: string;
  created_at: string;
  status: 'pending' | 'approved' | 'running' | 'completed' | 'failed' | 'cancelled';
  approval?: {
    approved_by: string;
    approved_at: string;
    rfa_id?: string;
  };
  execution?: ReplayExecution;
}

export interface ReplayExecution {
  started_at: string;
  completed_at?: string;
  records_processed: number;
  records_skipped: number;
  records_failed: number;
  checkpoints_restored: number;
  error?: string;
}

// ============================================================================
// Adapter Interface
// ============================================================================

export interface IngestAdapter {
  readonly name: string;
  readonly sourceType: SourceType;
  readonly config: AdapterConfig;

  /** Initialize the adapter */
  initialize(): Promise<void>;

  /** Start consuming/polling */
  start(): Promise<void>;

  /** Stop consuming (graceful shutdown) */
  stop(): Promise<void>;

  /** Enable drain mode */
  drain(): Promise<void>;

  /** Get current backpressure state */
  getBackpressureState(): BackpressureMetrics;

  /** Get current checkpoint */
  getCheckpoint(): Promise<Checkpoint | null>;

  /** Set checkpoint (for replay) */
  setCheckpoint(checkpoint: Checkpoint): Promise<void>;

  /** Health check */
  healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }>;
}

// ============================================================================
// Record Handler Types
// ============================================================================

export type RecordHandler = (envelope: IngestEnvelope) => Promise<void>;
export type BatchHandler = (envelopes: IngestEnvelope[]) => Promise<void>;
export type ErrorHandler = (error: Error, envelope?: IngestEnvelope) => Promise<void>;

export interface AdapterEvents {
  onRecord?: RecordHandler;
  onBatch?: BatchHandler;
  onError?: ErrorHandler;
  onBackpressure?: (metrics: BackpressureMetrics) => void;
  onCheckpoint?: (checkpoint: Checkpoint) => void;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface IngestServiceConfig {
  /** Service name for telemetry */
  service_name: string;
  /** Port to listen on */
  port: number;
  /** Enable health endpoints */
  health_enabled: boolean;
  /** Enable metrics endpoint */
  metrics_enabled: boolean;
  /** Redis connection for state/idempotency */
  redis_url: string;
  /** Kafka brokers for output */
  kafka_brokers: string[];
  /** Output topic for processed records */
  output_topic: string;
  /** DLQ topic for failed records */
  dlq_topic: string;
  /** Adapters to enable */
  adapters: AdapterConfig[];
  /** Global backpressure settings */
  backpressure: BackpressureConfig;
  /** Global retry settings */
  retry: RetryConfig;
}
