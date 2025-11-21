import Redis from 'ioredis';
import { DiscoveryEvent } from '../types.js';
import { logger } from '../utils/logger.js';

export interface EventPublisherConfig {
  redisUrl?: string;
  streamKey: string;
  maxLen: number;
}

const DEFAULT_CONFIG: EventPublisherConfig = {
  streamKey: 'data-discovery:events',
  maxLen: 10000,
};

/**
 * Event Publisher
 * Publishes discovery events to Redis Streams for consumption by other services
 */
export class EventPublisher {
  private config: EventPublisherConfig;
  private redis: Redis | null = null;
  private connected = false;

  constructor(config: Partial<EventPublisherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const redisUrl = this.config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });

      await this.redis.ping();
      this.connected = true;
      logger.info('EventPublisher connected to Redis');
    } catch (error) {
      logger.warn('EventPublisher failed to connect to Redis, events will be logged only', { error });
      this.redis = null;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.connected = false;
      logger.info('EventPublisher disconnected from Redis');
    }
  }

  /**
   * Publish an event to the stream
   */
  async publish(event: DiscoveryEvent): Promise<string | null> {
    const eventData = {
      type: event.type,
      payload: JSON.stringify(event.payload),
      timestamp: event.timestamp.toISOString(),
      correlationId: event.correlationId,
    };

    // Always log the event
    logger.debug('Publishing event', { type: event.type, correlationId: event.correlationId });

    if (!this.redis || !this.connected) {
      // Fallback to just logging
      logger.info('Event (no Redis)', eventData);
      return null;
    }

    try {
      const messageId = await this.redis.xadd(
        this.config.streamKey,
        'MAXLEN',
        '~',
        this.config.maxLen,
        '*',
        ...Object.entries(eventData).flat()
      );

      return messageId;
    } catch (error) {
      logger.error('Failed to publish event', { error, event: eventData });
      return null;
    }
  }

  /**
   * Publish source discovered event
   */
  async publishSourceDiscovered(source: unknown): Promise<string | null> {
    return this.publish({
      type: 'source_discovered',
      payload: source,
      timestamp: new Date(),
      correlationId: crypto.randomUUID(),
    });
  }

  /**
   * Publish source profiled event
   */
  async publishSourceProfiled(sourceId: string, profile: unknown): Promise<string | null> {
    return this.publish({
      type: 'source_profiled',
      payload: { sourceId, profile },
      timestamp: new Date(),
      correlationId: crypto.randomUUID(),
    });
  }

  /**
   * Publish fusion completed event
   */
  async publishFusionCompleted(results: unknown[]): Promise<string | null> {
    return this.publish({
      type: 'fusion_completed',
      payload: { count: results.length, results },
      timestamp: new Date(),
      correlationId: crypto.randomUUID(),
    });
  }

  /**
   * Publish deduplication completed event
   */
  async publishDeduplicationCompleted(results: unknown[]): Promise<string | null> {
    return this.publish({
      type: 'dedup_completed',
      payload: { clusters: results.length, results },
      timestamp: new Date(),
      correlationId: crypto.randomUUID(),
    });
  }

  /**
   * Publish feedback received event
   */
  async publishFeedbackReceived(feedback: unknown): Promise<string | null> {
    return this.publish({
      type: 'feedback_received',
      payload: feedback,
      timestamp: new Date(),
      correlationId: crypto.randomUUID(),
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton for easy access
let defaultPublisher: EventPublisher | null = null;

export function getEventPublisher(): EventPublisher {
  if (!defaultPublisher) {
    defaultPublisher = new EventPublisher();
  }
  return defaultPublisher;
}
