/**
 * EventBus - Core Distributed Message Bus Implementation
 *
 * Enterprise-grade event bus with pub-sub, queuing, and message routing
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import pino from 'pino';
import type {
  EventBusConfig,
  Message,
  MessageEnvelope,
  MessageHandler,
  PublishOptions,
  Subscription,
  SubscriptionOptions,
  EventBusMetrics,
  DeliveryGuarantee,
  MessageStatus
} from './types.js';

export class EventBus extends EventEmitter {
  private config: EventBusConfig;
  private redis?: Redis;
  private kafka?: Kafka;
  private kafkaProducer?: Producer;
  private kafkaConsumers: Map<string, Consumer> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private logger: pino.Logger;
  private metrics: EventBusMetrics;
  private processing: Map<string, MessageEnvelope> = new Map();

  constructor(config: EventBusConfig) {
    super();
    this.config = config;
    this.logger = pino({ name: `EventBus:${config.name}` });
    this.metrics = {
      messagesPublished: 0,
      messagesConsumed: 0,
      messagesFailed: 0,
      messagesDeadLettered: 0,
      averageLatency: 0,
      activeSubscriptions: 0,
      queueDepth: 0
    };
  }

  /**
   * Initialize the event bus and connect to backends
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing EventBus...');

    // Initialize Redis for local pub-sub and caching
    if (this.config.redis) {
      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db || 0,
        keyPrefix: this.config.redis.keyPrefix || 'eventbus:'
      });

      this.redis.on('error', (err) => {
        this.logger.error({ err }, 'Redis connection error');
      });
    }

    // Initialize Kafka for distributed messaging
    if (this.config.kafka) {
      this.kafka = new Kafka({
        clientId: this.config.kafka.clientId || this.config.name,
        brokers: this.config.kafka.brokers,
        ssl: this.config.kafka.ssl,
        sasl: this.config.kafka.sasl
      });

      this.kafkaProducer = this.kafka.producer();
      await this.kafkaProducer.connect();
    }

    this.logger.info('EventBus initialized successfully');
  }

  /**
   * Publish a message to a topic
   */
  async publish<T = any>(
    topic: string,
    payload: T,
    options: PublishOptions = {}
  ): Promise<string> {
    const messageId = uuidv4();
    const message: Message<T> = {
      metadata: {
        messageId,
        timestamp: new Date(),
        source: this.config.name,
        version: '1.0',
        traceId: options.persistent ? uuidv4() : undefined
      },
      payload,
      topic,
      priority: options.priority,
      ttl: options.ttl,
      delayed: options.delayed
    };

    this.logger.debug({ messageId, topic }, 'Publishing message');

    // Publish to Redis for fast local delivery
    if (this.redis) {
      await this.redis.publish(topic, JSON.stringify(message));
    }

    // Publish to Kafka for distributed persistence
    if (this.kafkaProducer && options.persistent) {
      await this.kafkaProducer.send({
        topic,
        messages: [{
          key: message.metadata.messageId,
          value: JSON.stringify(message),
          headers: message.metadata.headers as any
        }]
      });
    }

    this.metrics.messagesPublished++;
    this.emit('message:published', { messageId, topic });

    return messageId;
  }

  /**
   * Subscribe to messages on a topic
   */
  async subscribe<T = any>(
    topic: string,
    handler: MessageHandler<T>,
    options: SubscriptionOptions = {}
  ): Promise<Subscription> {
    const subscriptionId = uuidv4();

    this.logger.info({ subscriptionId, topic }, 'Creating subscription');

    // Subscribe to Redis
    if (this.redis) {
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(topic);

      subscriber.on('message', async (channel, messageStr) => {
        if (channel === topic) {
          const message = JSON.parse(messageStr) as Message<T>;
          await this.handleMessage(message, handler, options);
        }
      });
    }

    // Subscribe to Kafka
    if (this.kafka) {
      const consumer = this.kafka.consumer({
        groupId: `${this.config.name}-${topic}`
      });

      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const message = JSON.parse(
            payload.message.value?.toString() || '{}'
          ) as Message<T>;
          await this.handleMessage(message, handler, options);
        }
      });

      this.kafkaConsumers.set(subscriptionId, consumer);
    }

    const subscription: Subscription = {
      id: subscriptionId,
      topic,
      handler,
      options,
      unsubscribe: async () => {
        await this.unsubscribe(subscriptionId);
      }
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    return subscription;
  }

  /**
   * Publish to a queue (point-to-point)
   */
  async enqueue<T = any>(
    queue: string,
    payload: T,
    options: PublishOptions = {}
  ): Promise<string> {
    const messageId = uuidv4();
    const message: Message<T> = {
      metadata: {
        messageId,
        timestamp: new Date(),
        source: this.config.name,
        version: '1.0'
      },
      payload,
      queue,
      priority: options.priority || 0
    };

    this.logger.debug({ messageId, queue }, 'Enqueueing message');

    if (this.redis) {
      const queueKey = `queue:${queue}`;
      const priority = options.priority || 0;

      // Use sorted set for priority queue
      await this.redis.zadd(
        queueKey,
        priority,
        JSON.stringify(message)
      );
    }

    this.metrics.messagesPublished++;
    return messageId;
  }

  /**
   * Subscribe to queue messages
   */
  async subscribeQueue<T = any>(
    queue: string,
    handler: MessageHandler<T>,
    options: SubscriptionOptions = {}
  ): Promise<Subscription> {
    const subscriptionId = uuidv4();

    this.logger.info({ subscriptionId, queue }, 'Creating queue subscription');

    // Poll queue for messages
    const pollQueue = async () => {
      if (!this.redis) return;

      const queueKey = `queue:${queue}`;
      const prefetch = options.prefetchCount || 1;

      while (this.subscriptions.has(subscriptionId)) {
        try {
          // Pop highest priority message
          const result = await this.redis.zpopmax(queueKey, prefetch);

          if (result && result.length > 0) {
            for (let i = 0; i < result.length; i += 2) {
              const messageStr = result[i];
              const message = JSON.parse(messageStr) as Message<T>;
              await this.handleMessage(message, handler, options);
            }
          } else {
            // No messages, wait before polling again
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          this.logger.error({ err, queue }, 'Queue polling error');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    // Start polling
    pollQueue().catch(err => {
      this.logger.error({ err, queue }, 'Queue subscription error');
    });

    const subscription: Subscription = {
      id: subscriptionId,
      queue,
      handler,
      options,
      unsubscribe: async () => {
        await this.unsubscribe(subscriptionId);
      }
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    return subscription;
  }

  /**
   * Handle incoming message with retries and error handling
   */
  private async handleMessage<T = any>(
    message: Message<T>,
    handler: MessageHandler<T>,
    options: SubscriptionOptions
  ): Promise<void> {
    const envelope: MessageEnvelope<T> = {
      ...message,
      deliveryInfo: {
        attempt: 1,
        firstAttemptedAt: new Date()
      }
    };

    const maxRetries = options.maxRetries || this.config.maxRetries || 3;
    const retryDelay = options.retryDelay || this.config.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      envelope.deliveryInfo.attempt = attempt;
      envelope.deliveryInfo.lastAttemptedAt = new Date();

      try {
        this.processing.set(message.metadata.messageId, envelope);
        await handler(envelope);

        this.processing.delete(message.metadata.messageId);
        this.metrics.messagesConsumed++;
        this.emit('message:consumed', {
          messageId: message.metadata.messageId
        });

        return; // Success
      } catch (err) {
        this.logger.error(
          { err, messageId: message.metadata.messageId, attempt },
          'Message handling failed'
        );

        if (attempt < maxRetries) {
          // Calculate backoff
          const delay = options.retryBackoff === 'exponential'
            ? retryDelay * Math.pow(2, attempt - 1)
            : retryDelay;

          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max retries exceeded
          this.processing.delete(message.metadata.messageId);
          this.metrics.messagesFailed++;

          // Send to dead letter queue
          if (options.deadLetterQueue) {
            await this.sendToDeadLetter(envelope, options.deadLetterQueue);
          }

          this.emit('message:failed', {
            messageId: message.metadata.messageId,
            error: err
          });
        }
      }
    }
  }

  /**
   * Send message to dead letter queue
   */
  private async sendToDeadLetter<T = any>(
    envelope: MessageEnvelope<T>,
    dlqName: string
  ): Promise<void> {
    if (!this.redis) return;

    const dlqKey = `dlq:${dlqName}`;
    await this.redis.lpush(dlqKey, JSON.stringify(envelope));

    this.metrics.messagesDeadLettered++;
    this.logger.warn(
      { messageId: envelope.metadata.messageId, dlq: dlqName },
      'Message sent to dead letter queue'
    );
  }

  /**
   * Unsubscribe from a subscription
   */
  private async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Disconnect Kafka consumer
    const consumer = this.kafkaConsumers.get(subscriptionId);
    if (consumer) {
      await consumer.disconnect();
      this.kafkaConsumers.delete(subscriptionId);
    }

    this.subscriptions.delete(subscriptionId);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    this.logger.info({ subscriptionId }, 'Unsubscribed');
  }

  /**
   * Get current metrics
   */
  getMetrics(): EventBusMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown the event bus
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down EventBus...');

    // Close all subscriptions
    for (const subscription of this.subscriptions.values()) {
      await subscription.unsubscribe();
    }

    // Disconnect Kafka
    if (this.kafkaProducer) {
      await this.kafkaProducer.disconnect();
    }

    // Disconnect Redis
    if (this.redis) {
      await this.redis.quit();
    }

    this.logger.info('EventBus shut down successfully');
  }
}
