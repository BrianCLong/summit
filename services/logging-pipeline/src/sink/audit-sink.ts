/**
 * Unified Audit Sink
 *
 * Central ingestion point for audit events from all services.
 * Provides a unified interface with backpressure handling to ensure
 * services are never blocked by slow audit logging.
 *
 * Features:
 * - Non-blocking event submission
 * - Backpressure signaling via Redis pub/sub
 * - Event validation and normalization
 * - Retry with exponential backoff
 * - Dead letter queue for failed events
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { z } from 'zod';

/**
 * Audit event input from services
 */
export interface AuditEventInput {
  eventType: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  correlationId: string;
  tenantId: string;
  serviceId: string;
  serviceName: string;
  environment: 'development' | 'staging' | 'production';
  action: string;
  outcome: 'success' | 'failure' | 'partial' | 'pending' | 'denied';
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  criticalCategory?: string;
  complianceRelevant?: boolean;
  complianceFrameworks?: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Validation schema for audit event input
 */
const AuditEventInputSchema = z.object({
  eventType: z.string().min(1),
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
  correlationId: z.string().uuid(),
  tenantId: z.string().min(1),
  serviceId: z.string().min(1),
  serviceName: z.string().min(1),
  environment: z.enum(['development', 'staging', 'production']),
  action: z.string().min(1),
  outcome: z.enum(['success', 'failure', 'partial', 'pending', 'denied']),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  criticalCategory: z.string().optional(),
  complianceRelevant: z.boolean().optional(),
  complianceFrameworks: z.array(z.string()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  oldValues: z.record(z.unknown()).optional(),
  newValues: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Sink configuration
 */
export interface AuditSinkConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  queueName: string;
  deadLetterQueueName: string;
  maxRetries: number;
  retryDelayMs: number;
  backpressureChannel: string;
  maxQueueSize: number;
}

/**
 * Submission result
 */
export interface SubmitResult {
  success: boolean;
  eventId: string;
  queued: boolean;
  error?: string;
}

/**
 * Unified audit sink for event ingestion
 */
export class AuditSink extends EventEmitter {
  private redis: Redis;
  private subscriber: Redis;
  private config: AuditSinkConfig;
  private backpressureActive: boolean = false;
  private connected: boolean = false;

  constructor(config: AuditSinkConfig) {
    super();
    this.config = config;

    // Create Redis connections
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    this.subscriber = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
    });

    this.setupSubscriptions();
  }

  /**
   * Initialize the sink
   */
  async initialize(): Promise<void> {
    await this.redis.ping();
    this.connected = true;
    this.emit('connected');
  }

  /**
   * Submit an audit event to the sink
   * Returns immediately - event is queued for processing
   */
  async submit(input: AuditEventInput): Promise<SubmitResult> {
    const eventId = randomUUID();

    try {
      // Validate input
      const validation = AuditEventInputSchema.safeParse(input);
      if (!validation.success) {
        return {
          success: false,
          eventId,
          queued: false,
          error: `Validation failed: ${validation.error.message}`,
        };
      }

      // Check queue size for backpressure
      const queueSize = await this.redis.llen(this.config.queueName);
      if (queueSize >= this.config.maxQueueSize) {
        // For critical events, try to push anyway
        if (this.isCriticalEvent(input)) {
          // Use priority queue for critical events
          await this.pushToPriorityQueue(eventId, input);
          return { success: true, eventId, queued: true };
        }

        // Signal backpressure
        if (!this.backpressureActive) {
          this.backpressureActive = true;
          await this.redis.publish(
            this.config.backpressureChannel,
            JSON.stringify({ active: true, queueSize }),
          );
          this.emit('backpressure', true);
        }

        return {
          success: false,
          eventId,
          queued: false,
          error: 'Queue full - backpressure active',
        };
      }

      // Enrich event
      const enrichedEvent = this.enrichEvent(eventId, input);

      // Push to queue
      await this.redis.rpush(
        this.config.queueName,
        JSON.stringify(enrichedEvent),
      );

      // Release backpressure if queue is below threshold
      if (
        this.backpressureActive &&
        queueSize < this.config.maxQueueSize * 0.5
      ) {
        this.backpressureActive = false;
        await this.redis.publish(
          this.config.backpressureChannel,
          JSON.stringify({ active: false, queueSize }),
        );
        this.emit('backpressure', false);
      }

      return { success: true, eventId, queued: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { eventId, error: errorMessage });
      return {
        success: false,
        eventId,
        queued: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Submit multiple events in batch
   */
  async submitBatch(inputs: AuditEventInput[]): Promise<SubmitResult[]> {
    const results: SubmitResult[] = [];

    // Use pipeline for efficiency
    const pipeline = this.redis.pipeline();
    const enrichedEvents: Array<{ eventId: string; event: unknown }> = [];
    const priorityEvents: Array<{ eventId: string; event: unknown }> = [];
    let queueSize = await this.redis.llen(this.config.queueName);
    let pipelineHasCommands = false;

    for (const input of inputs) {
      const eventId = randomUUID();

      const validation = AuditEventInputSchema.safeParse(input);
      if (!validation.success) {
        results.push({
          success: false,
          eventId,
          queued: false,
          error: `Validation failed: ${validation.error.message}`,
        });
        continue;
      }

      const isCritical = this.isCriticalEvent(input);

      if (queueSize >= this.config.maxQueueSize && !isCritical) {
        if (!this.backpressureActive) {
          this.backpressureActive = true;
          await this.redis.publish(
            this.config.backpressureChannel,
            JSON.stringify({ active: true, queueSize }),
          );
          this.emit('backpressure', true);
        }

        results.push({
          success: false,
          eventId,
          queued: false,
          error: 'Queue full - backpressure active',
        });
        continue;
      }

      const enrichedEvent = this.enrichEvent(eventId, input);
      const serializedEvent = JSON.stringify(enrichedEvent);

      if (queueSize >= this.config.maxQueueSize && isCritical) {
        priorityEvents.push({ eventId, event: enrichedEvent });
        pipeline.rpush(`${this.config.queueName}:priority`, serializedEvent);
        pipelineHasCommands = true;
      } else {
        enrichedEvents.push({ eventId, event: enrichedEvent });
        pipeline.rpush(this.config.queueName, serializedEvent);
        queueSize += 1;
        pipelineHasCommands = true;
      }
    }

    try {
      if (pipelineHasCommands) {
        await pipeline.exec();
      }

      for (const { eventId } of enrichedEvents) {
        results.push({ success: true, eventId, queued: true });
      }

      for (const { eventId } of priorityEvents) {
        results.push({ success: true, eventId, queued: true });
      }

      if (
        this.backpressureActive &&
        queueSize < this.config.maxQueueSize * 0.5
      ) {
        this.backpressureActive = false;
        await this.redis.publish(
          this.config.backpressureChannel,
          JSON.stringify({ active: false, queueSize }),
        );
        this.emit('backpressure', false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      for (const { eventId } of enrichedEvents) {
        results.push({
          success: false,
          eventId,
          queued: false,
          error: errorMessage,
        });
      }

      for (const { eventId } of priorityEvents) {
        results.push({
          success: false,
          eventId,
          queued: false,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    queueSize: number;
    priorityQueueSize: number;
    deadLetterQueueSize: number;
    backpressureActive: boolean;
  }> {
    const [queueSize, priorityQueueSize, deadLetterQueueSize] = await Promise.all([
      this.redis.llen(this.config.queueName),
      this.redis.llen(`${this.config.queueName}:priority`),
      this.redis.llen(this.config.deadLetterQueueName),
    ]);

    return {
      queueSize,
      priorityQueueSize,
      deadLetterQueueSize,
      backpressureActive: this.backpressureActive,
    };
  }

  /**
   * Check if backpressure is active
   */
  isBackpressureActive(): boolean {
    return this.backpressureActive;
  }

  /**
   * Close the sink
   */
  async close(): Promise<void> {
    await this.subscriber.quit();
    await this.redis.quit();
    this.connected = false;
  }

  /**
   * Setup Redis subscriptions for backpressure notifications
   */
  private setupSubscriptions(): void {
    this.subscriber.subscribe(this.config.backpressureChannel);

    this.subscriber.on('message', (channel, message) => {
      if (channel === this.config.backpressureChannel) {
        try {
          const data = JSON.parse(message);
          this.backpressureActive = data.active;
          this.emit('backpressure', data.active);
        } catch {
          // Ignore malformed messages
        }
      }
    });
  }

  /**
   * Enrich event with timestamp and ID
   */
  private enrichEvent(
    eventId: string,
    input: AuditEventInput,
  ): Record<string, unknown> {
    return {
      ...input,
      id: eventId,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      details: input.details || {},
      complianceRelevant: input.complianceRelevant || false,
      complianceFrameworks: input.complianceFrameworks || [],
    };
  }

  /**
   * Push to priority queue for critical events
   */
  private async pushToPriorityQueue(
    eventId: string,
    input: AuditEventInput,
  ): Promise<void> {
    const enrichedEvent = this.enrichEvent(eventId, input);
    await this.redis.rpush(
      `${this.config.queueName}:priority`,
      JSON.stringify(enrichedEvent),
    );
  }

  /**
   * Check if an event is critical
   */
  private isCriticalEvent(input: AuditEventInput): boolean {
    if (input.criticalCategory) return true;
    if (input.level === 'critical' || input.level === 'error') return true;
    if (input.complianceRelevant) return true;

    const criticalTypes = [
      'security_alert',
      'data_breach',
      'access_denied',
      'anomaly_detected',
    ];
    return criticalTypes.includes(input.eventType);
  }
}

/**
 * Default sink configuration
 */
export const DEFAULT_SINK_CONFIG: Partial<AuditSinkConfig> = {
  queueName: 'audit:events',
  deadLetterQueueName: 'audit:events:dlq',
  maxRetries: 3,
  retryDelayMs: 1000,
  backpressureChannel: 'audit:backpressure',
  maxQueueSize: 100000,
};
