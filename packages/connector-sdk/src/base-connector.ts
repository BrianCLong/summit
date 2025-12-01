/**
 * Base Connector Implementation
 *
 * Provides common functionality for all connectors.
 */

import type {
  Connector,
  ConnectorManifest,
  ConnectorConfig,
  ConnectorContext,
  ConnectorResult,
  ConnectorQuery,
  ConnectorQueryResult,
  ConnectorEntity,
} from './types';

/**
 * Abstract base class for connectors
 */
export abstract class BaseConnector implements Connector {
  abstract readonly manifest: ConnectorManifest;

  protected config: ConnectorConfig | null = null;
  protected initialized = false;

  /**
   * Initialize the connector with configuration
   */
  async initialize(config: ConnectorConfig): Promise<void> {
    this.validateConfig(config);
    this.config = config;
    await this.onInitialize(config);
    this.initialized = true;
  }

  /**
   * Override this method to perform custom initialization
   */
  protected async onInitialize(_config: ConnectorConfig): Promise<void> {
    // Default: no-op
  }

  /**
   * Validate configuration against manifest schema
   */
  protected validateConfig(config: ConnectorConfig): void {
    // Check required secrets
    for (const secret of this.manifest.requiredSecrets) {
      if (!config.secrets[secret]) {
        throw new Error(`Missing required secret: ${secret}`);
      }
    }
  }

  /**
   * Ensure connector is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new Error('Connector not initialized. Call initialize() first.');
    }
  }

  /**
   * Test connection to the data source
   */
  abstract testConnection(): Promise<{ success: boolean; message: string }>;

  /**
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    await this.onShutdown();
    this.initialized = false;
    this.config = null;
  }

  /**
   * Override this method to perform custom cleanup
   */
  protected async onShutdown(): Promise<void> {
    // Default: no-op
  }

  /**
   * Helper: Create a success result
   */
  protected successResult(
    entitiesProcessed: number,
    relationshipsProcessed: number,
    durationMs: number,
    cursor?: string
  ): ConnectorResult {
    return {
      success: true,
      entitiesProcessed,
      relationshipsProcessed,
      errorCount: 0,
      durationMs,
      cursor,
    };
  }

  /**
   * Helper: Create a failure result
   */
  protected failureResult(
    error: Error,
    entitiesProcessed: number,
    relationshipsProcessed: number,
    durationMs: number
  ): ConnectorResult {
    return {
      success: false,
      entitiesProcessed,
      relationshipsProcessed,
      errorCount: 1,
      errors: [
        {
          code: 'CONNECTOR_ERROR',
          message: error.message,
          retryable: true,
          cause: error,
        },
      ],
      durationMs,
    };
  }

  /**
   * Helper: Normalize entity type names
   */
  protected normalizeEntityType(type: string): string {
    // Convert to PascalCase
    return type
      .split(/[_-\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Helper: Normalize relationship type names
   */
  protected normalizeRelationshipType(type: string): string {
    // Convert to SCREAMING_SNAKE_CASE
    return type.replace(/[- ]/g, '_').toUpperCase();
  }

  /**
   * Helper: Generate external ID
   */
  protected generateExternalId(sourceId: string, recordId: string): string {
    return `${this.manifest.id}:${sourceId}:${recordId}`;
  }

  /**
   * Helper: Check if operation should be aborted
   */
  protected checkAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new Error('Operation aborted');
    }
  }
}

/**
 * Abstract base for pull-capable connectors
 */
export abstract class PullConnector extends BaseConnector {
  abstract pull(context: ConnectorContext): Promise<ConnectorResult>;
}

/**
 * Abstract base for query-capable connectors
 */
export abstract class QueryConnector extends BaseConnector {
  abstract query(query: ConnectorQuery, context: ConnectorContext): Promise<ConnectorQueryResult>;
}

/**
 * Abstract base for stream-capable connectors
 */
export abstract class StreamConnector extends BaseConnector {
  protected streaming = false;

  abstract startStream(context: ConnectorContext): Promise<void>;

  async stopStream(): Promise<void> {
    this.streaming = false;
  }

  protected isStreaming(): boolean {
    return this.streaming;
  }
}

/**
 * Abstract base for enrichment connectors
 */
export abstract class EnrichConnector extends BaseConnector {
  abstract enrich(entity: ConnectorEntity, context: ConnectorContext): Promise<ConnectorEntity>;
}
