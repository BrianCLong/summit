// IntelGraph Autonomous Orchestrator - Outbox Pattern Processor
// Implements reliable event processing with retry logic and dead letter queues
// Version: 1.0.0

import { Pool, PoolClient } from 'pg';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface OutboxEvent {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  event_data: Record<string, any>;
  correlation_id?: string;
  trace_id?: string;
  created_at: Date;
  processed_at?: Date;
  retry_count: number;
  max_retries: number;
  next_retry_at?: Date;
  error_details?: string;
  partition_key?: string;
}

interface EventHandler {
  eventType: string;
  handler: (event: OutboxEvent) => Promise<void>;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface OutboxProcessorConfig {
  batchSize?: number;
  processingIntervalMs?: number;
  maxRetries?: number;
  initialRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  enableDeadLetterQueue?: boolean;
  deadLetterTopicPrefix?: string;
  enableDistributedLocking?: boolean;
  lockTimeoutMs?: number;
}

export class OutboxProcessor extends EventEmitter {
  private pool: Pool;
  private redis: Redis;
  private config: Required<OutboxProcessorConfig>;
  private handlers = new Map<string, EventHandler>();
  private isRunning = false;
  private processingTimer?: NodeJS.Timeout;
  private instanceId: string;

  constructor(pool: Pool, redis: Redis, config: OutboxProcessorConfig = {}) {
    super();
    this.pool = pool;
    this.redis = redis;
    this.instanceId = `outbox-processor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.config = {
      batchSize: config.batchSize || 50,
      processingIntervalMs: config.processingIntervalMs || 1000,
      maxRetries: config.maxRetries || 5,
      initialRetryDelayMs: config.initialRetryDelayMs || 1000,
      maxRetryDelayMs: config.maxRetryDelayMs || 60000,
      enableDeadLetterQueue: config.enableDeadLetterQueue ?? true,
      deadLetterTopicPrefix: config.deadLetterTopicPrefix || 'intelgraph.dlq',
      enableDistributedLocking: config.enableDistributedLocking ?? true,
      lockTimeoutMs: config.lockTimeoutMs || 30000,
    };

    logger.info('OutboxProcessor initialized', {
      instanceId: this.instanceId,
      config: this.config,
    });
  }

  /**
   * Register an event handler for specific event types
   */
  registerHandler(handler: EventHandler): void {
    this.handlers.set(handler.eventType, handler);
    logger.info('Event handler registered', {
      eventType: handler.eventType,
      maxRetries: handler.maxRetries || this.config.maxRetries,
    });
  }

  /**
   * Start the outbox processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('OutboxProcessor already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting OutboxProcessor', { instanceId: this.instanceId });

    // Start processing loop
    this.scheduleNextProcessing();

    // Setup graceful shutdown
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());

    this.emit('started');
  }

  /**
   * Stop the outbox processor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping OutboxProcessor', { instanceId: this.instanceId });
    this.isRunning = false;

    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }

    // Release any distributed locks
    if (this.config.enableDistributedLocking) {
      await this.releaseLock();
    }

    this.emit('stopped');
  }

  /**
   * Add event to outbox for processing
   */
  async publishEvent(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    eventData: Record<string, any>,
    options: {
      correlationId?: string;
      traceId?: string;
      partitionKey?: string;
      maxRetries?: number;
    } = {},
  ): Promise<string> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO orchestration_outbox (
          aggregate_type, aggregate_id, event_type, event_data, 
          correlation_id, trace_id, partition_key, max_retries
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          aggregateType,
          aggregateId,
          eventType,
          JSON.stringify(eventData),
          options.correlationId,
          options.traceId,
          options.partitionKey || aggregateId,
          options.maxRetries || this.config.maxRetries,
        ],
      );

      await client.query('COMMIT');

      const eventId = result.rows[0].id;

      logger.debug('Event published to outbox', {
        eventId,
        aggregateType,
        aggregateId,
        eventType,
        correlationId: options.correlationId,
      });

      // Record metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'outbox_event_published',
        true,
        { event_type: eventType, aggregate_type: aggregateType },
      );

      return eventId;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to publish event to outbox', {
        error: error.message,
        aggregateType,
        aggregateId,
        eventType,
      });

      prometheusConductorMetrics.recordOperationalEvent(
        'outbox_publish_error',
        false,
        { event_type: eventType, error_type: error.name },
      );

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process pending events from outbox
   */
  private async processEvents(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const processingStartTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;

    try {
      // Acquire distributed lock if enabled
      if (this.config.enableDistributedLocking) {
        const lockAcquired = await this.acquireLock();
        if (!lockAcquired) {
          logger.debug('Could not acquire processing lock, skipping batch');
          return;
        }
      }

      // Fetch batch of events to process
      const events = await this.fetchPendingEvents();

      if (events.length === 0) {
        return;
      }

      logger.debug('Processing outbox events batch', {
        batchSize: events.length,
        instanceId: this.instanceId,
      });

      // Process events concurrently with controlled parallelism
      const results = await Promise.allSettled(
        events.map((event) => this.processEvent(event)),
      );

      // Count results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processedCount++;
        } else {
          errorCount++;
          logger.error('Event processing failed', {
            eventId: events[index].id,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      // Record batch metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'outbox_batch_processed',
        processedCount,
        { instance_id: this.instanceId },
      );

      if (errorCount > 0) {
        prometheusConductorMetrics.recordOperationalMetric(
          'outbox_batch_errors',
          errorCount,
          { instance_id: this.instanceId },
        );
      }
    } catch (error) {
      logger.error('Error in outbox processing batch', {
        error: error.message,
        instanceId: this.instanceId,
      });

      prometheusConductorMetrics.recordOperationalEvent(
        'outbox_batch_error',
        false,
        { error_type: error.name },
      );
    } finally {
      // Release distributed lock
      if (this.config.enableDistributedLocking) {
        await this.releaseLock();
      }

      // Record processing metrics
      const processingTime = Date.now() - processingStartTime;
      prometheusConductorMetrics.recordOperationalMetric(
        'outbox_processing_duration_ms',
        processingTime,
        { instance_id: this.instanceId },
      );

      logger.debug('Outbox batch processing completed', {
        processedCount,
        errorCount,
        processingTimeMs: processingTime,
        instanceId: this.instanceId,
      });
    }
  }

  /**
   * Fetch pending events from outbox
   */
  private async fetchPendingEvents(): Promise<OutboxEvent[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT id, aggregate_type, aggregate_id, event_type, event_data,
                correlation_id, trace_id, created_at, processed_at, retry_count,
                max_retries, next_retry_at, error_details, partition_key
         FROM orchestration_outbox
         WHERE processed_at IS NULL
           AND (next_retry_at IS NULL OR next_retry_at <= NOW())
         ORDER BY created_at ASC
         LIMIT $1`,
        [this.config.batchSize],
      );

