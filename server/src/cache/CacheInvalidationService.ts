/**
 * Cache Invalidation Service
 *
 * Manages cross-instance cache invalidation via Redis pub/sub.
 * Supports pattern-based, tag-based, and tenant-scoped invalidation.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module cache/CacheInvalidationService
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface InvalidationEvent {
  id: string;
  type: 'key' | 'pattern' | 'tag' | 'tenant' | 'all';
  target: string;
  tenantId?: string;
  timestamp: number;
  source: string;
}

export interface InvalidationConfig {
  /** Channel prefix for pub/sub */
  channelPrefix: string;
  /** Instance identifier */
  instanceId: string;
  /** Enable event batching */
  enableBatching: boolean;
  /** Batch flush interval in ms */
  batchFlushMs: number;
  /** Maximum batch size */
  maxBatchSize: number;
}

export interface InvalidationStats {
  published: number;
  received: number;
  processed: number;
  errors: number;
  batches: number;
}

type InvalidationHandler = (event: InvalidationEvent) => Promise<void> | void;

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'invalidation-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'CacheInvalidationService',
  };
}

// ============================================================================
// Cache Invalidation Service
// ============================================================================

export class CacheInvalidationService extends EventEmitter {
  private publisher: Redis;
  private subscriber: Redis;
  private config: InvalidationConfig;
  private stats: InvalidationStats;
  private handlers: Map<string, InvalidationHandler[]> = new Map();
  private eventBatch: InvalidationEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(redis: Redis, config: Partial<InvalidationConfig> = {}) {
    super();
    this.publisher = redis;
    this.subscriber = redis.duplicate();
    this.config = {
      channelPrefix: config.channelPrefix ?? 'cache:invalidation',
      instanceId: config.instanceId ?? `instance-${uuidv4().slice(0, 8)}`,
      enableBatching: config.enableBatching ?? true,
      batchFlushMs: config.batchFlushMs ?? 50,
      maxBatchSize: config.maxBatchSize ?? 100,
    };
    this.stats = {
      published: 0,
      received: 0,
      processed: 0,
      errors: 0,
      batches: 0,
    };

    logger.info({ instanceId: this.config.instanceId }, 'CacheInvalidationService initialized');
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Start listening for invalidation events
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    const channels = [
      `${this.config.channelPrefix}:keys`,
      `${this.config.channelPrefix}:patterns`,
      `${this.config.channelPrefix}:tags`,
      `${this.config.channelPrefix}:tenants`,
      `${this.config.channelPrefix}:all`,
    ];

    await this.subscriber.subscribe(...channels);

    this.subscriber.on('message', async (channel: string, message: string) => {
      try {
        const event: InvalidationEvent = JSON.parse(message);

        // Ignore events from this instance
        if (event.source === this.config.instanceId) {
          return;
        }

        this.stats.received++;
        await this.processEvent(event);
        this.stats.processed++;
      } catch (error: any) {
        this.stats.errors++;
        logger.error({ error, channel, message }, 'Failed to process invalidation event');
      }
    });

    this.isRunning = true;
    logger.info({ channels }, 'Invalidation listener started');
  }

  /**
   * Stop listening and clean up
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Flush any pending batch
    await this.flushBatch();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    await this.subscriber.unsubscribe();
    this.isRunning = false;
    logger.info('Invalidation listener stopped');
  }

  // --------------------------------------------------------------------------
  // Publishing Invalidations
  // --------------------------------------------------------------------------

  /**
   * Invalidate a specific key
   */
  async invalidateKey(key: string, tenantId?: string): Promise<DataEnvelope<boolean>> {
    return this.publishEvent({
      type: 'key',
      target: key,
      tenantId,
    });
  }

  /**
   * Invalidate keys matching a pattern
   */
  async invalidatePattern(pattern: string, tenantId?: string): Promise<DataEnvelope<boolean>> {
    return this.publishEvent({
      type: 'pattern',
      target: pattern,
      tenantId,
    });
  }

  /**
   * Invalidate all keys with a specific tag
   */
  async invalidateTag(tag: string, tenantId?: string): Promise<DataEnvelope<boolean>> {
    return this.publishEvent({
      type: 'tag',
      target: tag,
      tenantId,
    });
  }

  /**
   * Invalidate all keys for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<DataEnvelope<boolean>> {
    return this.publishEvent({
      type: 'tenant',
      target: tenantId,
      tenantId,
    });
  }

  /**
   * Invalidate all caches
   */
  async invalidateAll(): Promise<DataEnvelope<boolean>> {
    return this.publishEvent({
      type: 'all',
      target: '*',
    });
  }

