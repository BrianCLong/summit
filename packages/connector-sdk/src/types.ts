/**
 * Connector SDK Types
 *
 * Standard interfaces for building Summit platform connectors.
 *
 * @module connector-sdk
 */

// -----------------------------------------------------------------------------
// Connector Manifest
// -----------------------------------------------------------------------------

/**
 * Connector manifest describing capabilities and requirements
 */
export interface ConnectorManifest {
  /** Unique connector identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version (semver) */
  version: string;
  /** Description */
  description: string;
  /** Maturity status */
  status: 'experimental' | 'beta' | 'stable' | 'deprecated';
  /** Category */
  category: string;
  /** Supported capabilities */
  capabilities: ConnectorCapability[];
  /** Entity types this connector produces */
  entityTypes: string[];
  /** Relationship types this connector produces */
  relationshipTypes: string[];
  /** Supported authentication methods */
  authentication: AuthMethod[];
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Configuration schema (JSON Schema) */
  configSchema: Record<string, unknown>;
  /** Required secrets */
  requiredSecrets: string[];
  /** License */
  license: string;
  /** Maintainer */
  maintainer: string;
  /** Documentation URL */
  documentationUrl?: string;
  /** Tags for discovery */
  tags?: string[];
}

export type ConnectorCapability =
  | 'pull'
  | 'push'
  | 'stream'
  | 'query'
  | 'batch'
  | 'incremental'
  | 'enrich'
  | 'geocode';

export type AuthMethod =
  | 'none'
  | 'basic'
  | 'api-key'
  | 'bearer'
  | 'oauth2'
  | 'certificate'
  | 'aws-credentials'
  | 'iam-role'
  | 'service-account'
  | 'managed-identity';

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  retryAfterMs?: number;
}

// -----------------------------------------------------------------------------
// Connector Configuration
// -----------------------------------------------------------------------------

/**
 * Runtime configuration for a connector instance
 */
export interface ConnectorConfig {
  /** Configuration values */
  config: Record<string, unknown>;
  /** Secrets (API keys, passwords, etc.) */
  secrets: Record<string, string>;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** Investigation IDs to associate with ingested data */
  investigationIds?: string[];
  /** Default classification for ingested entities */
  defaultClassification?: string;
  /** Tags to apply to all ingested entities */
  defaultTags?: string[];
}

// -----------------------------------------------------------------------------
// Connector Context
// -----------------------------------------------------------------------------

/**
 * Execution context provided to connector operations
 */
export interface ConnectorContext {
  /** Logger instance */
  logger: ConnectorLogger;
  /** Metrics collector */
  metrics: ConnectorMetrics;
  /** Rate limiter */
  rateLimiter: RateLimiter;
  /** State store for incremental sync */
  stateStore: StateStore;
  /** Entity emitter for streaming results */
  emitter: EntityEmitter;
  /** Abort signal for cancellation */
  signal: AbortSignal;
}

export interface ConnectorLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

export interface ConnectorMetrics {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, durationMs: number, tags?: Record<string, string>): void;
}

export interface RateLimiter {
  /** Wait for rate limit capacity */
  acquire(): Promise<void>;
  /** Check if rate limited without waiting */
  isLimited(): boolean;
  /** Get remaining capacity */
  remaining(): number;
}

export interface StateStore {
  /** Get state value */
  get<T>(key: string): Promise<T | null>;
  /** Set state value */
  set<T>(key: string, value: T): Promise<void>;
  /** Delete state value */
  delete(key: string): Promise<void>;
  /** Get cursor for incremental sync */
  getCursor(): Promise<string | null>;
  /** Set cursor for incremental sync */
  setCursor(cursor: string): Promise<void>;
}

export interface EntityEmitter {
  /** Emit an entity */
  emitEntity(entity: ConnectorEntity): Promise<void>;
  /** Emit a relationship */
  emitRelationship(relationship: ConnectorRelationship): Promise<void>;
  /** Emit multiple entities in batch */
  emitEntities(entities: ConnectorEntity[]): Promise<void>;
  /** Emit multiple relationships in batch */
  emitRelationships(relationships: ConnectorRelationship[]): Promise<void>;
  /** Flush any buffered items */
  flush(): Promise<void>;
}

