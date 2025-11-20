/**
 * Core types for the Data Catalog system
 * Provides comprehensive type definitions for data assets, metadata, and catalog operations
 */

/**
 * Asset types supported by the catalog
 */
export enum AssetType {
  TABLE = 'TABLE',
  VIEW = 'VIEW',
  COLUMN = 'COLUMN',
  DATABASE = 'DATABASE',
  SCHEMA = 'SCHEMA',
  REPORT = 'REPORT',
  DASHBOARD = 'DASHBOARD',
  API = 'API',
  FILE = 'FILE',
  STREAM = 'STREAM',
  MODEL = 'MODEL',
}

/**
 * Data classification levels for sensitivity
 */
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  HIGHLY_RESTRICTED = 'HIGHLY_RESTRICTED',
}

/**
 * Data quality dimensions
 */
export enum QualityDimension {
  ACCURACY = 'ACCURACY',
  COMPLETENESS = 'COMPLETENESS',
  CONSISTENCY = 'CONSISTENCY',
  TIMELINESS = 'TIMELINESS',
  VALIDITY = 'VALIDITY',
  UNIQUENESS = 'UNIQUENESS',
}

/**
 * Schema field data types
 */
export enum DataFieldType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  FLOAT = 'FLOAT',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  TIMESTAMP = 'TIMESTAMP',
  JSON = 'JSON',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  UUID = 'UUID',
  BINARY = 'BINARY',
}

/**
 * Asset lifecycle status
 */
export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

/**
 * Metadata tag for classification and organization
 */
export interface MetadataTag {
  /** Unique identifier */
  id: string;
  /** Tag key (e.g., 'department', 'domain', 'pii') */
  key: string;
  /** Tag value */
  value: string;
  /** Optional tag description */
  description?: string;
  /** Tag category for grouping */
  category?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** User who created the tag */
  createdBy: string;
}

/**
 * Schema field definition with metadata
 */
export interface SchemaField {
  /** Field name */
  name: string;
  /** Data type */
  dataType: DataFieldType;
  /** Field description */
  description?: string;
  /** Whether field is nullable */
  nullable: boolean;
  /** Whether field is primary key */
  isPrimaryKey?: boolean;
  /** Whether field is foreign key */
  isForeignKey?: boolean;
  /** Reference to foreign key table/field */
  foreignKeyReference?: {
    table: string;
    field: string;
  };
  /** Default value if any */
  defaultValue?: any;
  /** Field constraints */
  constraints?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
    min?: number;
    max?: number;
  };
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Schema definition for a data asset
 */
export interface Schema {
  /** Schema version */
  version: string;
  /** Fields in the schema */
  fields: SchemaField[];
  /** Schema documentation */
  documentation?: string;
  /** Schema evolution history */
  evolutionHistory?: SchemaEvolution[];
}

/**
 * Schema evolution tracking
 */
export interface SchemaEvolution {
  /** Evolution version */
  version: string;
  /** Timestamp of change */
  timestamp: Date;
  /** Type of change */
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED';
  /** Description of changes */
  description: string;
  /** Detailed change log */
  changes: {
    field: string;
    before?: any;
    after?: any;
  }[];
  /** User who made the change */
  changedBy: string;
  /** Whether change is breaking */
  isBreaking: boolean;
}

/**
 * Data quality metrics for an asset
 */
export interface QualityMetrics {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Dimension-specific scores */
  dimensions: {
    [key in QualityDimension]?: number;
  };
  /** Last assessment timestamp */
  lastAssessed: Date;
  /** Number of quality issues */
  issueCount: number;
  /** Quality trends over time */
  trends?: {
    timestamp: Date;
    score: number;
  }[];
}

/**
 * Data lineage information
 */
export interface Lineage {
  /** Upstream data sources */
  upstream: {
    assetId: string;
    assetName: string;
    assetType: AssetType;
    transformationType?: string;
  }[];
  /** Downstream consumers */
  downstream: {
    assetId: string;
    assetName: string;
    assetType: AssetType;
    transformationType?: string;
  }[];
  /** Lineage graph depth */
  depth: number;
}

/**
 * Usage statistics for a data asset
 */