  /**
   * Batch multiple invalidations
   */
  async invalidateBatch(
    events: Array<{ type: InvalidationEvent['type']; target: string; tenantId?: string }>
  ): Promise<DataEnvelope<number>> {
    let count = 0;
    for (const event of events) {
      const result = await this.publishEvent(event);
      if (result.data) count++;
    }

    return createDataEnvelope(count, {
      source: 'CacheInvalidationService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Batch invalidation: ${count} events`),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  /**
   * Register a handler for invalidation events
   */
  onInvalidation(type: InvalidationEvent['type'], handler: InvalidationHandler): void {
    const handlers = this.handlers.get(type) ?? [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  /**
   * Process an incoming invalidation event
   */
  private async processEvent(event: InvalidationEvent): Promise<void> {
    // Emit for general listeners
    this.emit('invalidation', event);

    // Call specific handlers
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error: any) {
        logger.error({ error, event }, 'Handler error for invalidation event');
      }
    }

    // Also call 'all' handlers for any type
    const allHandlers = this.handlers.get('all') ?? [];
    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (error: any) {
        logger.error({ error, event }, 'Handler error for invalidation event');
      }
    }

    logger.debug({ event }, 'Processed invalidation event');
  }

  // --------------------------------------------------------------------------
  // Internal Publishing
  // --------------------------------------------------------------------------

  private async publishEvent(
    eventData: Omit<InvalidationEvent, 'id' | 'timestamp' | 'source'>
  ): Promise<DataEnvelope<boolean>> {
    const event: InvalidationEvent = {
      id: uuidv4(),
      ...eventData,
      timestamp: Date.now(),
      source: this.config.instanceId,
    };

    if (this.config.enableBatching) {
      return this.addToBatch(event);
    }

    return this.publishImmediately(event);
  }

  private async publishImmediately(event: InvalidationEvent): Promise<DataEnvelope<boolean>> {
    try {
      const channel = this.getChannelForType(event.type);
      await this.publisher.publish(channel, JSON.stringify(event));
      this.stats.published++;

      logger.debug({ event }, 'Published invalidation event');
      return createDataEnvelope(true, {
        source: 'CacheInvalidationService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Event published'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      this.stats.errors++;
      logger.error({ error, event }, 'Failed to publish invalidation event');
      return createDataEnvelope(false, {
        source: 'CacheInvalidationService',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Event publish failed'),
        classification: DataClassification.INTERNAL,
      });
    }
  }

  private addToBatch(event: InvalidationEvent): DataEnvelope<boolean> {
    this.eventBatch.push(event);

    // Flush if batch is full
    if (this.eventBatch.length >= this.config.maxBatchSize) {
      setImmediate(() => this.flushBatch());
    }

    // Start timer if not running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), this.config.batchFlushMs);
    }

    return createDataEnvelope(true, {
      source: 'CacheInvalidationService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Event batched'),
      classification: DataClassification.INTERNAL,
    });
  }

  private async flushBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.eventBatch.length === 0) return;

    const batch = this.eventBatch;
    this.eventBatch = [];

    // Group by channel
    const byChannel = new Map<string, InvalidationEvent[]>();
    for (const event of batch) {
      const channel = this.getChannelForType(event.type);
      const events = byChannel.get(channel) ?? [];
      events.push(event);
      byChannel.set(channel, events);
    }

    // Publish each group
    const pipeline = this.publisher.pipeline();
    for (const [channel, events] of byChannel) {
      for (const event of events) {
        pipeline.publish(channel, JSON.stringify(event));
      }
    }

    try {
      await pipeline.exec();
      this.stats.published += batch.length;
      this.stats.batches++;
      logger.debug({ count: batch.length }, 'Flushed invalidation batch');
    } catch (error: any) {
      this.stats.errors += batch.length;
      logger.error({ error, count: batch.length }, 'Failed to flush invalidation batch');
    }
  }

  private getChannelForType(type: InvalidationEvent['type']): string {
    switch (type) {
      case 'key':
        return `${this.config.channelPrefix}:keys`;
      case 'pattern':
        return `${this.config.channelPrefix}:patterns`;
      case 'tag':
        return `${this.config.channelPrefix}:tags`;
      case 'tenant':
        return `${this.config.channelPrefix}:tenants`;
      case 'all':
        return `${this.config.channelPrefix}:all`;
      default:
        return `${this.config.channelPrefix}:keys`;
    }
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  /**
   * Get invalidation statistics
   */
  getStats(): DataEnvelope<InvalidationStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'CacheInvalidationService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      published: 0,
      received: 0,
      processed: 0,
      errors: 0,
      batches: 0,
    };
  }
}

// Export singleton factory
let instance: CacheInvalidationService | null = null;

export function getCacheInvalidationService(
  redis: Redis,
  config?: Partial<InvalidationConfig>
): CacheInvalidationService {
  if (!instance) {
    instance = new CacheInvalidationService(redis, config);
  }
  return instance;
}

export default CacheInvalidationService;
