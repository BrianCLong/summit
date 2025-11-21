import {
  Kafka,
  Consumer,
  EachMessagePayload,
  ConsumerSubscribeTopics,
  KafkaMessage,
} from 'kafkajs';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import pino from 'pino';
import {
  KafkaClusterConfig,
  ConsumerGroupConfig,
  StreamMessage,
  ProcessingResult,
} from './types';
import { SchemaRegistryClient } from './schema-registry';
import { DeadLetterQueue } from './dlq';

const logger = pino({ name: 'kafka-consumer' });
const tracer = trace.getTracer('kafka-consumer');

export type MessageHandler<T = unknown> = (
  message: StreamMessage<T>,
  metadata: {
    topic: string;
    partition: number;
    offset: string;
  }
) => Promise<ProcessingResult>;

/**
 * High-performance Kafka consumer with automatic offset management
 */
export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer | null = null;
  private schemaRegistry: SchemaRegistryClient | null = null;
  private dlq: DeadLetterQueue | null = null;
  private isRunning: boolean = false;
  private messageHandlers: Map<string, MessageHandler> = new Map();

  constructor(
    private config: KafkaClusterConfig,
    private consumerConfig: ConsumerGroupConfig,
    schemaRegistryUrl?: string,
    dlqConfig?: { topic: string; maxRetries: number }
  ) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
      connectionTimeout: config.connectionTimeout,
      requestTimeout: config.requestTimeout,
      retry: config.retry,
    });

    if (schemaRegistryUrl) {
      this.schemaRegistry = new SchemaRegistryClient({ host: schemaRegistryUrl });
    }

    if (dlqConfig) {
      this.dlq = new DeadLetterQueue(
        this.kafka,
        dlqConfig.topic,
        dlqConfig.maxRetries
      );
    }
  }

  /**
   * Connect and initialize consumer
   */
  async connect(): Promise<void> {
    const span = tracer.startSpan('kafka.consumer.connect');

    try {
      this.consumer = this.kafka.consumer({
        groupId: this.consumerConfig.groupId,
        sessionTimeout: this.consumerConfig.sessionTimeout,
        rebalanceTimeout: this.consumerConfig.rebalanceTimeout,
        heartbeatInterval: this.consumerConfig.heartbeatInterval,
        maxBytesPerPartition: this.consumerConfig.maxBytesPerPartition,
        minBytes: this.consumerConfig.minBytes,
        maxBytes: this.consumerConfig.maxBytes,
        maxWaitTimeInMs: this.consumerConfig.maxWaitTimeInMs,
      });

      await this.consumer.connect();

      if (this.dlq) {
        await this.dlq.connect();
      }

      logger.info(
        { groupId: this.consumerConfig.groupId },
        'Kafka consumer connected'
      );

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      logger.error({ error }, 'Failed to connect consumer');
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Subscribe to topics
   */
  async subscribe(topics: string[]): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not connected');
    }

    await this.consumer.subscribe({
      topics,
      fromBeginning: false,
    });

    logger.info({ topics }, 'Subscribed to topics');
  }

  /**
   * Register message handler for specific topic
   */
  registerHandler<T = unknown>(topic: string, handler: MessageHandler<T>): void {
    this.messageHandlers.set(topic, handler as MessageHandler);
    logger.info({ topic }, 'Handler registered');
  }

  /**
   * Start consuming messages
   */
  async start(): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not connected');
    }

    if (this.isRunning) {
      logger.warn('Consumer already running');
      return;
    }

    this.isRunning = true;

    await this.consumer.run({
      autoCommit: this.consumerConfig.autoCommit ?? false,
      autoCommitInterval: this.consumerConfig.autoCommitInterval,
      autoCommitThreshold: this.consumerConfig.autoCommitThreshold,
      eachMessage: this.handleMessage.bind(this),
    });

    logger.info('Consumer started');
  }

  /**
   * Handle individual message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    const span = tracer.startSpan('kafka.consumer.message', {
      attributes: {
        'messaging.system': 'kafka',
        'messaging.destination': topic,
        'messaging.kafka.partition': partition,
        'messaging.kafka.offset': message.offset,
      },
    });

    try {
      // Decode message
      const streamMessage = await this.decodeMessage(message);

      if (!streamMessage) {
        logger.warn({ topic, partition, offset: message.offset }, 'Failed to decode message');
        return;
      }

      // Get handler for topic
      const handler = this.messageHandlers.get(topic);

      if (!handler) {
        logger.warn({ topic }, 'No handler registered for topic');
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'No handler' });
        span.end();
        return;
      }

      // Process message
      const result = await handler(streamMessage, {
        topic,
        partition,
        offset: message.offset,
      });

      if (result.success) {
        // Commit offset on success (if manual commit)
        if (!this.consumerConfig.autoCommit) {
          await payload.heartbeat();
          await this.consumer!.commitOffsets([
            {
              topic,
              partition,
              offset: (BigInt(message.offset) + BigInt(1)).toString(),
            },
          ]);
        }

        span.setStatus({ code: SpanStatusCode.OK });
      } else {
        // Send to DLQ if processing failed and not retryable
        if (!result.retryable && this.dlq) {
          await this.dlq.send(topic, message, result.error);
        }

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.error?.message || 'Processing failed',
        });
      }
    } catch (error) {
      logger.error(
        { error, topic, partition, offset: message.offset },
        'Error processing message'
      );

      // Send to DLQ on exception
      if (this.dlq) {
        await this.dlq.send(topic, message, error as Error);
      }

      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
    } finally {
      span.end();
    }
  }

  /**
   * Decode message from Kafka
   */
  private async decodeMessage(
    message: KafkaMessage
  ): Promise<StreamMessage | null> {
    if (!message.value) {
      return null;
    }

    try {
      // Try schema registry first
      if (this.schemaRegistry) {
        try {
          return await this.schemaRegistry.decode(message.value);
        } catch (error) {
          // Fall back to JSON
          logger.debug('Schema registry decode failed, falling back to JSON');
        }
      }

      // Fall back to JSON parsing
      const decoded = JSON.parse(message.value.toString());
      return decoded as StreamMessage;
    } catch (error) {
      logger.error({ error }, 'Failed to decode message');
      return null;
    }
  }

  /**
   * Pause consumption
   */
  async pause(topics?: { topic: string; partitions?: number[] }[]): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not connected');
    }

    if (topics) {
      this.consumer.pause(topics);
    } else {
      this.consumer.pause(
        Array.from(this.messageHandlers.keys()).map((topic) => ({ topic }))
      );
    }

    logger.info({ topics }, 'Consumer paused');
  }

  /**
   * Resume consumption
   */
  async resume(topics?: { topic: string; partitions?: number[] }[]): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not connected');
    }

    if (topics) {
      this.consumer.resume(topics);
    } else {
      this.consumer.resume(
        Array.from(this.messageHandlers.keys()).map((topic) => ({ topic }))
      );
    }

    logger.info({ topics }, 'Consumer resumed');
  }

  /**
   * Stop consuming and disconnect
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.consumer) {
      await this.consumer.stop();
      await this.consumer.disconnect();
      this.consumer = null;
    }

    if (this.dlq) {
      await this.dlq.disconnect();
    }

    logger.info('Consumer stopped');
  }

  /**
   * Get consumer lag for monitoring
   */
  async getLag(): Promise<
    Array<{
      topic: string;
      partition: number;
      offset: string;
      highWaterMark: string;
      lag: string;
    }>
  > {
    if (!this.consumer) {
      throw new Error('Consumer not connected');
    }

    const admin = this.kafka.admin();
    await admin.connect();

    try {
      const topics = Array.from(this.messageHandlers.keys());
      const offsets = await admin.fetchOffsets({
        groupId: this.consumerConfig.groupId,
        topics,
      });

      const lagData = [];

      for (const topicOffset of offsets) {
        for (const partition of topicOffset.partitions) {
          const lag = BigInt(partition.high) - BigInt(partition.offset);
          lagData.push({
            topic: topicOffset.topic,
            partition: partition.partition,
            offset: partition.offset,
            highWaterMark: partition.high,
            lag: lag.toString(),
          });
        }
      }

      return lagData;
    } finally {
      await admin.disconnect();
    }
  }
}
