/**
 * Core types for data integration framework
 */

import { z } from 'zod';

// ============================================================================
// Data Source Types
// ============================================================================

export enum DataSourceType {
  // Databases
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MONGODB = 'mongodb',
  CASSANDRA = 'cassandra',
  REDIS = 'redis',
  NEO4J = 'neo4j',

  // Cloud Storage
  S3 = 's3',
  AZURE_BLOB = 'azure_blob',
  GCS = 'gcs',

  // Message Queues
  KAFKA = 'kafka',
  RABBITMQ = 'rabbitmq',
  SQS = 'sqs',
  PUBSUB = 'pubsub',

  // APIs & Web Services
  REST_API = 'rest_api',
  GRAPHQL = 'graphql',
  SOAP = 'soap',
  WEBHOOK = 'webhook',

  // Files
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  PARQUET = 'parquet',
  AVRO = 'avro',

  // SaaS Applications
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  JIRA = 'jira',
  SLACK = 'slack',

  // Custom
  CUSTOM = 'custom',
}

export const ConnectionConfigSchema = z.object({
  type: z.nativeEnum(DataSourceType),
  name: z.string(),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  ssl: z.boolean().optional(),
  connectionString: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  region: z.string().optional(),
  bucket: z.string().optional(),
  path: z.string().optional(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  timeout: z.number().optional(),
  retryAttempts: z.number().optional(),
  poolSize: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

// ============================================================================
// Pipeline Types
// ============================================================================

export enum PipelineMode {
  ETL = 'etl',       // Extract, Transform, Load
  ELT = 'elt',       // Extract, Load, Transform
  STREAMING = 'streaming',
  BATCH = 'batch',
  MICRO_BATCH = 'micro_batch',
}

export enum PipelineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum ExecutionMode {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
  EVENT_DRIVEN = 'event_driven',
  MANUAL = 'manual',
}

// ============================================================================
// Transformation Types
// ============================================================================

export enum TransformationType {
  MAP = 'map',
  FILTER = 'filter',
  AGGREGATE = 'aggregate',
  JOIN = 'join',
  MERGE = 'merge',
  SPLIT = 'split',
  UNION = 'union',
  LOOKUP = 'lookup',
  ENRICH = 'enrich',
  VALIDATE = 'validate',
  CONVERT = 'convert',
  SQL = 'sql',
  CUSTOM = 'custom',
  UDF = 'udf',
}

export interface TransformationConfig {
  id: string;
  type: TransformationType;
  name: string;
  description?: string;
  config: Record<string, any>;
  errorHandling?: ErrorHandlingConfig;
  validation?: ValidationConfig;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export enum ErrorStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  FAIL = 'fail',
  DEAD_LETTER = 'dead_letter',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
}

export interface ErrorHandlingConfig {
  strategy: ErrorStrategy;
  retryAttempts?: number;
  retryDelay?: number;
  retryBackoff?: 'linear' | 'exponential';
  maxRetryDelay?: number;
  deadLetterQueue?: string;
  fallbackValue?: any;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  onError?: (error: Error, context: any) => void | Promise<void>;
}

// ============================================================================
// Validation Types
// ============================================================================

export enum ValidationType {
  SCHEMA = 'schema',
  BUSINESS_RULE = 'business_rule',
  DATA_QUALITY = 'data_quality',
  COMPLETENESS = 'completeness',
  UNIQUENESS = 'uniqueness',
  CONSISTENCY = 'consistency',
  ACCURACY = 'accuracy',
  CUSTOM = 'custom',
}

export interface ValidationConfig {
  type: ValidationType;
  rules: ValidationRule[];
  onValidationFailure?: 'reject' | 'flag' | 'correct';
  collectMetrics?: boolean;
}

export interface ValidationRule {
  id: string;
  name: string;
  description?: string;
  condition: string | ((data: any) => boolean);
  severity: 'error' | 'warning' | 'info';
  message?: string;
}

// ============================================================================
// CDC (Change Data Capture) Types
// ============================================================================

export enum CDCMode {
  LOG_BASED = 'log_based',
  TIMESTAMP_BASED = 'timestamp_based',
  TRIGGER_BASED = 'trigger_based',
  DELTA_DETECTION = 'delta_detection',
  QUERY_BASED = 'query_based',
}

export enum ChangeType {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  UPSERT = 'upsert',
}

export interface CDCConfig {
  mode: CDCMode;
  source: ConnectionConfig;
  tables?: string[];
  incrementalColumn?: string;
  watermark?: string | Date;
  batchSize?: number;
  pollInterval?: number;
  includeDeletes?: boolean;
  captureOldValues?: boolean;
}

export interface ChangeRecord {
  type: ChangeType;
  table: string;
  schema?: string;
  key: Record<string, any>;
  before?: Record<string, any>;
  after?: Record<string, any>;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// Performance & Optimization Types
// ============================================================================

export interface PerformanceConfig {
  parallelism?: number;
  batchSize?: number;
  prefetchSize?: number;
  connectionPoolSize?: number;
  cacheEnabled?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
  compressionEnabled?: boolean;
  compressionType?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
  partitioningEnabled?: boolean;
  partitionKey?: string;
  maxMemoryMB?: number;
  diskSpillEnabled?: boolean;
}

// ============================================================================
// Monitoring & Observability Types
// ============================================================================

export interface PipelineMetrics {
  pipelineId: string;
  executionId: string;
  status: PipelineStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  recordsSkipped: number;
  bytesProcessed: number;
  throughput?: number; // records per second
  errorRate?: number;
  qualityScore?: number;
  cost?: number;
  metadata?: Record<string, any>;
}

export interface PipelineEvent {
  type: 'started' | 'completed' | 'failed' | 'paused' | 'resumed' | 'progress';
  pipelineId: string;
  executionId: string;
  timestamp: Date;
  data?: any;
  error?: Error;
}

// ============================================================================
// Workflow & Scheduling Types
// ============================================================================

export interface ScheduleConfig {
  type: 'cron' | 'interval' | 'once';
  expression?: string; // Cron expression
  interval?: number; // Milliseconds
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  enabled?: boolean;
}

export interface DAGNode {
  id: string;
  type: 'extract' | 'transform' | 'load' | 'validate' | 'custom';
  name: string;
  config: Record<string, any>;
  dependencies?: string[];
  condition?: string | ((context: any) => boolean);
  timeout?: number;
  retryConfig?: ErrorHandlingConfig;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: DAGNode[];
  schedule?: ScheduleConfig;
  triggers?: TriggerConfig[];
  parameters?: Record<string, any>;
  timeout?: number;
  concurrency?: number;
}

export interface TriggerConfig {
  type: 'webhook' | 'file' | 'message' | 'schedule' | 'manual';
  config: Record<string, any>;
  condition?: string | ((event: any) => boolean);
}

// ============================================================================
// Data Quality Types
// ============================================================================

export interface DataQualityRule {
  id: string;
  name: string;
  dimension: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity' | 'uniqueness';
  threshold?: number;
  critical?: boolean;
  enabled?: boolean;
  expression: string | ((data: any) => boolean | number);
}

export interface DataQualityReport {
  pipelineId: string;
  executionId: string;
  timestamp: Date;
  overallScore: number;
  dimensionScores: Record<string, number>;
  ruleResults: DataQualityRuleResult[];
  violations: DataQualityViolation[];
}

export interface DataQualityRuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  score: number;
  threshold?: number;
  recordsEvaluated: number;
  recordsPassed: number;
  recordsFailed: number;
}

export interface DataQualityViolation {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  record?: any;
  timestamp: Date;
}

// ============================================================================
// Integration Platform Types
// ============================================================================

export interface IntegrationConfig {
  id: string;
  name: string;
  description?: string;
  mode: PipelineMode;
  source: ConnectionConfig;
  target: ConnectionConfig;
  transformations?: TransformationConfig[];
  validation?: ValidationConfig;
  errorHandling?: ErrorHandlingConfig;
  performance?: PerformanceConfig;
  schedule?: ScheduleConfig;
  cdc?: CDCConfig;
  dataQuality?: DataQualityRule[];
  metadata?: Record<string, any>;
  tags?: string[];
  enabled?: boolean;
}

export interface PipelineContext {
  pipelineId: string;
  executionId: string;
  startTime: Date;
  parameters?: Record<string, any>;
  state?: Record<string, any>;
  metrics?: Partial<PipelineMetrics>;
  logger?: any;
}

// ============================================================================
// Lineage & Metadata Types
// ============================================================================

export interface LineageNode {
  id: string;
  type: 'source' | 'transformation' | 'target';
  name: string;
  schema?: any;
  metadata?: Record<string, any>;
}

export interface LineageEdge {
  from: string;
  to: string;
  transformationType?: string;
  impactLevel?: 'direct' | 'indirect';
}

export interface DataLineage {
  pipelineId: string;
  executionId: string;
  nodes: LineageNode[];
  edges: LineageEdge[];
  timestamp: Date;
}

// ============================================================================
// Exports
// ============================================================================

export * from './connector.types';
export * from './pipeline.types';
