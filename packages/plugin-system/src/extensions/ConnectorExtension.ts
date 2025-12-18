import { BaseExtension } from './BaseExtension.js';
import { PluginContext, PluginManifest } from '../types/plugin.js';
import { Entity, Relationship } from './AnalyticsExtension.js';

/**
 * Base class for connector plugins
 * Connectors integrate external data sources and ingest data
 */
export abstract class ConnectorExtension extends BaseExtension {
  constructor(manifest: PluginManifest) {
    super(manifest);
  }

  /**
   * Test connection to data source
   */
  abstract testConnection(config: ConnectionConfig): Promise<ConnectionTestResult>;

  /**
   * Fetch data from the connector
   */
  abstract fetch(request: FetchRequest): Promise<FetchResult>;

  /**
   * Get connector metadata
   */
  abstract getMetadata(): ConnectorMetadata;

  /**
   * Get schema of available data
   */
  abstract getSchema(): Promise<DataSchema>;

  /**
   * Optional: Support for streaming data
   */
  async *stream?(request: FetchRequest): AsyncGenerator<FetchResult, void, unknown>;

  protected async onInitialize(context: PluginContext): Promise<void> {
    const metadata = this.getMetadata();
    this.log.info(`Initializing connector plugin: ${metadata.name}`);

    await this.validatePermissions(context);
  }

  protected async onStart(): Promise<void> {
    this.log.info('Connector plugin started');
  }

  protected async onStop(): Promise<void> {
    this.log.info('Connector plugin stopped');
  }

  protected async onDestroy(): Promise<void> {
    this.log.info('Connector plugin cleaned up');
  }

  private async validatePermissions(_context: PluginContext): Promise<void> {
    const requiredPermissions = ['network:access', 'write:data'];
    const hasPermissions = requiredPermissions.every(perm =>
      this.manifest.permissions.map(p => p.toString()).includes(perm)
    );

    if (!hasPermissions) {
      throw new Error(
        `Connector plugin ${this.manifest.id} missing required permissions: ${requiredPermissions.join(', ')}`
      );
    }
  }
}

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  /**
   * Connection type
   */
  type: 'api' | 'database' | 'file' | 'stream';

  /**
   * Endpoint or connection string
   */
  endpoint?: string;

  /**
   * Authentication
   */
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'oauth' | 'apikey' | 'custom';
    credentials?: Record<string, string>;
  };

  /**
   * TLS/SSL configuration
   */
  tls?: {
    enabled: boolean;
    verifyCA?: boolean;
    cert?: string;
    key?: string;
  };

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };

  /**
   * Additional options
   */
  options?: Record<string, any>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  metadata?: {
    version?: string;
    capabilities?: string[];
    limits?: Record<string, number>;
  };
  error?: string;
}

/**
 * Data fetch request
 */
export interface FetchRequest {
  /**
   * Query or filter
   */
  query?: string | Record<string, any>;

  /**
   * Pagination
   */
  pagination?: {
    offset: number;
    limit: number;
    cursor?: string;
  };

  /**
   * Fields to fetch
   */
  fields?: string[];

  /**
   * Filters
   */
  filters?: Filter[];

  /**
   * Sorting
   */
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  }[];

  /**
   * Date range
   */
  dateRange?: {
    field: string;
    start: Date;
    end: Date;
  };

  /**
   * Include relationships
   */
  includeRelationships?: boolean;

  /**
   * Additional parameters
   */
  parameters?: Record<string, any>;
}

export interface Filter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'nin';
  value: any;
}

/**
 * Fetch result
 */
export interface FetchResult {
  /**
   * Fetched entities
   */
  entities: Entity[];

  /**
   * Fetched relationships
   */
  relationships?: Relationship[];

  /**
   * Pagination info
   */
  pagination: {
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };

  /**
   * Metadata
   */
  metadata: {
    fetchedAt: Date;
    source: string;
    executionTimeMs: number;
    fromCache?: boolean;
  };

  /**
   * Warnings or issues
   */
  warnings?: string[];
}

/**
 * Data schema from connector
 */
export interface DataSchema {
  /**
   * Entity types available
   */
  entityTypes: EntityTypeSchema[];

  /**
   * Relationship types available
   */
  relationshipTypes: RelationshipTypeSchema[];

  /**
   * Schema version
   */
  version: string;

  /**
   * Last updated
   */
  updatedAt: Date;
}

export interface EntityTypeSchema {
  type: string;
  label: string;
  description?: string;
  properties: PropertySchema[];
  identifierProperty?: string;
}

export interface RelationshipTypeSchema {
  type: string;
  label: string;
  description?: string;
  sourceTypes: string[];
  targetTypes: string[];
  properties: PropertySchema[];
  directed: boolean;
}

export interface PropertySchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  description?: string;
  required: boolean;
  indexed?: boolean;
  unique?: boolean;
  default?: any;
}

/**
 * Connector metadata
 */
export interface ConnectorMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  icon?: string;
  tags?: string[];

  /**
   * Connector type
   */
  connectorType: 'push' | 'pull' | 'stream' | 'bidirectional';

  /**
   * Supported protocols
   */
  protocols: string[];

  /**
   * Authentication methods supported
   */
  authMethods: string[];

  /**
   * Rate limits
   */
  rateLimits?: {
    requestsPerSecond: number;
    requestsPerDay?: number;
    concurrentRequests?: number;
  };

  /**
   * Data types provided
   */
  providesDataTypes: string[];

  /**
   * Configuration schema
   */
  configSchema: Record<string, any>;

  /**
   * Setup instructions
   */
  setupInstructions?: string;

  /**
   * Documentation URL
   */
  documentation?: string;
}

/**
 * Batch fetch support
 */
export interface BatchFetchRequest {
  requests: FetchRequest[];
  parallel?: boolean;
  continueOnError?: boolean;
}

export interface BatchFetchResult {
  results: (FetchResult | FetchError)[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalExecutionTimeMs: number;
  };
}

export interface FetchError {
  error: true;
  message: string;
  code?: string;
  requestIndex: number;
}
