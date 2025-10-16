import { z } from 'zod';
import { logger } from '../utils/logger';
import type { ConnectorConfig, IngestRecord } from '../types';

export abstract class BaseConnector {
  protected logger = logger.child({ component: 'connector' });
  protected schema?: z.ZodSchema;

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
   * Get connector metrics for monitoring
   */
  getMetrics(): Record<string, number> {
    return {
      // Override in subclasses to provide specific metrics
      uptime: Date.now(),
    };
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
