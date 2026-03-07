// @ts-nocheck
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  ConnectorConfig,
  ConnectorSchema,
  ConnectorHealth,
  ConnectorMetrics,
  IngestionEvent
} from './types.js';
import logger from '../config/logger.js';
import { ConnectorContext } from '../data-model/types.js';
import { DataEnvelope } from '../types/data-envelope.js';

export interface SourceConnector {
  fetchBatch(
    ctx: ConnectorContext,
    cursor?: string | null
  ): Promise<DataEnvelope<{
    records: any[];
    nextCursor?: string | null;
  }>>;
}

export abstract class BaseSourceConnector {
  protected handleError(ctx: ConnectorContext, error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    ctx.logger.error({ error: err }, 'Connector operation failed');
  }
}

export abstract class BaseConnector extends EventEmitter {
  protected config: ConnectorConfig;
  protected metrics: ConnectorMetrics;
  protected isConnected: boolean = false;
  protected logger: ReturnType<typeof logger.child>;

  constructor(config: ConnectorConfig) {
    super();
    this.config = config;
    this.metrics = {
      recordsProcessed: 0,
      bytesProcessed: 0,
      errors: 0,
      latency: 0
    };
    this.logger = logger.child({
      connectorId: config.id,
      connectorType: config.type,
      tenantId: config.tenantId
    });
  }

  /**
   * Rate limiting helper
   * Basic token bucket implementation or delay
   */
  protected async throttle(): Promise<void> {
      // Simple delay for now to prevent overwhelming sources
      // In production this would be a real rate limiter
      await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Initialize the connection to the source
   */
  abstract connect(): Promise<void>;

  /**
   * Close the connection
   */
  abstract disconnect(): Promise<void>;

  /**
   * Test the connection parameters
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Fetch the schema of the source data
   */
  abstract fetchSchema(): Promise<ConnectorSchema>;

  /**
   * Read data from the source as a stream of records
   */
  abstract readStream(options?: any): Promise<Readable>;

  /**
   * Check the health of the connector
   */
  async healthCheck(): Promise<ConnectorHealth> {
    try {
      const start = Date.now();
      const connected = await this.testConnection();
      const latency = Date.now() - start;

      return {
        status: connected ? 'healthy' : 'unhealthy',
        latencyMs: latency,
        timestamp: new Date()
      };
    } catch (err: any) {
      return {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(): boolean {
    return !!this.config.id && !!this.config.type;
  }

  /**
   * Wrap data in a standard ingestion event structure with provenance
   */
  protected wrapEvent(data: any): IngestionEvent {
    const lineageId = randomUUID();
    const consent = this.config.metadata?.consent;
    const termsUrl = this.config.metadata?.termsUrl;
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceId: this.config.id,
      timestamp: new Date(),
      data,
      metadata: {
        consent,
        termsUrl
      },
      provenance: {
        source: this.config.name,
        sourceId: this.config.id,
        ingestTimestamp: new Date(),
        connectorType: this.config.type,
        lineageId,
        consent,
        termsUrl
      }
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConnectorMetrics {
    return { ...this.metrics };
  }
}
