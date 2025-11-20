import { z } from 'zod';

/**
 * ETL Pipeline Configuration and Metadata Types
 */

// Connector Types
export const ConnectorType = z.enum([
  'REST_API',
  'RSS_FEED',
  'CSV_FILE',
  'JSON_FILE',
  'XML_FILE',
  'WEB_SCRAPER',
  'EMAIL_IMAP',
  'TWITTER',
  'LINKEDIN',
  'REDDIT',
  'NEWS_API',
  'GDELT',
  'WHOIS',
  'DNS',
  'MISP',
  'STIX_TAXII',
  'KAFKA',
  'DATABASE',
  'S3',
  'CUSTOM'
]);

export type ConnectorType = z.infer<typeof ConnectorType>;

// Authentication Configuration
export const AuthConfig = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('none')
  }),
  z.object({
    type: z.literal('api_key'),
    apiKey: z.string(),
    headerName: z.string().default('X-API-Key')
  }),
  z.object({
    type: z.literal('bearer'),
    token: z.string()
  }),
  z.object({
    type: z.literal('oauth2'),
    clientId: z.string(),
    clientSecret: z.string(),
    tokenUrl: z.string(),
    scopes: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal('basic'),
    username: z.string(),
    password: z.string()
  })
]);

export type AuthConfig = z.infer<typeof AuthConfig>;

// Rate Limiting Configuration
export const RateLimitConfig = z.object({
  maxRequests: z.number().positive(),
  windowMs: z.number().positive(),
  minTime: z.number().nonnegative().optional()
});

export type RateLimitConfig = z.infer<typeof RateLimitConfig>;

// Connector Configuration
export const ConnectorConfig = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: ConnectorType,
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  auth: AuthConfig,
  rateLimit: RateLimitConfig.optional(),
  config: z.record(z.unknown()), // Connector-specific configuration
  schedule: z.string().optional(), // Cron expression for scheduled runs
  tenantId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type ConnectorConfig = z.infer<typeof ConnectorConfig>;

// Data Quality Dimensions
export const DataQualityDimension = z.enum([
  'COMPLETENESS',
  'ACCURACY',
  'CONSISTENCY',
  'TIMELINESS',
  'VALIDITY',
  'UNIQUENESS',
  'CREDIBILITY'
]);

export type DataQualityDimension = z.infer<typeof DataQualityDimension>;

// Data Quality Rule
export const DataQualityRule = z.object({
  id: z.string().uuid(),
  name: z.string(),
  dimension: DataQualityDimension,
  field: z.string().optional(),
  expression: z.string(), // Validation expression
  severity: z.enum(['ERROR', 'WARNING', 'INFO']),
  enabled: z.boolean().default(true)
});

export type DataQualityRule = z.infer<typeof DataQualityRule>;

// Data Quality Score
export const DataQualityScore = z.object({
  dimension: DataQualityDimension,
  score: z.number().min(0).max(100),
  violations: z.number().nonnegative(),
  details: z.string().optional()
});

export type DataQualityScore = z.infer<typeof DataQualityScore>;

// Data Quality Assessment
export const DataQualityAssessment = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  overallScore: z.number().min(0).max(100),
  scores: z.array(DataQualityScore),
  totalRecords: z.number().nonnegative(),
  validRecords: z.number().nonnegative(),
  invalidRecords: z.number().nonnegative(),
  assessedAt: z.date()
});

export type DataQualityAssessment = z.infer<typeof DataQualityAssessment>;

// Transformation Type
export const TransformationType = z.enum([
  'MAP',
  'FILTER',
  'ENRICH',
  'EXTRACT_ENTITY',
  'INFER_RELATIONSHIP',
  'DEDUPLICATE',
  'NORMALIZE_TEMPORAL',
  'NORMALIZE_SCHEMA',
  'AGGREGATE',
  'CUSTOM'
]);

export type TransformationType = z.infer<typeof TransformationType>;

// Transformation Configuration
export const TransformationConfig = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: TransformationType,
  order: z.number().nonnegative(),
  config: z.record(z.unknown()),
  enabled: z.boolean().default(true)
});

export type TransformationConfig = z.infer<typeof TransformationConfig>;

// Pipeline Status
export const PipelineStatus = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'FAILED',
  'ARCHIVED'
]);

export type PipelineStatus = z.infer<typeof PipelineStatus>;

// Pipeline Configuration
export const PipelineConfig = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  connectorId: z.string().uuid(),
  transformations: z.array(TransformationConfig),
  dataQualityRules: z.array(DataQualityRule),
  destination: z.object({
    type: z.enum(['POSTGRES', 'NEO4J', 'KAFKA', 'S3', 'API']),
    config: z.record(z.unknown())
  }),
  status: PipelineStatus,
  tenantId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export type PipelineConfig = z.infer<typeof PipelineConfig>;

