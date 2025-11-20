import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { KafkaConfig, Message, MessageHandler, MessageStats } from './types';

const logger = pino({ name: 'KafkaEventStream' });
const tracer = trace.getTracer('message-queue-enhanced');

/**
 * Kafka-based high-throughput event streaming
 */
export class KafkaEventStream {
  private kafka: Kafka;
  private producer?: Producer;
  private consumer?: Consumer;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private stats: MessageStats = {
    total: 0,
    success: 0,
    failed: 0,
    retried: 0,
    deadLettered: 0,
    avgProcessingTime: 0,
  };

  constructor(private config: KafkaConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
    });
  }

  /**
   * Initialize producer and consumer
   */
  async initialize(): Promise<void> {
    const span = tracer.startSpan('KafkaEventStream.initialize');

    try {
      this.producer = this.kafka.producer({
        idempotent: true, // Exactly-once semantics
        maxInFlightRequests: 5,
        transactionalId: `${this.config.clientId}-tx`,
      });

      await this.producer.connect();

      if (this.config.groupId) {
        this.consumer = this.kafka.consumer({
          groupId: this.config.groupId,
          sessionTimeout: this.config.sessionTimeout || 30000,
        });

        await this.consumer.connect();
      }

      logger.info({ clientId: this.config.clientId }, 'Kafka initialized');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Publish message to topic
   */
  async publish<T = any>(topic: string, message: Message<T>): Promise<void> {
    const span = tracer.startSpan('KafkaEventStream.publish');

    try {
      if (!this.producer) {
        throw new Error('Producer not initialized');
      }

      await this.producer.send({
        topic,
        messages: [
          {
            key: message.id,
            value: JSON.stringify(message.payload),
            headers: {
              ...message.headers,
              messageId: message.id,
              timestamp: message.timestamp.toString(),
              priority: message.priority || 'normal',
            },
          },
        ],
      });

      this.stats.total++;
      this.stats.success++;

      span.setAttributes({
        topic,
        messageId: message.id,
      });

      logger.debug({ topic, messageId: message.id }, 'Message published');
    } catch (error) {
      this.stats.failed++;
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Publish batch of messages
   */
  async publishBatch<T = any>(
    topic: string,
    messages: Message<T>[]
  ): Promise<void> {
    const span = tracer.startSpan('KafkaEventStream.publishBatch');

    try {
      if (!this.producer) {
        throw new Error('Producer not initialized');
      }

      await this.producer.send({
        topic,
        messages: messages.map((msg) => ({
          key: msg.id,
          value: JSON.stringify(msg.payload),
          headers: {
            ...msg.headers,
            messageId: msg.id,
            timestamp: msg.timestamp.toString(),
            priority: msg.priority || 'normal',
          },
        })),
      });

      this.stats.total += messages.length;
      this.stats.success += messages.length;

      span.setAttribute('messageCount', messages.length);
      logger.info({ topic, count: messages.length }, 'Batch published');
    } catch (error) {
      this.stats.failed += messages.length;
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Subscribe to topic with handler
   */
  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    const span = tracer.startSpan('KafkaEventStream.subscribe');

    try {
      if (!this.consumer) {
        throw new Error('Consumer not initialized');
      }

      // Register handler
      if (!this.handlers.has(topic)) {
        this.handlers.set(topic, []);
      }
      this.handlers.get(topic)!.push(handler);

      // Subscribe to topic
      await this.consumer.subscribe({
        topic,
        fromBeginning: this.config.fromBeginning || false,
      });

      // Start consuming if not already running
      if (!this.isConsuming) {
        await this.startConsuming();
      }

      logger.info({ topic }, 'Subscribed to topic');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  private isConsuming = false;

  /**
   * Start consuming messages
   */
  private async startConsuming(): Promise<void> {
    if (!this.consumer || this.isConsuming) return;

    this.isConsuming = true;

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const span = tracer.startSpan('KafkaEventStream.handleMessage');
    const startTime = Date.now();

    try {
      const { topic, message: kafkaMessage } = payload;
      const handlers = this.handlers.get(topic) || [];

      if (handlers.length === 0) {
        logger.warn({ topic }, 'No handlers for topic');
        return;
      }

      const message: Message = {
        id: kafkaMessage.headers?.messageId?.toString() || '',
        topic,
        payload: JSON.parse(kafkaMessage.value?.toString() || '{}'),
        headers: Object.entries(kafkaMessage.headers || {}).reduce(
          (acc, [key, value]) => {
            acc[key] = value?.toString() || '';
            return acc;
          },
          {} as Record<string, string>
        ),
        timestamp: parseInt(
          kafkaMessage.headers?.timestamp?.toString() || '0',
          10
        ),
        priority: kafkaMessage.headers?.priority?.toString() as any,
      };

      // Execute all handlers
      await Promise.all(handlers.map((handler) => handler(message)));

      const processingTime = Date.now() - startTime;
      this.updateProcessingTime(processingTime);

      span.setAttributes({
        topic,
        messageId: message.id,
        processingTime,
      });
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ error }, 'Message handling failed');
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Seek to specific offset
   */
  async seek(topic: string, partition: number, offset: string): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not initialized');
    }

    await this.consumer.seek({ topic, partition, offset });
    logger.info({ topic, partition, offset }, 'Seeked to offset');
  }

  /**
   * Pause consumption
   */
  async pause(topics: string[]): Promise<void> {
    if (!this.consumer) return;

    this.consumer.pause(topics.map((topic) => ({ topic })));
    logger.info({ topics }, 'Consumption paused');
  }

  /**
   * Resume consumption
   */
  async resume(topics: string[]): Promise<void> {
    if (!this.consumer) return;

    this.consumer.resume(topics.map((topic) => ({ topic })));
    logger.info({ topics }, 'Consumption resumed');
  }

  /**
   * Get statistics
   */
  getStats(): MessageStats {
    return { ...this.stats };
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }

    if (this.consumer) {
      await this.consumer.disconnect();
    }

    logger.info('Kafka disconnected');
  }

  private updateProcessingTime(time: number): void {
    const total = this.stats.success + this.stats.failed;
    this.stats.avgProcessingTime =
      (this.stats.avgProcessingTime * (total - 1) + time) / total;
  }
}
