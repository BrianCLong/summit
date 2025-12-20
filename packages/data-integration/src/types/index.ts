/**
 * Core types for data integration framework
 */

export enum SourceType {
  DATABASE = 'database',
  REST_API = 'rest_api',
  CLOUD_STORAGE = 'cloud_storage',
  SAAS = 'saas',
  SOCIAL_MEDIA = 'social_media',
  FINANCIAL_FEED = 'financial_feed',
  THREAT_INTEL = 'threat_intel',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  STREAM = 'stream',
  CUSTOM = 'custom'
}

export enum ExtractionStrategy {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  CDC = 'cdc', // Change Data Capture
  SCHEDULED = 'scheduled',
  REAL_TIME = 'real_time',
  QUERY_BASED = 'query_based',
  LOG_PARSING = 'log_parsing',
  WEB_SCRAPING = 'web_scraping'
}

export enum LoadStrategy {
  BULK = 'bulk',
  UPSERT = 'upsert',
  SCD_TYPE1 = 'scd_type1',
  SCD_TYPE2 = 'scd_type2',
  SCD_TYPE3 = 'scd_type3',
  APPEND_ONLY = 'append_only',
  DELTA = 'delta',
  PARTITIONED = 'partitioned'
}

export interface DataSourceConfig {
  id: string;
  name: string;
  type: SourceType;
  connectionConfig: ConnectionConfig;
  extractionConfig: ExtractionConfig;
  transformationConfig?: TransformationConfig;
  loadConfig: LoadConfig;
  scheduleConfig?: ScheduleConfig;
  metadata: Record<string, any>;
}

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  oauth?: OAuthConfig;
  sslConfig?: SSLConfig;
  connectionPoolConfig?: ConnectionPoolConfig;
  timeout?: number;
  retryConfig?: RetryConfig;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope?: string[];
  refreshToken?: string;
}

export interface SSLConfig {
  enabled: boolean;
  ca?: string;
  cert?: string;
  key?: string;
  rejectUnauthorized?: boolean;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface ExtractionConfig {
  strategy: ExtractionStrategy;
  query?: string;
  incrementalColumn?: string;
  lastExtractedValue?: any;
  batchSize?: number;
  paginationConfig?: PaginationConfig;
  rateLimitConfig?: RateLimitConfig;
  filterConfig?: FilterConfig;
}

export interface PaginationConfig {
  type: 'offset' | 'cursor' | 'page';
  pageSize: number;
  maxPages?: number;
  cursorField?: string;
}

export interface RateLimitConfig {
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  burstSize?: number;
}

export interface FilterConfig {
  whereClause?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  customFilters?: Record<string, any>;
}

export interface TransformationConfig {
  type: 'sql' | 'python' | 'spark' | 'custom';
  transformations: Transformation[];
  validations?: ValidationRule[];
  enrichments?: EnrichmentRule[];
}

export interface Transformation {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  order: number;
}

export interface ValidationRule {
  id: string;
  name: string;
  type: 'schema' | 'type' | 'null' | 'duplicate' | 'range' | 'format' | 'referential' | 'custom';
  config: Record<string, any>;
  severity: 'error' | 'warning' | 'info';
  action: 'fail' | 'warn' | 'skip' | 'quarantine';
}

export interface EnrichmentRule {
  id: string;
  name: string;
  type: 'geolocation' | 'ip_enrichment' | 'entity_resolution' | 'lookup' | 'api' | 'ml' | 'custom';
  config: Record<string, any>;
  targetFields: string[];
}

export interface LoadConfig {
  strategy: LoadStrategy;
  targetTable: string;
  targetDatabase?: string;
  targetSchema?: string;
  partitionKey?: string;
  clusterKey?: string[];
  upsertKey?: string[];
  timestampColumn?: string;
  batchSize?: number;
  parallelism?: number;
  errorHandling?: ErrorHandlingConfig;
}

export interface ErrorHandlingConfig {
  onError: 'fail' | 'skip' | 'retry' | 'deadletter';
  maxErrors?: number;
  deadLetterQueue?: string;
  errorLogTable?: string;
}

export interface ScheduleConfig {
  type: 'cron' | 'interval' | 'event';
  cronExpression?: string;
  intervalSeconds?: number;
  eventTrigger?: string;
  enabled: boolean;
  timezone?: string;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  sourceId: string;
  status: PipelineStatus;
  startTime: Date;
  endTime?: Date;
  recordsExtracted: number;
  recordsTransformed: number;
  recordsLoaded: number;
  recordsFailed: number;
  bytesProcessed: number;
  errors: PipelineError[];
  metrics: PipelineMetrics;
  lineage: LineageInfo[];
}

export enum PipelineStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL_SUCCESS = 'partial_success',
  CANCELLED = 'cancelled'
}

export interface PipelineError {
  timestamp: Date;
  stage: 'extraction' | 'transformation' | 'validation' | 'enrichment' | 'loading';
  message: string;
  details?: any;
  recordId?: string;
}

export interface PipelineMetrics {
  extractionDurationMs: number;
  transformationDurationMs: number;
  validationDurationMs: number;
  enrichmentDurationMs: number;
  loadingDurationMs: number;
  totalDurationMs: number;
  throughputRecordsPerSecond: number;
  throughputMbPerSecond: number;
  cpuUtilization?: number;
  memoryUtilization?: number;
}

export interface LineageInfo {
  sourceEntity: string;
  targetEntity: string;
  transformations: string[];
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface DataQualityReport {
  pipelineRunId: string;
  timestamp: Date;
  overallScore: number;
  dimensions: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    validity: number;
    uniqueness: number;
  };
  issues: DataQualityIssue[];
  statistics: DataStatistics;
}

export interface DataQualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  field?: string;
  message: string;
  affectedRecords: number;
  examples?: any[];
}

export interface DataStatistics {
  totalRecords: number;
  nullCounts: Record<string, number>;
  distinctCounts: Record<string, number>;
  minValues: Record<string, any>;
  maxValues: Record<string, any>;
  averages: Record<string, number>;
  standardDeviations: Record<string, number>;
}

export interface ConnectorPlugin {
  id: string;
  name: string;
  version: string;
  type: SourceType;
  description: string;
  configSchema: any;
  supportedExtractionStrategies: ExtractionStrategy[];
  supportedLoadStrategies: LoadStrategy[];
  capabilities: ConnectorCapabilities;
}

export interface ConnectorCapabilities {
  supportsStreaming: boolean;
  supportsIncremental: boolean;
  supportsCDC: boolean;
  supportsSchema: boolean;
  supportsPartitioning: boolean;
  maxConcurrentConnections: number;
}