// -----------------------------------------------------------------------------
// Connector Data Types
// -----------------------------------------------------------------------------

/**
 * Entity produced by a connector
 */
export interface ConnectorEntity {
  /** Entity type (Person, Organization, etc.) */
  type: string;
  /** External ID from source system */
  externalId: string;
  /** Entity properties */
  props: Record<string, unknown>;
  /** Confidence score (0-1) */
  confidence?: number;
  /** When observed in the real world */
  observedAt?: Date;
  /** Business validity start */
  validFrom?: Date;
  /** Business validity end */
  validTo?: Date;
  /** Source metadata */
  sourceMeta?: Record<string, unknown>;
}

/**
 * Relationship produced by a connector
 */
export interface ConnectorRelationship {
  /** Relationship type */
  type: string;
  /** Source entity external ID */
  fromExternalId: string;
  /** Target entity external ID */
  toExternalId: string;
  /** Relationship properties */
  props?: Record<string, unknown>;
  /** Confidence score (0-1) */
  confidence?: number;
  /** When observed in the real world */
  observedAt?: Date;
  /** Business validity start */
  validFrom?: Date;
  /** Business validity end */
  validTo?: Date;
}

// -----------------------------------------------------------------------------
// Connector Results
// -----------------------------------------------------------------------------

/**
 * Result of a connector operation
 */
export interface ConnectorResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Number of entities processed */
  entitiesProcessed: number;
  /** Number of relationships processed */
  relationshipsProcessed: number;
  /** Number of errors encountered */
  errorCount: number;
  /** Errors (if any) */
  errors?: ConnectorError[];
  /** New cursor position (for incremental sync) */
  cursor?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ConnectorError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Affected record (if applicable) */
  recordId?: string;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Original error */
  cause?: Error;
}

// -----------------------------------------------------------------------------
// Query Types
// -----------------------------------------------------------------------------

/**
 * Query request for connectors that support ad-hoc queries
 */
export interface ConnectorQuery {
  /** Query string (format depends on connector) */
  query: string;
  /** Query parameters */
  params?: Record<string, unknown>;
  /** Maximum results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Time range filter */
  timeRange?: {
    start: Date;
    end: Date;
  };
  /** Entity type filter */
  entityTypes?: string[];
}

/**
 * Query result
 */
export interface ConnectorQueryResult {
  /** Entities matching the query */
  entities: ConnectorEntity[];
  /** Relationships matching the query */
  relationships: ConnectorRelationship[];
  /** Total count (if available) */
  totalCount?: number;
  /** Pagination cursor */
  cursor?: string;
  /** Query metadata */
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Connector Interface
// -----------------------------------------------------------------------------

/**
 * Base interface for all connectors
 */
export interface Connector {
  /** Connector manifest */
  readonly manifest: ConnectorManifest;

  /**
   * Initialize the connector
   */
  initialize(config: ConnectorConfig): Promise<void>;

  /**
   * Test connectivity and configuration
   */
  testConnection(): Promise<{ success: boolean; message: string }>;

  /**
   * Pull data from the source (for pull-capable connectors)
   */
  pull?(context: ConnectorContext): Promise<ConnectorResult>;

  /**
   * Execute a query (for query-capable connectors)
   */
  query?(query: ConnectorQuery, context: ConnectorContext): Promise<ConnectorQueryResult>;

  /**
   * Start streaming (for stream-capable connectors)
   */
  startStream?(context: ConnectorContext): Promise<void>;

  /**
   * Stop streaming
   */
  stopStream?(): Promise<void>;

  /**
   * Enrich an entity (for enrich-capable connectors)
   */
  enrich?(entity: ConnectorEntity, context: ConnectorContext): Promise<ConnectorEntity>;

  /**
   * Clean up resources
   */
  shutdown(): Promise<void>;
}

// -----------------------------------------------------------------------------
// Connector Factory
// -----------------------------------------------------------------------------

/**
 * Factory function for creating connector instances
 */
export type ConnectorFactory = () => Connector;

/**
 * Connector registration entry
 */
export interface ConnectorRegistration {
  manifest: ConnectorManifest;
  factory: ConnectorFactory;
}
