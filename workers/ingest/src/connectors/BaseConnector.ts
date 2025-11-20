import { z } from 'zod';
import { logger } from '../utils/logger';
import type { ConnectorConfig, IngestRecord } from '../types';

export abstract class BaseConnector {
  protected logger = logger.child({ component: 'connector' });
  protected schema?: z.ZodSchema;

  // Metrics tracking for SLO monitoring
  protected lastSuccessTimestamp: number = 0;
  protected lastAttemptTimestamp: number = 0;
  protected recordsIngested: number = 0;
  protected errorCount: number = 0;
  protected consecutiveFailures: number = 0;

  constructor(protected config: ConnectorConfig) {
    this.logger = logger.child({
      component: 'connector',
      connector_name: config.name,
      connector_type: config.type,
    });

    // Load schema if specified
    if (config.schemaRef) {
      this.loadSchema(config.schemaRef);
    }
  }

  protected loadSchema(schemaRef: string): void {
    // In production, implement actual schema loading from repo://
    // For development, create basic validation schemas
    if (schemaRef.includes('entities.schema.yaml')) {
      this.schema = z.object({
        entity_id: z.string(),
        entity_name: z.string().optional(),
        type: z.string(),
      });
    } else if (schemaRef.includes('indicators.schema.yaml')) {
      this.schema = z.object({
        ioc_id: z.string(),
        indicator_type: z.string(),
        ioc_value: z.string(),
        confidence_score: z.number().min(0).max(1).optional(),
      });
    } else if (schemaRef.includes('topicality.schema.yaml')) {
      this.schema = z.object({
        insight_id: z.string(),
        insight_type: z.string(),
        relevance_score: z.number().optional(),
        related_entities: z.array(z.any()).optional(),
        topic_tags: z.array(z.string()).optional(),
        timestamp: z.string().optional(),
      });
    }
  }

  abstract ingest(): AsyncGenerator<IngestRecord>;
  abstract healthCheck(): Promise<boolean>;

  /**
   * Get connector metrics for monitoring and SLO tracking
   */
  getMetrics(): Record<string, number> {
    const now = Date.now();
    const freshnessSeconds = this.lastSuccessTimestamp
      ? (now - this.lastSuccessTimestamp) / 1000
      : -1;

    return {
      // Freshness metric - key SLO indicator
      summit_ingestion_freshness_seconds: freshnessSeconds,

      // Last successful ingestion timestamp (Unix epoch ms)
      summit_ingestion_last_success_timestamp: this.lastSuccessTimestamp,

      // Last attempt timestamp
      summit_ingestion_last_attempt_timestamp: this.lastAttemptTimestamp,

      // Total records ingested
      summit_ingestion_records_total: this.recordsIngested,

      // Error count
      summit_ingestion_errors_total: this.errorCount,

      // Consecutive failures (reset on success)
      summit_ingestion_consecutive_failures: this.consecutiveFailures,

      // Health status: 1 = healthy, 0 = unhealthy
      summit_ingestion_health_status: this.consecutiveFailures < 3 ? 1 : 0,
    };
  }

  /**
   * Mark ingestion attempt started
   */
  protected markAttemptStarted(): void {
    this.lastAttemptTimestamp = Date.now();
  }

  /**
   * Mark ingestion succeeded with record count
   */
  protected markSuccess(recordCount: number = 0): void {
    this.lastSuccessTimestamp = Date.now();
    this.recordsIngested += recordCount;
    this.consecutiveFailures = 0;

    this.logger.info('Ingestion succeeded', {
      connector: this.config.name,
      records: recordCount,
      freshness_seconds: 0,
    });
  }

  /**
   * Mark ingestion failed
   */
  protected markFailure(error: Error): void {
    this.errorCount++;
    this.consecutiveFailures++;

    this.logger.error('Ingestion failed', {
      connector: this.config.name,
      error: error.message,
      consecutive_failures: this.consecutiveFailures,
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down connector', {
      connector: this.config.name,
    });
    // Override in subclasses for cleanup
  }
}