// Pipeline Run Status
export const PipelineRunStatus = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'PARTIALLY_SUCCEEDED'
]);

export type PipelineRunStatus = z.infer<typeof PipelineRunStatus>;

// Pipeline Run Metrics
export const PipelineRunMetrics = z.object({
  recordsRead: z.number().nonnegative(),
  recordsProcessed: z.number().nonnegative(),
  recordsWritten: z.number().nonnegative(),
  recordsFailed: z.number().nonnegative(),
  recordsDuplicate: z.number().nonnegative(),
  bytesProcessed: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  throughputRecordsPerSec: z.number().nonnegative().optional(),
  errorRate: z.number().min(0).max(1).optional()
});

export type PipelineRunMetrics = z.infer<typeof PipelineRunMetrics>;

// Pipeline Run
export const PipelineRun = z.object({
  id: z.string().uuid(),
  pipelineId: z.string().uuid(),
  status: PipelineRunStatus,
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  metrics: PipelineRunMetrics,
  dataQualityAssessment: DataQualityAssessment.optional(),
  error: z.string().optional(),
  errorStack: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tenantId: z.string()
});

export type PipelineRun = z.infer<typeof PipelineRun>;

// Data Lineage Node
export const LineageNode = z.object({
  id: z.string().uuid(),
  type: z.enum(['SOURCE', 'TRANSFORMATION', 'DESTINATION']),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type LineageNode = z.infer<typeof LineageNode>;

// Data Lineage Edge
export const LineageEdge = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  transformationType: TransformationType.optional(),
  recordCount: z.number().nonnegative().optional(),
  timestamp: z.date()
});

export type LineageEdge = z.infer<typeof LineageEdge>;

// Data Lineage Graph
export const DataLineage = z.object({
  pipelineRunId: z.string().uuid(),
  nodes: z.array(LineageNode),
  edges: z.array(LineageEdge),
  createdAt: z.date()
});

export type DataLineage = z.infer<typeof DataLineage>;

// Incremental Update Configuration
export const IncrementalConfig = z.object({
  enabled: z.boolean().default(false),
  mode: z.enum(['FULL', 'APPEND', 'UPSERT', 'CDC']),
  keyFields: z.array(z.string()),
  watermarkField: z.string().optional(),
  lastWatermark: z.union([z.string(), z.number(), z.date()]).optional(),
  conflictResolution: z.enum(['SOURCE_WINS', 'TARGET_WINS', 'LATEST_WINS', 'MERGE']).default('LATEST_WINS')
});

export type IncrementalConfig = z.infer<typeof IncrementalConfig>;

// Source Metadata
export const SourceMetadata = z.object({
  name: z.string(),
  url: z.string().url().optional(),
  credibilityScore: z.number().min(0).max(100).optional(),
  lastUpdated: z.date().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export type SourceMetadata = z.infer<typeof SourceMetadata>;

// Extracted Entity
export const ExtractedEntity = z.object({
  id: z.string().uuid(),
  kind: z.enum(['Person', 'Org', 'Location', 'Event', 'Document', 'Indicator', 'Case', 'Claim']),
  name: z.string(),
  attributes: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  sourceSpan: z.object({
    start: z.number(),
    end: z.number(),
    text: z.string()
  }).optional()
});

export type ExtractedEntity = z.infer<typeof ExtractedEntity>;

// Inferred Relationship
export const InferredRelationship = z.object({
  id: z.string().uuid(),
  type: z.string(),
  sourceEntityId: z.string().uuid(),
  targetEntityId: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  attributes: z.record(z.unknown()).optional()
});

export type InferredRelationship = z.infer<typeof InferredRelationship>;

// Data Catalog Entry
export const DataCatalogEntry = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['TABLE', 'VIEW', 'API', 'FILE', 'STREAM']),
  schema: z.array(z.object({
    name: z.string(),
    type: z.string(),
    nullable: z.boolean().default(true),
    description: z.string().optional()
  })),
  source: SourceMetadata,
  tags: z.array(z.string()).optional(),
  classification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).optional(),
  piiFields: z.array(z.string()).optional(),
  ownerTeam: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastAccessedAt: z.date().optional(),
  recordCount: z.number().nonnegative().optional(),
  sizeBytes: z.number().nonnegative().optional()
});

export type DataCatalogEntry = z.infer<typeof DataCatalogEntry>;

// Export Configuration
export const ExportConfig = z.object({
  id: z.string().uuid(),
  name: z.string(),
  format: z.enum(['CSV', 'JSON', 'XML', 'PARQUET', 'AVRO']),
  destination: z.object({
    type: z.enum(['FILE', 'S3', 'KAFKA', 'API']),
    config: z.record(z.unknown())
  }),
  schedule: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  enabled: z.boolean().default(true),
  tenantId: z.string()
});

export type ExportConfig = z.infer<typeof ExportConfig>;