      return result.rows.map((row) => ({
        ...row,
        event_data:
          typeof row.event_data === 'string'
            ? JSON.parse(row.event_data)
            : row.event_data,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: OutboxEvent): Promise<void> {
    const handler = this.handlers.get(event.event_type);

    if (!handler) {
      logger.warn('No handler registered for event type', {
        eventType: event.event_type,
        eventId: event.id,
      });

      await this.markEventAsDeadLetter(event, 'No handler registered');
      return;
    }

    const client = await this.pool.connect();

    try {
      // Mark event as being processed
      await client.query(
        'UPDATE orchestration_outbox SET retry_count = retry_count + 1 WHERE id = $1',
        [event.id],
      );

      // Process the event
      await handler.handler(event);

      // Mark as processed
      await client.query(
        'UPDATE orchestration_outbox SET processed_at = NOW() WHERE id = $1',
        [event.id],
      );

      logger.debug('Event processed successfully', {
        eventId: event.id,
        eventType: event.event_type,
        retryCount: event.retry_count + 1,
      });

      // Record success metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'outbox_event_processed',
        true,
        { event_type: event.event_type },
      );

      this.emit('eventProcessed', event);
    } catch (error) {
      await this.handleProcessingError(client, event, error);
    } finally {
      client.release();
    }
  }

  /**
   * Handle processing errors with retry logic
   */
  private async handleProcessingError(
    client: PoolClient,
    event: OutboxEvent,
    error: Error,
  ): Promise<void> {
    const newRetryCount = event.retry_count + 1;
    const maxRetries = event.max_retries;

    logger.error('Event processing failed', {
      eventId: event.id,
      eventType: event.event_type,
      error: error.message,
      retryCount: newRetryCount,
      maxRetries,
    });

    // Record error metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'outbox_event_error',
      false,
      { event_type: event.event_type, error_type: error.name },
    );

    if (newRetryCount >= maxRetries) {
      // Max retries reached - send to dead letter queue
      await this.markEventAsDeadLetter(event, error.message);

      logger.error('Event moved to dead letter queue', {
        eventId: event.id,
        eventType: event.event_type,
        finalRetryCount: newRetryCount,
      });

      this.emit('eventDeadLettered', event, error);
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.min(
        this.config.initialRetryDelayMs * Math.pow(2, newRetryCount - 1),
        this.config.maxRetryDelayMs,
      );

      const nextRetryAt = new Date(Date.now() + retryDelay);

      await client.query(
        `UPDATE orchestration_outbox 
         SET error_details = $1, next_retry_at = $2 
         WHERE id = $3`,
        [error.message, nextRetryAt, event.id],
      );

      logger.info('Event scheduled for retry', {
        eventId: event.id,
        eventType: event.event_type,
        nextRetryAt,
        retryCount: newRetryCount,
      });

      this.emit('eventRetryScheduled', event, nextRetryAt);
    }
  }

