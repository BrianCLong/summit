/**
 * Base Adapter Implementation
 *
 * Provides common functionality for all ingest adapters including
 * backpressure control, retry logic, checkpointing, and telemetry.
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import pino from 'pino';
import type {
  IngestAdapter,
  AdapterConfig,
  SourceType,
  IngestEnvelope,
  Checkpoint,
  BackpressureMetrics,
  AdapterEvents,
  RecordHandler,
  BatchHandler,
  ErrorHandler,
  DLQReasonCode,
  DLQRecord,
  RetryConfig,
} from '../types/index.js';
import { BackpressureController } from '../lib/backpressure.js';
import { retry, isRetryableError, classifyError, DEFAULT_RETRY_CONFIG } from '../lib/retry.js';
import { computeDedupeKeyFromEnvelope, validateDedupeKey } from '../lib/dedupe.js';

const tracer = trace.getTracer('@intelgraph/ingest-adapters');

export interface BaseAdapterOptions {
  config: AdapterConfig;
  events?: AdapterEvents;
  logger?: pino.Logger;
  checkpointStore?: CheckpointStore;
  dlqStore?: DLQStore;
}

export interface CheckpointStore {
  get(tenantId: string, source: string): Promise<Checkpoint | null>;
  set(checkpoint: Checkpoint): Promise<void>;
  delete(tenantId: string, source: string): Promise<void>;
}

export interface DLQStore {
  add(record: DLQRecord): Promise<void>;
  get(id: string): Promise<DLQRecord | null>;
  list(tenantId: string, options?: { limit?: number; offset?: number }): Promise<DLQRecord[]>;
  redrive(id: string): Promise<IngestEnvelope | null>;
  delete(id: string): Promise<void>;
}

export abstract class BaseAdapter extends EventEmitter implements IngestAdapter {
  readonly name: string;
  readonly sourceType: SourceType;
  readonly config: AdapterConfig;

  protected logger: pino.Logger;
  protected backpressure: BackpressureController;
  protected checkpointStore?: CheckpointStore;
  protected dlqStore?: DLQStore;
  protected retryConfig: RetryConfig;
  protected running = false;
  protected initialized = false;

  private recordHandler?: RecordHandler;
  private batchHandler?: BatchHandler;
  private errorHandler?: ErrorHandler;
  private recordsProcessed = 0;
  private recordsFailed = 0;
  private lastCheckpointTime = 0;
  private checkpointIntervalMs = 10000; // 10 seconds

  constructor(options: BaseAdapterOptions) {
    super();
    this.config = options.config;
    this.name = options.config.name;
    this.sourceType = options.config.source_type;
    this.checkpointStore = options.checkpointStore;
    this.dlqStore = options.dlqStore;

    this.logger = options.logger ?? pino({
      name: `ingest-adapter:${this.name}`,
      level: process.env.LOG_LEVEL ?? 'info',
    });

    this.backpressure = new BackpressureController(
      options.config.backpressure ?? {
        max_concurrency: 10,
        rate_limit_rps: 1000,
        high_water_mark: 10000,
        low_water_mark: 1000,
      }
    );

    this.retryConfig = options.config.retry ?? DEFAULT_RETRY_CONFIG;

    // Wire up events
    if (options.events) {
      this.recordHandler = options.events.onRecord;
      this.batchHandler = options.events.onBatch;
      this.errorHandler = options.events.onError;

      if (options.events.onBackpressure) {
        this.backpressure.on('stateChange', (state, metrics) => {
          options.events!.onBackpressure!(metrics);
        });
      }

      if (options.events.onCheckpoint) {
        this.on('checkpoint', options.events.onCheckpoint);
      }
    }

    // Forward backpressure events
    this.backpressure.on('stateChange', (state, metrics) => {
      this.emit('backpressure', state, metrics);
      this.logger.info({ state, metrics }, 'Backpressure state changed');
    });

    this.backpressure.on('throttle', (waitMs) => {
      this.logger.debug({ waitMs }, 'Throttling');
    });

    this.backpressure.on('drop', (reason) => {
      this.logger.warn({ reason }, 'Record dropped due to backpressure');
    });
  }

  // -------------------------------------------------------------------------
  // Abstract Methods (to be implemented by concrete adapters)
  // -------------------------------------------------------------------------

  protected abstract doInitialize(): Promise<void>;
  protected abstract doStart(): Promise<void>;
  protected abstract doStop(): Promise<void>;
  protected abstract doHealthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }>;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    return tracer.startActiveSpan('adapter.initialize', async (span) => {
      try {
        span.setAttribute('adapter.name', this.name);
        span.setAttribute('adapter.source_type', this.sourceType);

        await this.doInitialize();
        this.initialized = true;

        this.logger.info('Adapter initialized');
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.running) {
      this.logger.warn('Adapter already running');
      return;
    }

    return tracer.startActiveSpan('adapter.start', async (span) => {
      try {
        span.setAttribute('adapter.name', this.name);

        this.running = true;
        await this.doStart();

        this.logger.info('Adapter started');
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        this.running = false;
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    return tracer.startActiveSpan('adapter.stop', async (span) => {
      try {
        span.setAttribute('adapter.name', this.name);

        this.running = false;
        await this.doStop();

        // Final checkpoint
        await this.maybeCheckpoint(true);

        this.logger.info({
          recordsProcessed: this.recordsProcessed,
          recordsFailed: this.recordsFailed,
        }, 'Adapter stopped');

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async drain(): Promise<void> {
    this.backpressure.enableDrain();
    this.logger.info('Drain mode enabled');

    // Wait for in-flight work to complete
    while (this.backpressure.getMetrics().concurrency_used > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await this.stop();
  }

  getBackpressureState(): BackpressureMetrics {
    return this.backpressure.getMetrics();
  }

  async getCheckpoint(): Promise<Checkpoint | null> {
    if (!this.checkpointStore) {
      return null;
    }
    return this.checkpointStore.get(this.config.tenant_id, this.getSourceIdentifier());
  }

  async setCheckpoint(checkpoint: Checkpoint): Promise<void> {
    if (!this.checkpointStore) {
      throw new Error('No checkpoint store configured');
    }
    await this.checkpointStore.set(checkpoint);
    this.emit('checkpoint', checkpoint);
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    const baseHealth = {
      initialized: this.initialized,
      running: this.running,
      backpressure: this.backpressure.getMetrics(),
      recordsProcessed: this.recordsProcessed,
      recordsFailed: this.recordsFailed,
    };

    try {
      const adapterHealth = await this.doHealthCheck();
      return {
        healthy: adapterHealth.healthy && this.initialized,
        details: {
          ...baseHealth,
          ...adapterHealth.details,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          ...baseHealth,
          error: String(error),
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // Protected Methods (for use by concrete adapters)
  // -------------------------------------------------------------------------

  /**
   * Process a single record with backpressure, retry, and telemetry.
   */
  protected async processRecord(
    envelope: IngestEnvelope,
    parentSpan?: Span
  ): Promise<void> {
    const spanContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active();

    return tracer.startActiveSpan(
      'ingest.process_record',
      { attributes: { 'tenant.id': envelope.tenant_id, 'entity.type': envelope.entity.type } },
      spanContext,
      async (span) => {
        try {
          span.setAttribute('entity.id', envelope.entity.id);
          span.setAttribute('revision', envelope.revision.number);
          span.setAttribute('dedupe_key', envelope.dedupe_key);

          // Validate dedupe key
          if (!validateDedupeKey(envelope)) {
            throw new Error('Invalid dedupe_key');
          }

          // Acquire backpressure slot
          const priority = envelope.metadata?.priority ?? 50;
          const { acquired, waitMs } = await this.backpressure.acquire(priority);

          if (!acquired) {
            if (waitMs && waitMs > 0) {
              span.addEvent('backpressure_wait', { waitMs });
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              // Try again after wait
              const retryAcquire = await this.backpressure.acquire(priority);
              if (!retryAcquire.acquired) {
                throw new Error('Failed to acquire backpressure slot after wait');
              }
            } else {
              // Dropped due to brownout or drain
              span.addEvent('record_dropped');
              return;
            }
          }

          try {
            // Process with retry
            const result = await retry(
              async () => {
                if (this.recordHandler) {
                  await this.recordHandler(envelope);
                }
              },
              this.retryConfig,
              (error) => isRetryableError(error)
            );

            if (!result.success) {
              throw result.error;
            }

            this.recordsProcessed++;
            span.addEvent('record_processed');
            span.setStatus({ code: SpanStatusCode.OK });
          } finally {
            this.backpressure.release();
          }

          // Maybe checkpoint
          await this.maybeCheckpoint();
        } catch (error) {
          this.recordsFailed++;
          span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
          span.recordException(error as Error);

          // Send to DLQ
          await this.sendToDLQ(envelope, error as Error);

          // Call error handler
          if (this.errorHandler) {
            await this.errorHandler(error as Error, envelope);
          }
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Process a batch of records.
   */
  protected async processBatch(envelopes: IngestEnvelope[]): Promise<void> {
    return tracer.startActiveSpan('ingest.process_batch', async (span) => {
      try {
        span.setAttribute('batch.size', envelopes.length);

        if (this.batchHandler) {
          await this.batchHandler(envelopes);
          this.recordsProcessed += envelopes.length;
        } else {
          // Process individually
          for (const envelope of envelopes) {
            await this.processRecord(envelope, span);
          }
        }

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Create an envelope from raw data.
   */
  protected createEnvelope(
    data: Record<string, unknown>,
    entityType: string,
    entityId: string,
    revision: number,
    source: string
  ): IngestEnvelope {
    const now = new Date().toISOString();
    const envelope: Omit<IngestEnvelope, 'dedupe_key'> = {
      event_id: randomUUID(),
      event_type: `ingest.${entityType.toLowerCase()}.v1`,
      event_version: 'v1',
      occurred_at: now,
      recorded_at: now,
      tenant_id: this.config.tenant_id,
      subject_id: null,
      source_service: `ingest-adapter-${this.sourceType}`,
      trace_id: null,
      span_id: null,
      correlation_id: null,
      region: null,
      ingest: {
        source,
        source_type: this.sourceType,
        format: 'json',
      },
      entity: {
        type: entityType,
        id: entityId,
      },
      revision: {
        number: revision,
        timestamp: now,
      },
      schema_version: '1.0.0',
      data,
    };

    return {
      ...envelope,
      dedupe_key: computeDedupeKeyFromEnvelope(envelope),
    };
  }

  /**
   * Send a failed record to the DLQ.
   */
  protected async sendToDLQ(envelope: IngestEnvelope, error: Error): Promise<void> {
    if (!this.dlqStore) {
      this.logger.warn({ error: error.message }, 'No DLQ store configured, record lost');
      return;
    }

    const dlqRecord: DLQRecord = {
      id: randomUUID(),
      envelope,
      reason_code: classifyError(error),
      error_message: error.message,
      error_stack: error.stack,
      retry_count: 0,
      first_failed_at: new Date().toISOString(),
      last_failed_at: new Date().toISOString(),
      can_redrive: isRetryableError(error),
    };

    await this.dlqStore.add(dlqRecord);
    this.logger.warn(
      { dlqId: dlqRecord.id, reason: dlqRecord.reason_code, entityId: envelope.entity.id },
      'Record sent to DLQ'
    );
  }

  /**
   * Get a unique identifier for this source (for checkpointing).
   */
  protected abstract getSourceIdentifier(): string;

  /**
   * Create a checkpoint from current state.
   */
  protected abstract createCheckpoint(position: string): Checkpoint;

  /**
   * Maybe save checkpoint if interval has elapsed.
   */
  private async maybeCheckpoint(force = false): Promise<void> {
    if (!this.checkpointStore) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastCheckpointTime < this.checkpointIntervalMs) {
      return;
    }

    this.lastCheckpointTime = now;
    // Concrete adapters should call setCheckpoint with their position
  }
}
