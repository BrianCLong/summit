import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import {
  RabbitMQConfig,
  QueueConfig,
  Message,
  MessageHandler,
  MessageStats,
} from './types';
import { DeadLetterQueue } from './DeadLetterQueue';

const logger = pino({ name: 'RabbitMQQueue' });
const tracer = trace.getTracer('message-queue-enhanced');

/**
 * RabbitMQ-based reliable task queuing
 */
export class RabbitMQQueue {
  private connection?: Connection;
  private channel?: Channel;
  private deadLetterQueue?: DeadLetterQueue;
  private handlers: Map<string, MessageHandler> = new Map();
  private stats: MessageStats = {
    total: 0,
    success: 0,
    failed: 0,
    retried: 0,
    deadLettered: 0,
    avgProcessingTime: 0,
  };

  constructor(private config: RabbitMQConfig) {}

  /**
   * Initialize connection and channel
   */
  async initialize(): Promise<void> {
    const span = tracer.startSpan('RabbitMQQueue.initialize');

    try {
      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

      // Set prefetch for fair dispatch
      if (this.config.prefetch) {
        await this.channel.prefetch(this.config.prefetch);
      }

      // Initialize dead letter queue
      this.deadLetterQueue = new DeadLetterQueue(this.channel);
      await this.deadLetterQueue.initialize();

      logger.info('RabbitMQ initialized');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create queue with configuration
   */
  async createQueue(config: QueueConfig): Promise<void> {
    const span = tracer.startSpan('RabbitMQQueue.createQueue');

    try {
      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      const queueOptions: any = {
        durable: config.durable !== false,
      };

      // Add dead letter exchange
      if (config.deadLetterExchange) {
        queueOptions.deadLetterExchange = config.deadLetterExchange;
      }

      // Add max length
      if (config.maxLength) {
        queueOptions.maxLength = config.maxLength;
      }

      // Add TTL
      if (config.ttl) {
        queueOptions.messageTtl = config.ttl;
      }

      // Add priority support
      if (config.priority) {
        queueOptions.maxPriority = 10;
      }

      await this.channel.assertQueue(config.name, queueOptions);

      logger.info({ queue: config.name }, 'Queue created');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Publish message to queue
   */
  async publish<T = any>(
    queueName: string,
    message: Message<T>
  ): Promise<void> {
    const span = tracer.startSpan('RabbitMQQueue.publish');

    try {
      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      const options: any = {
        persistent: true,
        messageId: message.id,
        timestamp: message.timestamp,
        headers: {
          ...message.headers,
          retryCount: message.retryCount || 0,
          maxRetries: message.maxRetries || 3,
        },
      };

      // Set priority
      if (message.priority) {
        const priorityMap = { high: 10, normal: 5, low: 1 };
        options.priority = priorityMap[message.priority];
      }

      this.channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(message.payload)),
        options
      );

      this.stats.total++;
      this.stats.success++;

      span.setAttributes({
        queue: queueName,
        messageId: message.id,
      });

      logger.debug({ queue: queueName, messageId: message.id }, 'Message published');
    } catch (error) {
      this.stats.failed++;
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Consume messages from queue
   */
  async consume(queueName: string, handler: MessageHandler): Promise<void> {
    const span = tracer.startSpan('RabbitMQQueue.consume');

    try {
      if (!this.channel) {
        throw new Error('Channel not initialized');
      }

      this.handlers.set(queueName, handler);

      await this.channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          await this.handleMessage(queueName, msg);
        },
        { noAck: false }
      );

      logger.info({ queue: queueName }, 'Started consuming');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    queueName: string,
    msg: ConsumeMessage
  ): Promise<void> {
    const span = tracer.startSpan('RabbitMQQueue.handleMessage');
    const startTime = Date.now();

    try {
      if (!this.channel) return;

      const handler = this.handlers.get(queueName);
      if (!handler) {
        logger.warn({ queue: queueName }, 'No handler for queue');
        this.channel.nack(msg, false, false);
        return;
      }

      const message: Message = {
        id: msg.properties.messageId || '',
        topic: queueName,
        payload: JSON.parse(msg.content.toString()),
        headers: msg.properties.headers || {},
        timestamp: msg.properties.timestamp || Date.now(),
        retryCount: msg.properties.headers?.retryCount || 0,
        maxRetries: msg.properties.headers?.maxRetries || 3,
      };

      // Execute handler
      await handler(message);

      // Acknowledge message
      this.channel.ack(msg);

      const processingTime = Date.now() - startTime;
      this.updateProcessingTime(processingTime);

      span.setAttributes({
        queue: queueName,
        messageId: message.id,
        processingTime,
      });
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ error, queue: queueName }, 'Message handling failed');

      // Handle retry logic
      await this.handleFailure(queueName, msg);
    } finally {
      span.end();
    }
  }

  /**
   * Handle message failure with retry logic
   */
  private async handleFailure(
    queueName: string,
    msg: ConsumeMessage
  ): Promise<void> {
    if (!this.channel) return;

    const retryCount = (msg.properties.headers?.retryCount || 0) + 1;
    const maxRetries = msg.properties.headers?.maxRetries || 3;

    if (retryCount <= maxRetries) {
      // Retry message
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 60000);

      setTimeout(() => {
        if (!this.channel) return;

        this.channel.sendToQueue(
          queueName,
          msg.content,
          {
            ...msg.properties,
            headers: {
              ...msg.properties.headers,
              retryCount,
            },
          }
        );

        this.channel.ack(msg);
      }, retryDelay);

      this.stats.retried++;
      logger.info({ retryCount, maxRetries }, 'Message queued for retry');
    } else {
      // Send to dead letter queue
      if (this.deadLetterQueue) {
        await this.deadLetterQueue.send(queueName, msg);
        this.stats.deadLettered++;
      }

      this.channel.ack(msg);
      logger.warn('Message sent to dead letter queue');
    }
  }

  /**
   * Purge queue
   */
  async purgeQueue(queueName: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.purgeQueue(queueName);
    logger.info({ queue: queueName }, 'Queue purged');
  }

  /**
   * Get queue info
   */
  async getQueueInfo(queueName: string): Promise<any> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    return await this.channel.checkQueue(queueName);
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
    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }

    logger.info('RabbitMQ disconnected');
  }

  private updateProcessingTime(time: number): void {
    const total = this.stats.success + this.stats.failed;
    this.stats.avgProcessingTime =
      (this.stats.avgProcessingTime * (total - 1) + time) / total;
  }
}