  /**
   * Mark event as dead letter
   */
  private async markEventAsDeadLetter(
    event: OutboxEvent,
    reason: string,
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update event status
      await client.query(
        `UPDATE orchestration_outbox 
         SET processed_at = NOW(), error_details = $1 
         WHERE id = $2`,
        [`DEAD_LETTER: ${reason}`, event.id],
      );

      // Optionally publish to dead letter queue
      if (this.config.enableDeadLetterQueue) {
        const deadLetterTopic = `${this.config.deadLetterTopicPrefix}.${event.event_type}`;

        await this.redis.lpush(
          deadLetterTopic,
          JSON.stringify({
            ...event,
            deadLetterReason: reason,
            deadLetterTimestamp: new Date().toISOString(),
          }),
        );

        logger.info('Event published to dead letter queue', {
          eventId: event.id,
          eventType: event.event_type,
          deadLetterTopic,
          reason,
        });
      }

      await client.query('COMMIT');

      // Record dead letter metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'outbox_event_dead_lettered',
        false,
        { event_type: event.event_type, reason: reason.substring(0, 50) },
      );
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to mark event as dead letter', {
        eventId: event.id,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Acquire distributed processing lock
   */
  private async acquireLock(): Promise<boolean> {
    const lockKey = 'outbox_processor_lock';
    const lockValue = this.instanceId;

    try {
      const result = await this.redis.set(
        lockKey,
        lockValue,
        'PX',
        this.config.lockTimeoutMs,
        'NX',
      );

      return result === 'OK';
    } catch (error) {
      logger.error('Failed to acquire distributed lock', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Release distributed processing lock
   */
  private async releaseLock(): Promise<void> {
    const lockKey = 'outbox_processor_lock';
    const lockValue = this.instanceId;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      await this.redis.eval(script, 1, lockKey, lockValue);
    } catch (error) {
      logger.error('Failed to release distributed lock', {
        error: error.message,
      });
    }
  }

  /**
   * Schedule next processing cycle
   */
  private scheduleNextProcessing(): void {
    if (!this.isRunning) {
      return;
    }

    this.processingTimer = setTimeout(async () => {
      try {
        await this.processEvents();
      } catch (error) {
        logger.error('Unexpected error in processing cycle', {
          error: error.message,
          instanceId: this.instanceId,
        });
      }

      // Schedule next cycle
      this.scheduleNextProcessing();
    }, this.config.processingIntervalMs);
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<{
    pendingEvents: number;
    deadLetterEvents: number;
    retryingEvents: number;
    processingRate: number;
  }> {
    const client = await this.pool.connect();

    try {
      const [pendingResult, deadLetterResult, retryingResult] =
        await Promise.all([
          client.query(
            'SELECT COUNT(*) as count FROM orchestration_outbox WHERE processed_at IS NULL AND (next_retry_at IS NULL OR next_retry_at <= NOW())',
          ),
          client.query(
            "SELECT COUNT(*) as count FROM orchestration_outbox WHERE error_details LIKE 'DEAD_LETTER:%'",
          ),
          client.query(
            'SELECT COUNT(*) as count FROM orchestration_outbox WHERE processed_at IS NULL AND next_retry_at > NOW()',
          ),
        ]);

      return {
        pendingEvents: parseInt(pendingResult.rows[0].count),
        deadLetterEvents: parseInt(deadLetterResult.rows[0].count),
        retryingEvents: parseInt(retryingResult.rows[0].count),
        processingRate:
          this.config.batchSize / (this.config.processingIntervalMs / 1000),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Replay dead letter events
   */
  async replayDeadLetterEvents(
    eventType?: string,
    maxEvents: number = 100,
  ): Promise<number> {
    const client = await this.pool.connect();

    try {
      const whereClause = eventType
        ? "WHERE error_details LIKE 'DEAD_LETTER:%' AND event_type = $2"
        : "WHERE error_details LIKE 'DEAD_LETTER:%'";

      const params = eventType
        ? ['DEAD_LETTER:%', eventType, maxEvents]
        : ['DEAD_LETTER:%', maxEvents];

      const result = await client.query(
        `UPDATE orchestration_outbox 
         SET processed_at = NULL, error_details = NULL, retry_count = 0, next_retry_at = NULL
         ${whereClause}
         LIMIT $${params.length}`,
        params,
      );

      const replayedCount = result.rowCount || 0;

      logger.info('Dead letter events replayed', {
        count: replayedCount,
        eventType,
      });

      return replayedCount;
    } finally {
      client.release();
    }
  }

  /**
   * Clean up old processed events
   */
  async cleanupProcessedEvents(olderThanDays: number = 7): Promise<number> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `DELETE FROM orchestration_outbox 
         WHERE processed_at IS NOT NULL 
         AND processed_at < NOW() - INTERVAL '${olderThanDays} days'`,
      );

      const deletedCount = result.rowCount || 0;

      logger.info('Old processed events cleaned up', {
        deletedCount,
        olderThanDays,
      });

      return deletedCount;
    } finally {
      client.release();
    }
  }
}

// Event handler implementations for orchestration events
export const orchestrationEventHandlers: EventHandler[] = [
  {
    eventType: 'run.started',
    handler: async (event: OutboxEvent) => {
      logger.info('Orchestration run started', {
        runId: event.aggregate_id,
        correlationId: event.correlation_id,
        eventData: event.event_data,
      });

      // Could trigger webhooks, notifications, etc.
    },
  },

  {
    eventType: 'run.completed',
    handler: async (event: OutboxEvent) => {
      logger.info('Orchestration run completed', {
        runId: event.aggregate_id,
        correlationId: event.correlation_id,
        eventData: event.event_data,
      });

      // Update external systems, send notifications, etc.
    },
  },

  {
    eventType: 'run.failed',
    handler: async (event: OutboxEvent) => {
      logger.error('Orchestration run failed', {
        runId: event.aggregate_id,
        correlationId: event.correlation_id,
        error: event.event_data.error,
        eventData: event.event_data,
      });

      // Send failure notifications, trigger remediation, etc.
    },
  },

  {
    eventType: 'task.started',
    handler: async (event: OutboxEvent) => {
      logger.info('Orchestration task started', {
        taskId: event.aggregate_id,
        runId: event.event_data.run_id,
        taskType: event.event_data.type,
        correlationId: event.correlation_id,
      });
    },
  },

  {
    eventType: 'task.completed',
    handler: async (event: OutboxEvent) => {
      logger.info('Orchestration task completed', {
        taskId: event.aggregate_id,
        runId: event.event_data.run_id,
        taskType: event.event_data.type,
        correlationId: event.correlation_id,
        outcome: event.event_data.outcome,
      });
    },
  },

  {
    eventType: 'budget.threshold_reached',
    handler: async (event: OutboxEvent) => {
      logger.warn('Budget threshold reached', {
        runId: event.aggregate_id,
        currentSpend: event.event_data.current_spend,
        budgetLimit: event.event_data.budget_limit,
        thresholdPercentage: event.event_data.threshold_percentage,
      });

      // Could pause run, send alerts, etc.
    },
  },
];

export default OutboxProcessor;
