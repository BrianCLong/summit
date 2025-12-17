/**
 * Metrics Ingestion Pipeline
 *
 * High-throughput ingestion of time-series metrics with
 * batching, validation, and multi-tenant support.
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { StorageTierManager, WriteRequest } from '../storage/tier-manager.js';
import {
  Metric,
  MetricSchema,
  MetricType,
  Labels,
  LabelCardinalityLimits,
  StandardLabels,
} from '../models/metric-types.js';
import {
  TenantConfig,
  TenantUsage,
  checkQuota,
  isMetricAllowed,
} from '../models/tenant.js';

// ============================================================================
// INGESTION INTERFACES
// ============================================================================

/**
 * Ingestion batch
 */
export interface IngestionBatch {
  tenantId: string;
  metrics: Metric[];
  receivedAt: number;
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  accepted: number;
  rejected: number;
  errors: IngestionError[];
}

/**
 * Ingestion error
 */
export interface IngestionError {
  metric?: string;
  reason: string;
  code: IngestionErrorCode;
}

export enum IngestionErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  METRIC_NOT_ALLOWED = 'METRIC_NOT_ALLOWED',
  CARDINALITY_EXCEEDED = 'CARDINALITY_EXCEEDED',
  TENANT_INACTIVE = 'TENANT_INACTIVE',
  TIMESTAMP_OUT_OF_RANGE = 'TIMESTAMP_OUT_OF_RANGE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  /** Max batch size before flush */
  batchSize: number;
  /** Max time before flush (ms) */
  batchTimeoutMs: number;
  /** Enable Kafka ingestion */
  enableKafka: boolean;
  /** Kafka topic for metrics */
  kafkaTopic: string;
  /** Max allowed clock skew (ms) */
  maxClockSkewMs: number;
  /** Future timestamp tolerance (ms) */
  futureTolerance: number;
  /** Past timestamp tolerance (ms) */
  pastTolerance: number;
}

// ============================================================================
// INGESTION PIPELINE
// ============================================================================

export class IngestionPipeline extends EventEmitter {
  private storageManager: StorageTierManager;
  private logger: Logger;
  private config: PipelineConfig;

  private tenantConfigs: Map<string, TenantConfig>;
  private tenantUsage: Map<string, TenantUsage>;
  private labelCardinality: Map<string, Map<string, Set<string>>>;

  private pendingBatches: Map<string, WriteRequest[]>;
  private flushTimers: Map<string, NodeJS.Timeout>;

  private kafkaProducer?: Producer;
  private kafkaConsumer?: Consumer;

  private metrics = {
    samplesReceived: 0,
    samplesAccepted: 0,
    samplesRejected: 0,
    batchesProcessed: 0,
    flushCount: 0,
  };

  constructor(
    storageManager: StorageTierManager,
    logger: Logger,
    config: Partial<PipelineConfig> = {},
  ) {
    super();
    this.storageManager = storageManager;
    this.logger = logger;

    this.config = {
      batchSize: config.batchSize || 1000,
      batchTimeoutMs: config.batchTimeoutMs || 5000,
      enableKafka: config.enableKafka || false,
      kafkaTopic: config.kafkaTopic || 'metrics-ingest',
      maxClockSkewMs: config.maxClockSkewMs || 300000, // 5 minutes
      futureTolerance: config.futureTolerance || 60000, // 1 minute into future
      pastTolerance: config.pastTolerance || 86400000 * 7, // 7 days into past
    };

    this.tenantConfigs = new Map();
    this.tenantUsage = new Map();
    this.labelCardinality = new Map();
    this.pendingBatches = new Map();
    this.flushTimers = new Map();
  }