export interface UsageStatistics {
  /** Total query count */
  queryCount: number;
  /** Unique users */
  uniqueUsers: number;
  /** Last accessed timestamp */
  lastAccessed: Date;
  /** Average daily queries */
  avgDailyQueries: number;
  /** Top users */
  topUsers: {
    userId: string;
    userName: string;
    queryCount: number;
  }[];
  /** Query patterns */
  queryPatterns?: {
    hour: number;
    count: number;
  }[];
}

/**
 * Business glossary term
 */
export interface BusinessTerm {
  /** Unique identifier */
  id: string;
  /** Term name */
  name: string;
  /** Display name */
  displayName: string;
  /** Term definition */
  definition: string;
  /** Business domain */
  domain: string;
  /** Related terms */
  relatedTerms: string[];
  /** Synonyms */
  synonyms: string[];
  /** Term status */
  status: 'DRAFT' | 'APPROVED' | 'DEPRECATED';
  /** Data steward */
  steward: string;
  /** Custom attributes */
  attributes?: Record<string, any>;
  /** Creation metadata */
  createdAt: Date;
  createdBy: string;
  /** Last update metadata */
  updatedAt: Date;
  updatedBy: string;
  /** Associated data assets */
  linkedAssets?: string[];
}

/**
 * Main data asset definition
 */
export interface DataAsset {
  /** Unique identifier */
  id: string;
  /** Asset name */
  name: string;
  /** Display name */
  displayName: string;
  /** Asset type */
  type: AssetType;
  /** Asset description */
  description: string;
  /** Data classification */
  classification: DataClassification;
  /** Asset status */
  status: AssetStatus;
  /** Database/system source */
  source: {
    system: string;
    database?: string;
    schema?: string;
    connectionString?: string;
  };
  /** Schema definition */
  schema?: Schema;
  /** Data owner */
  owner: string;
  /** Data stewards */
  stewards: string[];
  /** Metadata tags */
  tags: MetadataTag[];
  /** Business terms linked to this asset */
  businessTerms: string[];
  /** Data quality metrics */
  qualityMetrics?: QualityMetrics;
  /** Data lineage */
  lineage?: Lineage;
  /** Usage statistics */
  usageStats?: UsageStatistics;
  /** Custom metadata */
  customMetadata?: Record<string, any>;
  /** Creation metadata */
  createdAt: Date;
  createdBy: string;
  /** Last update metadata */
  updatedAt: Date;
  updatedBy: string;
  /** Last profiling timestamp */
  lastProfiled?: Date;
  /** Certification status */
  certified?: boolean;
  certifiedBy?: string;
  certifiedAt?: Date;
}

/**
 * Search query parameters
 */
export interface SearchQuery {
  /** Search text */
  query: string;
  /** Asset types to filter */
  types?: AssetType[];
  /** Tags to filter */
  tags?: string[];
  /** Classification levels */
  classifications?: DataClassification[];
  /** Owner filter */
  owner?: string;
  /** Business domain filter */
  domain?: string;
  /** Minimum quality score */
  minQualityScore?: number;
  /** Status filter */
  status?: AssetStatus[];
  /** Free-form filters */
  filters?: Record<string, any>;
  /** Sorting options */
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  /** Pagination */
  pagination?: {
    page: number;
    pageSize: number;
  };
}

/**
 * Search result item
 */
export interface SearchResult {
  /** Matched asset */
  asset: DataAsset;
  /** Relevance score */
  score: number;
  /** Highlighted matches */
  highlights?: {
    field: string;
    matches: string[];
  }[];
  /** Matched terms */
  matchedTerms?: string[];
}

/**
 * Paginated search results
 */
export interface SearchResults {
  /** Result items */
  results: SearchResult[];
  /** Total count */
  total: number;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total pages */
  totalPages: number;
  /** Search execution time in ms */
  executionTime: number;
  /** Facets for filtering */
  facets?: {
    types: { [key: string]: number };
    classifications: { [key: string]: number };
    domains: { [key: string]: number };
    tags: { [key: string]: number };
  };
}

/**
 * Metadata extraction configuration
 */
