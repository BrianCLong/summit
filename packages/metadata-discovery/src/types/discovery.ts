/**
 * Metadata Discovery Types
 */

/**
 * Data Source Configuration
 */
export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  connectionString: string;
  credentials: SourceCredentials;
  options: Record<string, any>;
}

/**
 * Data Source Types
 */
export enum DataSourceType {
  POSTGRESQL = 'POSTGRESQL',
  MYSQL = 'MYSQL',
  MONGODB = 'MONGODB',
  NEO4J = 'NEO4J',
  S3 = 'S3',
  HDFS = 'HDFS',
  API = 'API',
  FILE_SYSTEM = 'FILE_SYSTEM',
  SNOWFLAKE = 'SNOWFLAKE',
  BIGQUERY = 'BIGQUERY',
  REDSHIFT = 'REDSHIFT',
}

/**
 * Source Credentials
 */
export interface SourceCredentials {
  username?: string;
  password?: string;
  apiKey?: string;
  token?: string;
  certificatePath?: string;
  secretArn?: string;
}

/**
 * Discovery Job Configuration
 */
export interface DiscoveryJobConfig {
  id: string;
  name: string;
  sourceId: string;
  schedule: string;
  enabled: boolean;
  options: DiscoveryOptions;
  lastRun: Date | null;
  nextRun: Date | null;
}

/**
 * Discovery Options
 */
export interface DiscoveryOptions {
  extractSchema: boolean;
  profileData: boolean;
  collectSamples: boolean;
  inferRelationships: boolean;
  analyzeUsage: boolean;
  maxSampleRows: number;
  excludePatterns: string[];
  includePatterns: string[];
}

/**
 * Discovery Job Execution
 */
export interface DiscoveryJobExecution {
  id: string;
  jobId: string;
  status: JobStatus;
  startedAt: Date;
  completedAt: Date | null;
  assetsDiscovered: number;
  errors: DiscoveryError[];
  metadata: Record<string, any>;
}

/**
 * Job Status
 */
export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Discovery Error
 */
export interface DiscoveryError {
  code: string;
  message: string;
  source: string;
  timestamp: Date;
  severity: ErrorSeverity;
}

/**
 * Error Severity
 */
export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Extraction Result
 */
export interface ExtractionResult {
  sourceId: string;
  assets: DiscoveredAsset[];
  relationships: DiscoveredRelationship[];
  statistics: ExtractionStatistics;
}

/**
 * Discovered Asset
 */
export interface DiscoveredAsset {
  name: string;
  type: string;
  schema: any;
  properties: Record<string, any>;
  statistics: Record<string, any>;
  sampleData: any[];
}

/**
 * Discovered Relationship
 */
export interface DiscoveredRelationship {
  fromAsset: string;
  toAsset: string;
  type: string;
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Extraction Statistics
 */
export interface ExtractionStatistics {
  totalAssets: number;
  assetsWithSchema: number;
  assetsWithSamples: number;
  relationshipsInferred: number;
  processingTimeMs: number;
}

/**
 * Profiling Result
 */
export interface ProfilingResult {
  assetId: string;
  columnProfiles: ColumnProfile[];
  dataQualityMetrics: DataQualityMetrics;
  patterns: DataPattern[];
}

/**
 * Column Profile
 */
export interface ColumnProfile {
  columnName: string;
  dataType: string;
  nullable: boolean;
  uniqueCount: number;
  nullCount: number;
  distinctCount: number;
  minValue: any;
  maxValue: any;
  averageValue: any;
  standardDeviation: number | null;
  topValues: ValueFrequency[];
  patterns: string[];
}

/**
 * Value Frequency
 */
export interface ValueFrequency {
  value: any;
  count: number;
  percentage: number;
}

/**
 * Data Quality Metrics
 */
export interface DataQualityMetrics {
  completeness: number;
  uniqueness: number;
  validity: number;
  consistency: number;
  accuracy: number;
  timeliness: number;
}

/**
 * Data Pattern
 */
export interface DataPattern {
  type: PatternType;
  pattern: string;
  confidence: number;
  examples: any[];
}

/**
 * Pattern Types
 */
export enum PatternType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  IP_ADDRESS = 'IP_ADDRESS',
  DATE = 'DATE',
  CURRENCY = 'CURRENCY',
  SSN = 'SSN',
  CREDIT_CARD = 'CREDIT_CARD',
  CUSTOM = 'CUSTOM',
}