  /**
   * Initialize the pipeline
   */
  async initialize(kafka?: Kafka): Promise<void> {
    if (this.config.enableKafka && kafka) {
      this.kafkaProducer = kafka.producer();
      this.kafkaConsumer = kafka.consumer({ groupId: 'metrics-ingestion' });

      await this.kafkaProducer.connect();
      await this.kafkaConsumer.connect();

      await this.kafkaConsumer.subscribe({
        topic: this.config.kafkaTopic,
        fromBeginning: false,
      });

      await this.kafkaConsumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleKafkaMessage(payload);
        },
      });

      this.logger.info('Kafka ingestion pipeline initialized');
    }

    this.logger.info('Ingestion pipeline initialized', { config: this.config });
  }

  /**
   * Register tenant configuration
   */
  registerTenant(config: TenantConfig): void {
    this.tenantConfigs.set(config.tenantId, config);

    // Initialize usage tracking
    if (!this.tenantUsage.has(config.tenantId)) {
      this.tenantUsage.set(config.tenantId, {
        tenantId: config.tenantId,
        activeSeries: 0,
        ingestionRate: 0,
        storageUsed: 0,
        queriesExecuted: 0,
        queryErrors: 0,
        samplesIngested: 0,
        samplesRejected: 0,
        concurrentQueries: 0,
        lastUpdated: Date.now(),
      });
    }

    // Initialize cardinality tracking
    if (!this.labelCardinality.has(config.tenantId)) {
      this.labelCardinality.set(config.tenantId, new Map());
    }
  }

  /**
   * Ingest a batch of metrics
   */
  async ingest(batch: IngestionBatch): Promise<IngestionResult> {
    const { tenantId, metrics, receivedAt } = batch;
    const result: IngestionResult = {
      accepted: 0,
      rejected: 0,
      errors: [],
    };

    // Get tenant config
    const tenantConfig = this.tenantConfigs.get(tenantId);
    if (!tenantConfig) {
      return {
        accepted: 0,
        rejected: metrics.length,
        errors: [
          {
            reason: `Unknown tenant: ${tenantId}`,
            code: IngestionErrorCode.VALIDATION_ERROR,
          },
        ],
      };
    }

    // Check if tenant is active
    if (!tenantConfig.active) {
      return {
        accepted: 0,
        rejected: metrics.length,
        errors: [
          {
            reason: 'Tenant is inactive',
            code: IngestionErrorCode.TENANT_INACTIVE,
          },
        ],
      };
    }

    const tenantUsage = this.tenantUsage.get(tenantId)!;
    const now = Date.now();

    // Process each metric
    const validRequests: WriteRequest[] = [];

    for (const metric of metrics) {
      this.metrics.samplesReceived++;

      try {
        // Validate metric schema
        const validationResult = MetricSchema.safeParse(metric);
        if (!validationResult.success) {
          result.rejected++;
          result.errors.push({
            metric: metric.name,
            reason: validationResult.error.message,
            code: IngestionErrorCode.VALIDATION_ERROR,
          });
          continue;
        }

        // Check if metric is allowed for tenant
        if (!isMetricAllowed(metric.name, tenantConfig)) {
          result.rejected++;
          result.errors.push({
            metric: metric.name,
            reason: 'Metric not allowed for tenant',
            code: IngestionErrorCode.METRIC_NOT_ALLOWED,
          });
          continue;
        }

        // Validate timestamp
        const timestampError = this.validateTimestamp(metric.timestamp, now);
        if (timestampError) {
          result.rejected++;
          result.errors.push({
            metric: metric.name,
            reason: timestampError,
            code: IngestionErrorCode.TIMESTAMP_OUT_OF_RANGE,
          });
          continue;
        }

        // Check label cardinality
        const cardinalityError = this.checkLabelCardinality(tenantId, metric);
        if (cardinalityError) {
          result.rejected++;
          result.errors.push({
            metric: metric.name,
            reason: cardinalityError,
            code: IngestionErrorCode.CARDINALITY_EXCEEDED,
          });
          continue;
        }

        // Check quota
        const quotaCheck = checkQuota('ingest', 1, tenantConfig, tenantUsage);
        if (!quotaCheck.allowed) {
          result.rejected++;
          result.errors.push({
            metric: metric.name,
            reason: quotaCheck.reason!,
            code: IngestionErrorCode.QUOTA_EXCEEDED,
          });
          continue;
        }

        // Extract value based on metric type
        const value = this.extractValue(metric);

        // Create write request
        validRequests.push({
          metricName: metric.name,
          labels: metric.labels,
          timestamp: metric.timestamp,
          value,
          tenantId,
        });

        result.accepted++;
        this.metrics.samplesAccepted++;
      } catch (error) {
        result.rejected++;
        this.metrics.samplesRejected++;
        result.errors.push({
          metric: metric.name,
          reason: error instanceof Error ? error.message : 'Unknown error',
          code: IngestionErrorCode.INTERNAL_ERROR,
        });
      }
    }

    // Add to pending batch
    if (validRequests.length > 0) {
      await this.addToBatch(tenantId, validRequests);
    }

    // Update usage
    tenantUsage.samplesIngested += result.accepted;
    tenantUsage.samplesRejected += result.rejected;
    tenantUsage.lastUpdated = now;

    // Emit metrics
    this.emit('ingestion', {
      tenantId,
      accepted: result.accepted,
      rejected: result.rejected,
    });

    return result;
  }

  /**
   * Validate timestamp is within acceptable range
   */
  private validateTimestamp(timestamp: number, now: number): string | null {
    if (timestamp > now + this.config.futureTolerance) {
      return `Timestamp too far in future: ${new Date(timestamp).toISOString()}`;
    }
    if (timestamp < now - this.config.pastTolerance) {
      return `Timestamp too far in past: ${new Date(timestamp).toISOString()}`;
    }
    return null;
  }

  /**
   * Check and track label cardinality
   */
  private checkLabelCardinality(tenantId: string, metric: Metric): string | null {
    const tenantCardinality = this.labelCardinality.get(tenantId)!;

    for (const [labelName, labelValue] of Object.entries(metric.labels)) {
      // Get or create label set
      if (!tenantCardinality.has(labelName)) {
        tenantCardinality.set(labelName, new Set());
      }

      const labelValues = tenantCardinality.get(labelName)!;

      // Check if adding this value would exceed limit
      const limit =
        LabelCardinalityLimits[labelName as keyof typeof LabelCardinalityLimits] || 1000;

      if (!labelValues.has(labelValue) && labelValues.size >= limit) {
        return `Label cardinality limit exceeded for '${labelName}': ${labelValues.size}/${limit}`;
      }

      // Track value
      labelValues.add(labelValue);
    }

    return null;
  }

  /**
   * Extract numeric value from metric based on type
   */
  private extractValue(metric: Metric): number {
    switch (metric.type) {
      case MetricType.COUNTER:
      case MetricType.GAUGE:
        return metric.value;
      case MetricType.HISTOGRAM:
        return metric.sum / (metric.count || 1); // Average
      case MetricType.SUMMARY:
        return metric.sum / (metric.count || 1); // Average
    }
  }

  /**
   * Add metrics to pending batch
   */
  private async addToBatch(tenantId: string, requests: WriteRequest[]): Promise<void> {
    // Get or create pending batch
    if (!this.pendingBatches.has(tenantId)) {
      this.pendingBatches.set(tenantId, []);
    }

    const batch = this.pendingBatches.get(tenantId)!;
    batch.push(...requests);

    // Check if we should flush
    if (batch.length >= this.config.batchSize) {
      await this.flushBatch(tenantId);
    } else {
      // Set flush timer if not already set
      if (!this.flushTimers.has(tenantId)) {
        const timer = setTimeout(async () => {
          await this.flushBatch(tenantId);
        }, this.config.batchTimeoutMs);

        this.flushTimers.set(tenantId, timer);
      }
    }
  }

  /**
   * Flush pending batch to storage
   */
  private async flushBatch(tenantId: string): Promise<void> {
    // Clear timer
    const timer = this.flushTimers.get(tenantId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(tenantId);
    }

    // Get and clear batch
    const batch = this.pendingBatches.get(tenantId) || [];
    this.pendingBatches.set(tenantId, []);

    if (batch.length === 0) return;

    try {
      await this.storageManager.write(batch);
      this.metrics.batchesProcessed++;
      this.metrics.flushCount++;

      this.logger.debug('Batch flushed', {
        tenantId,
        size: batch.length,
      });
    } catch (error) {
      this.logger.error('Failed to flush batch', {
        tenantId,
        size: batch.length,
        error,
      });

      // Re-add to batch for retry
      const currentBatch = this.pendingBatches.get(tenantId) || [];
      this.pendingBatches.set(tenantId, [...batch, ...currentBatch]);

      throw error;
    }
  }

  /**
   * Handle Kafka message
   */
  private async handleKafkaMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    if (!message.value) return;

    try {
      const data = JSON.parse(message.value.toString());

      // Extract tenant ID from message key or payload
      const tenantId = message.key?.toString() || data.tenantId;
      if (!tenantId) {
        this.logger.warn('Kafka message missing tenant ID');
        return;
      }

      // Parse metrics from message
      const metrics: Metric[] = Array.isArray(data.metrics) ? data.metrics : [data];

      await this.ingest({
        tenantId,
        metrics,
        receivedAt: Date.now(),
      });
    } catch (error) {
      this.logger.error('Failed to process Kafka message', { error });
    }
  }

  /**
   * Flush all pending batches
   */
  async flushAll(): Promise<void> {
    const tenantIds = Array.from(this.pendingBatches.keys());

    await Promise.all(
      tenantIds.map(async (tenantId) => {
        try {
          await this.flushBatch(tenantId);
        } catch (error) {
          this.logger.error('Failed to flush batch for tenant', {
            tenantId,
            error,
          });
        }
      }),
    );
  }

  /**
   * Shutdown the pipeline
   */
  async shutdown(): Promise<void> {
    // Flush all pending data
    await this.flushAll();

    // Disconnect Kafka
    if (this.kafkaProducer) {
      await this.kafkaProducer.disconnect();
    }
    if (this.kafkaConsumer) {
      await this.kafkaConsumer.disconnect();
    }

    // Clear timers
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer);
    }
    this.flushTimers.clear();

    this.logger.info('Ingestion pipeline shutdown complete');
  }

  /**
   * Get pipeline metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Get tenant usage
   */
  getTenantUsage(tenantId: string): TenantUsage | undefined {
    return this.tenantUsage.get(tenantId);
  }

  /**
   * Reset cardinality tracking (useful for testing)
   */
  resetCardinalityTracking(tenantId?: string): void {
    if (tenantId) {
      this.labelCardinality.delete(tenantId);
    } else {
      this.labelCardinality.clear();
    }
  }
}