export interface ExtractionConfig {
  /** Source connection details */
  source: {
    type: 'postgres' | 'mysql' | 'mongodb' | 'api' | 'file';
    connectionString: string;
    credentials?: {
      username: string;
      password: string;
    };
  };
  /** Extraction scope */
  scope?: {
    databases?: string[];
    schemas?: string[];
    tables?: string[];
  };
  /** Whether to extract sample data */
  extractSamples?: boolean;
  /** Sample size */
  sampleSize?: number;
  /** Whether to profile data */
  profileData?: boolean;
  /** Custom extraction rules */
  customRules?: Record<string, any>;
}

/**
 * Metadata extraction result
 */
export interface ExtractionResult {
  /** Extracted assets */
  assets: DataAsset[];
  /** Extraction statistics */
  stats: {
    assetsDiscovered: number;
    assetsCreated: number;
    assetsUpdated: number;
    errors: number;
  };
  /** Extraction errors */
  errors?: {
    asset: string;
    error: string;
    details?: any;
  }[];
  /** Extraction timestamp */
  timestamp: Date;
  /** Duration in ms */
  duration: number;
}

/**
 * Catalog configuration
 */
export interface CatalogConfig {
  /** Database connection for catalog storage */
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  /** Search configuration */
  search?: {
    enableSemanticSearch?: boolean;
    indexingBatchSize?: number;
  };
  /** Metadata extraction schedule */
  extractionSchedule?: {
    enabled: boolean;
    cronExpression: string;
  };
  /** Quality profiling configuration */
  profiling?: {
    enabled: boolean;
    schedule?: string;
  };
  /** Lineage tracking configuration */
  lineage?: {
    enabled: boolean;
    maxDepth?: number;
  };
}

/**
 * Asset relationship types
 */
export enum RelationshipType {
  CONTAINS = 'CONTAINS',
  DERIVED_FROM = 'DERIVED_FROM',
  USES = 'USES',
  PRODUCES = 'PRODUCES',
  RELATES_TO = 'RELATES_TO',
  IMPLEMENTS = 'IMPLEMENTS',
}

/**
 * Asset relationship
 */
export interface AssetRelationship {
  /** Relationship ID */
  id: string;
  /** Source asset ID */
  sourceId: string;
  /** Target asset ID */
  targetId: string;
  /** Relationship type */
  type: RelationshipType;
  /** Relationship description */
  description?: string;
  /** Relationship metadata */
  metadata?: Record<string, any>;
  /** Creation timestamp */
  createdAt: Date;
  /** Created by user */
  createdBy: string;
}

/**
 * Data profiling results
 */
export interface ProfilingResult {
  /** Asset ID */
  assetId: string;
  /** Profiling timestamp */
  timestamp: Date;
  /** Row count */
  rowCount: number;
  /** Column statistics */
  columnStats: {
    [columnName: string]: {
      nullCount: number;
      uniqueCount: number;
      minValue?: any;
      maxValue?: any;
      avgValue?: number;
      medianValue?: any;
      stdDev?: number;
      topValues?: { value: any; count: number }[];
      dataTypeDetected?: DataFieldType;
      patternAnalysis?: {
        pattern: string;
        matchRate: number;
      }[];
    };
  };
  /** Data quality issues detected */
  qualityIssues: {
    column: string;
    issueType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    affectedRows?: number;
  }[];
}

/**
 * Catalog event types for auditing
 */
export enum CatalogEventType {
  ASSET_CREATED = 'ASSET_CREATED',
  ASSET_UPDATED = 'ASSET_UPDATED',
  ASSET_DELETED = 'ASSET_DELETED',
  ASSET_CERTIFIED = 'ASSET_CERTIFIED',
  SCHEMA_EVOLVED = 'SCHEMA_EVOLVED',
  TERM_CREATED = 'TERM_CREATED',
  TERM_UPDATED = 'TERM_UPDATED',
  METADATA_EXTRACTED = 'METADATA_EXTRACTED',
  ASSET_ACCESSED = 'ASSET_ACCESSED',
}

/**
 * Catalog audit event
 */
export interface CatalogEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: CatalogEventType;
  /** Asset ID */
  assetId?: string;
  /** User who triggered the event */
  userId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event details */
  details: Record<string, any>;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
}
