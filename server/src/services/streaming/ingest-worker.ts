// @ts-nocheck
/**
 * IntelGraph GA-Core Streaming Ingest Worker
 * Committee Requirements: PII redaction, real-time processing, observability
 * Stribol: "PII redaction worker; OTEL/Prom scaffolding; SLO dashboards"
 * Updated: Now uses Redis Streams for high-throughput ingestion
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import Redis from 'ioredis';
import { insertEvent } from '../../db/timescale';
import { insertAnalyticsTrace } from '../../db/timescale';
import ProvenanceLedgerService from '../provenance-ledger';
import logger from '../../utils/logger';
import { AlertingEngine } from './AlertingEngine';

interface IngestMessage {
  message_id: string;
  source: string;
  timestamp: Date;
  data_type: string;
  raw_data: any;
  metadata: Record<string, any>;
  priority: number;
  correlation_id?: string;
}

interface ProcessedMessage {
  message_id: string;
  source: string;
  timestamp: Date;
  data_type: string;
  processed_data: any;
  redaction_applied: boolean;
  pii_fields_removed: string[];
  processing_time_ms: number;
  confidence: number;
  metadata: Record<string, any>;
}

interface PIIRedactionConfig {
  enabled: boolean;
  redaction_patterns: Record<string, RegExp>;
  replacement_token: string;
  log_redactions: boolean;
}

interface WorkerMetrics {
  messages_processed: number;
  messages_per_second: number;
  average_processing_time_ms: number;
  pii_redactions_applied: number;
  errors_encountered: number;
  queue_size: number;
  worker_status: 'healthy' | 'degraded' | 'unhealthy';
}

export class StreamingIngestWorker extends EventEmitter {
  private static instance: StreamingIngestWorker;
  private redis: Redis;
  private streamKey = 'investigation:events';
  private consumerGroup = 'ingest-workers';
  private consumerName = `worker-${crypto.randomUUID()}`;
  private processing: boolean = false;
  private batchSize: number = 100;
  private metrics: WorkerMetrics;
  private provenanceService: ProvenanceLedgerService;
  private piiConfig: PIIRedactionConfig;
  private alertingEngine: AlertingEngine;

  public static getInstance(): StreamingIngestWorker {
    if (!StreamingIngestWorker.instance) {
      StreamingIngestWorker.instance = new StreamingIngestWorker();
    }
    return StreamingIngestWorker.instance;
  }

  constructor() {
    super();
    this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    });
    this.provenanceService = ProvenanceLedgerService.getInstance();
    this.alertingEngine = new AlertingEngine();
    this.initializeMetrics();
    this.initializePIIRedaction();
    this.initializeStream();
    this.startStreamConsumer();
  }

  private async initializeStream() {
      try {
          // Create consumer group if it doesn't exist
          await this.redis.xgroup('CREATE', this.streamKey, this.consumerGroup, '$', 'MKSTREAM');
      } catch (err: any) {
          if (!err.message.includes('BUSYGROUP')) {
              logger.error({ err }, 'Failed to create Redis consumer group');
          }
      }
  }

  private initializeMetrics(): void {
    this.metrics = {
      messages_processed: 0,
      messages_per_second: 0,
      average_processing_time_ms: 0,
      pii_redactions_applied: 0,
      errors_encountered: 0,
      queue_size: 0,
      worker_status: 'healthy',
    };

    // Update metrics every 10 seconds
    setInterval(() => {
      this.updateMetrics();
    }, 10000);
  }

  // Committee requirement: PII redaction configuration
  private initializePIIRedaction(): void {
    this.piiConfig = {
      enabled: process.env.PII_REDACTION_ENABLED !== 'false',
      replacement_token: '[REDACTED]',
      log_redactions: process.env.LOG_PII_REDACTIONS === 'true',
      redaction_patterns: {
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        phone: /\b\d{3}-\d{3}-\d{4}\b|\(\d{3}\)\s*\d{3}-\d{4}/g,
        credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
        license_plate: /\b[A-Z]{2,3}[-\s]?\d{3,4}[-\s]?[A-Z]?\b/g,
        bank_account: /\b\d{8,17}\b/g,
        coordinates: /\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/g,
        api_key: /\b[A-Za-z0-9]{32,}\b/g,
      },
    };
  }

  // Main ingest endpoint - Pushes to Redis Stream
  async ingestMessage(
    message: Omit<IngestMessage, 'message_id'>,
  ): Promise<string> {
    const messageId = crypto.randomUUID();
    const fullMessage: IngestMessage = {
      message_id: messageId,
      ...message,
    };

    try {
        await this.redis.xadd(
            this.streamKey,
            '*',
            'data',
            JSON.stringify(fullMessage)
        );

        logger.debug({
            message: 'Message added to ingest stream',
            message_id: messageId,
            source: message.source,
        });

        return messageId;
    } catch (error) {
        logger.error({
            message: 'Failed to add message to ingest stream',
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
  }

  // Stream Consumer
  private startStreamConsumer(): void {
      // Loop indefinitely to consume messages
      const consume = async () => {
          if (this.processing) return; // simple lock
          this.processing = true;

          try {
              // Read from consumer group
              const result = await this.redis.xreadgroup(
                  'GROUP',
                  this.consumerGroup,
                  this.consumerName,
                  'COUNT',
                  this.batchSize,
                  'BLOCK',
                  5000, // 5s block
                  'STREAMS',
                  this.streamKey,
                  '>' // New messages
              );

              if (result) {
                  // result format: [[streamName, [[id, [field, value, ...]], ...]]]
                  const streamData = result[0][1];
                  await this.processStreamBatch(streamData);
              }
          } catch (error) {
              logger.error({
                  message: 'Error consuming stream',
                  error: error instanceof Error ? error.message : String(error),
              });
              // Backoff slightly on error
              await new Promise(resolve => setTimeout(resolve, 1000));
          } finally {
              this.processing = false;
              // Schedule next consumption immediately
              setImmediate(consume);
          }
      };

      // Start the loop
      consume();
  }

  private async processStreamBatch(streamData: any[]): Promise<void> {
    const batchStartTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    for (const [streamId, fields] of streamData) {
        // fields is usually [key1, val1, key2, val2]. We stored 'data' as JSON.
        // ioredis might parse this differently depending on version/config, but typically it's an array.
        // Assuming we stored 'data' -> JSON string.
        let rawJson: string | null = null;
        for (let i = 0; i < fields.length; i += 2) {
            if (fields[i] === 'data') {
                rawJson = fields[i + 1];
                break;
            }
        }

        if (!rawJson) {
            logger.warn({ message: 'Malformed stream message', streamId });
            await this.redis.xack(this.streamKey, this.consumerGroup, streamId); // Ack to skip
            continue;
        }

        try {
            const message: IngestMessage = JSON.parse(rawJson);
            await this.processMessage(message);
            await this.redis.xack(this.streamKey, this.consumerGroup, streamId);
            successCount++;
        } catch (error) {
            errorCount++;
            logger.error({
                message: 'Failed to process stream message',
                streamId,
                error: error instanceof Error ? error.message : String(error),
            });
            // We do NOT Ack here, so it can be picked up by PEL monitoring (not implemented yet)
            // or we could implement a retry counter/Dead Letter Queue here.
            // For now, let's leave it un-acked.
        }
    }

    const batchProcessingTime = Date.now() - batchStartTime;
    this.metrics.messages_processed += successCount;
    this.metrics.errors_encountered += errorCount;

    if (successCount > 0 || errorCount > 0) {
        logger.info({
            message: 'Stream batch processed',
            count: successCount + errorCount,
            success: successCount,
            error: errorCount,
            time_ms: batchProcessingTime
        });
    }

    this.updateWorkerStatus(errorCount, successCount + errorCount);
  }

  // Individual message processing
  private async processMessage(
    message: IngestMessage,
  ): Promise<ProcessedMessage> {
    const processingStartTime = Date.now();
    const traceId = crypto.randomUUID();

    try {
      // Step 1: PII redaction (Committee requirement)
      const redactionResult = await this.applyPIIRedaction(message.raw_data);

      // Step 2: Data validation and normalization
      const normalizedData = await this.normalizeData(
        redactionResult.processed_data,
        message.data_type,
      );

      // Step 3: Confidence scoring
      const confidence = this.calculateConfidence(normalizedData, message);

      const processingTime = Date.now() - processingStartTime;

      const processedMessage: ProcessedMessage = {
        message_id: message.message_id,
        source: message.source,
        timestamp: new Date(message.timestamp), // Ensure date object
        data_type: message.data_type,
        processed_data: normalizedData,
        redaction_applied: redactionResult.redaction_applied,
        pii_fields_removed: redactionResult.pii_fields_removed,
        processing_time_ms: processingTime,
        confidence,
        metadata: {
          ...message.metadata,
          processing_trace_id: traceId,
          correlation_id: message.correlation_id,
          priority: message.priority,
        },
      };

      // Committee requirement: Analytics tracing
      await insertAnalyticsTrace({
        trace_id: traceId,
        operation_type: 'streaming_ingest_processing',
        duration_ms: processingTime,
        input_hash: this.hashMessage(message),
        output_hash: this.hashMessage(processedMessage),
        performance_metrics: {
          pii_redaction_applied: redactionResult.redaction_applied,
          confidence_score: confidence,
          data_type: message.data_type,
          source: message.source,
        },
      });

      // Step 4: Real-time Aggregation
      await this.aggregateMetrics(processedMessage);

      await this.handleProcessedMessage(processedMessage);
      return processedMessage;
    } catch (error) {
      logger.error({
        message: 'Individual message processing failed',
        message_id: message.message_id,
        error: error instanceof Error ? error.message : String(error),
        trace_id: traceId,
      });

      throw error;
    }
  }

  // Committee requirement: PII redaction implementation
  private async applyPIIRedaction(data: any): Promise<{
    processed_data: any;
    redaction_applied: boolean;
    pii_fields_removed: string[];
  }> {
    if (!this.piiConfig.enabled) {
      return {
        processed_data: data,
        redaction_applied: false,
        pii_fields_removed: [],
      };
    }

    const piiFieldsRemoved: string[] = [];
    let redactionApplied = false;

    const processObject = (obj: any, path = ''): any => {
      if (typeof obj === 'string') {
        let processedString = obj;

        for (const [patternName, pattern] of Object.entries(
          this.piiConfig.redaction_patterns,
        )) {
          if (pattern.test(processedString)) {
            processedString = processedString.replace(
              pattern,
              this.piiConfig.replacement_token,
            );
            piiFieldsRemoved.push(`${path}.${patternName}`);
            redactionApplied = true;
          }
        }

        return processedString;
      }

      if (Array.isArray(obj)) {
        return obj.map((item, index) =>
          processObject(item, `${path}[${index}]`),
        );
      }

      if (obj && typeof obj === 'object') {
        const processed: any = {};

        for (const [key, value] of Object.entries(obj)) {
          processed[key] = processObject(value, path ? `${path}.${key}` : key);
        }

        return processed;
      }

      return obj;
    };

    const processedData = processObject(data);

    if (redactionApplied && this.piiConfig.log_redactions) {
      logger.info({
        message: 'PII redaction applied',
        fields_redacted: piiFieldsRemoved.length,
        patterns_matched: [
          ...new Set(piiFieldsRemoved.map((f) => f.split('.').pop())),
        ],
      });

      this.metrics.pii_redactions_applied++;
    }

    return {
      processed_data: processedData,
      redaction_applied: redactionApplied,
      pii_fields_removed: piiFieldsRemoved,
    };
  }

  // Data normalization
  private async normalizeData(data: any, dataType: string): Promise<any> {
    switch (dataType) {
      case 'event':
        return this.normalizeEventData(data);
      case 'entity':
        return this.normalizeEntityData(data);
      case 'relationship':
        return this.normalizeRelationshipData(data);
      case 'document':
        return this.normalizeDocumentData(data);
      default:
        return data;
    }
  }

  private normalizeEventData(data: any): any {
    return {
      event_id: data.id || crypto.randomUUID(),
      event_type: data.type || 'unknown',
      timestamp: new Date(data.timestamp || Date.now()),
      source: data.source || 'unknown',
      severity: data.severity || 'INFO',
      description: data.description || '',
      metadata: data.metadata || {},
    };
  }

  private normalizeEntityData(data: any): any {
    return {
      entity_id: data.id || crypto.randomUUID(),
      entity_type: data.type || 'unknown',
      properties: data.properties || {},
      confidence: Math.min(Math.max(data.confidence || 0.5, 0), 1),
      source: data.source || 'unknown',
      created_at: new Date(data.created_at || Date.now()),
    };
  }

  private normalizeRelationshipData(data: any): any {
    return {
      relationship_id: data.id || crypto.randomUUID(),
      source_entity: data.source || data.from,
      target_entity: data.target || data.to,
      relationship_type: data.type || 'unknown',
      properties: data.properties || {},
      confidence: Math.min(Math.max(data.confidence || 0.5, 0), 1),
      created_at: new Date(data.created_at || Date.now()),
    };
  }

  private normalizeDocumentData(data: any): any {
    return {
      document_id: data.id || crypto.randomUUID(),
      title: data.title || 'Untitled',
      content: data.content || '',
      document_type: data.type || 'unknown',
      metadata: data.metadata || {},
      source: data.source || 'unknown',
      processed_at: new Date(),
    };
  }

  // Confidence calculation
  private calculateConfidence(
    data: any,
    originalMessage: IngestMessage,
  ): number {
    let confidence = 0.5; // Base confidence

    // Source reliability
    const sourceReliability = this.getSourceReliability(originalMessage.source);
    confidence += sourceReliability * 0.3;

    // Data completeness
    const completeness = this.calculateDataCompleteness(data);
    confidence += completeness * 0.2;

    // Priority boost
    if (originalMessage.priority > 5) {
      confidence += 0.1;
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  private getSourceReliability(source: string): number {
    const reliabilityMap: Record<string, number> = {
      official_feed: 0.9,
      verified_api: 0.8,
      internal_system: 0.7,
      third_party_api: 0.6,
      user_input: 0.4,
      unknown: 0.3,
    };

    return reliabilityMap[source] || 0.3;
  }

  private calculateDataCompleteness(data: any): number {
    if (!data || typeof data !== 'object') {
      return 0.2;
    }

    const fields = Object.keys(data);
    const nonEmptyFields = fields.filter((field) => {
      const value = data[field];
      return value !== null && value !== undefined && value !== '';
    });

    return nonEmptyFields.length / Math.max(fields.length, 1);
  }

  // Handle processed messages
  private async handleProcessedMessage(
    processed: ProcessedMessage,
  ): Promise<void> {
    try {
      // Store as TimescaleDB event
      await insertEvent({
        event_type: 'INGESTED_DATA',
        event_source: processed.source,
        entity_id: processed.message_id,
        entity_type: processed.data_type,
        metadata: {
          processed_message: processed,
          pii_redaction_applied: processed.redaction_applied,
          processing_time_ms: processed.processing_time_ms,
        },
        confidence: processed.confidence,
        severity: processed.processing_time_ms > 1000 ? 'WARNING' : 'INFO',
      });

      // Create provenance record
      await this.provenanceService.recordProvenanceEntry({
        operation_type: 'STREAMING_INGEST',
        actor_id: 'streaming-worker',
        metadata: {
          message_id: processed.message_id,
          source: processed.source,
          data_type: processed.data_type,
          processing_time_ms: processed.processing_time_ms,
          pii_redaction: processed.redaction_applied,
        },
      });

      // Emit success event
      this.emit('message_processed', processed);
    } catch (error) {
      logger.error({
        message: 'Failed to handle processed message',
        message_id: processed.message_id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  // Real-time Aggregation
  private async aggregateMetrics(processed: ProcessedMessage): Promise<void> {
    try {
      const { metadata, message_id } = processed;
      // We assume metadata contains investigationId or we extract it from processed_data if available
      // For now, let's look for it in metadata
      const investigationId = metadata.investigation_id || metadata.investigationId;

      if (!investigationId) return;

      const pipeline = this.redis.pipeline();
      const tenantId = metadata.tenant_id || 'default';

      // 1. Case Velocity (events per minute)
      // Key: investigation:{id}:velocity:{minute_timestamp}
      const minute = Math.floor(Date.now() / 60000);
      const velocityKey = `investigation:${investigationId}:velocity:${minute}`;
      pipeline.incr(velocityKey);
      pipeline.expire(velocityKey, 3600); // Keep for 1 hour

      // 2. Evidence Accumulation (distinct count)
      if (processed.data_type === 'evidence') {
         const evidenceKey = `investigation:${investigationId}:evidence`;
         pipeline.pfadd(evidenceKey, message_id); // HyperLogLog for distinct count
      }

      // 3. Entity Discovery Rate
      if (processed.data_type === 'entity') {
          const entityRateKey = `investigation:${investigationId}:entity_rate:${minute}`;
          pipeline.incr(entityRateKey);
          pipeline.expire(entityRateKey, 3600);
      }

      await pipeline.exec();

      const velocity = parseInt((await this.redis.get(velocityKey)) || '0', 10);
      const metrics = {
          velocity,
          confidence: processed.confidence, // Use current message confidence as a proxy or average if tracked
          // Add other metrics as needed
      };

      // Check Alerts
      const alerts = this.alertingEngine.checkAlerts({
          investigationId,
          tenantId,
          metrics,
          event: processed
      });

      if (alerts.length > 0) {
          const alertChannel = `maestro:${tenantId}.alerts`;
          for (const alert of alerts) {
              await this.redis.publish(alertChannel, JSON.stringify({
                  type: 'alert',
                  ...alert
              }));

              logger.info({
                  message: 'Alert triggered',
                  alert,
                  investigationId
              });
          }
      }

      // Publish update to WebSocketCore via Redis Pub/Sub
      // Topic format: maestro:tenantId.dashboard:metrics
      const channel = `maestro:${tenantId}.dashboard:metrics`;
      const updatePayload = {
          type: 'metrics_update',
          investigationId,
          timestamp: Date.now(),
          metrics: {
             velocity,
             // For a real dashboard, we might want the last N minutes.
             // But for real-time push, sending the current minute's count is a good start "pulse".
          }
      };

      await this.redis.publish(channel, JSON.stringify(updatePayload));

    } catch (error) {
        logger.error({
            message: 'Failed to aggregate metrics',
            error: error instanceof Error ? error.message : String(error)
        });
    }
  }

  // Utility methods
  private hashMessage(message: any): string {
    const normalized = {
      id: message.message_id,
      source: message.source,
      data_type: message.data_type,
      timestamp: message.timestamp,
    };

    return crypto
      .createHash('md5')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  private updateMetrics(): void {
    // Update messages per second
    const now = Date.now();
    if (this.metrics.messages_processed > 0) {
      // Simplified calculation - would maintain time windows for accuracy
      this.metrics.messages_per_second = Math.round(
        this.metrics.messages_processed / 60,
      );
    }

    // Queue size is now stream lag, effectively.
    // We can't easily get total lag without extra calls, so we'll approximate or skip for now
    // Or we could use XINFO STREAM.
    if (this.redis && typeof this.redis.xlen === 'function') {
        const xlenPromise = this.redis.xlen(this.streamKey);
        if (xlenPromise && typeof xlenPromise.then === 'function') {
           xlenPromise.then((len: number) => {
               this.metrics.queue_size = len;
           }).catch(() => {});
        }
    }


    // Update worker status
    if (this.metrics.errors_encountered > 10) {
      this.metrics.worker_status = 'unhealthy';
    } else if (
      this.metrics.errors_encountered > 5 ||
      this.metrics.queue_size > 500
    ) {
      this.metrics.worker_status = 'degraded';
    } else {
      this.metrics.worker_status = 'healthy';
    }
  }

  private updateWorkerStatus(errorCount: number, batchSize: number): void {
      if (batchSize === 0) return;
    const errorRate = errorCount / batchSize;

    if (errorRate > 0.2) {
      this.metrics.worker_status = 'unhealthy';
    } else if (errorRate > 0.1) {
      this.metrics.worker_status = 'degraded';
    } else {
      this.metrics.worker_status = 'healthy';
    }
  }

  // Public API methods
  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  getQueueSize(): number {
    return this.metrics.queue_size;
  }

  async getInvestigationMetrics(investigationId: string): Promise<any> {
      const minute = Math.floor(Date.now() / 60000);
      const velocityKey = `investigation:${investigationId}:velocity:${minute}`;
      const velocity = parseInt((await this.redis.get(velocityKey)) || '0', 10);
      const evidenceCount = await this.redis.pfcount(`investigation:${investigationId}:evidence`);

      // Handle the case where Redis returns undefined or null (e.g. mocked in tests)
      return {
          velocity: isNaN(velocity) ? 0 : velocity,
          evidenceCount: evidenceCount || 0
      };
  }

  async clearQueue(): Promise<void> {
    const queueSize = this.metrics.queue_size;
    await this.redis.xtrim(this.streamKey, 'MAXLEN', 0);
    this.metrics.queue_size = 0;

    logger.info({
      message: 'Ingest queue cleared',
      messages_cleared: queueSize,
    });

    this.emit('queue_cleared', { messages_cleared: queueSize });
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    logger.info({
      message: 'Streaming ingest worker shutting down',
    });

    this.processing = false; // Stop the consumer loop
    this.removeAllListeners();

    logger.info({ message: 'Streaming ingest worker shutdown complete' });
  }
}

export default StreamingIngestWorker;
