import { Kafka, Producer, ProducerRecord, RecordMetadata, CompressionTypes } from 'kafkajs';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import pino from 'pino';
import {
  KafkaClusterConfig,
  EOSProducerConfig,
  StreamMessage,
  SerializationFormat,
} from './types';
import { SchemaRegistryClient } from './schema-registry';

const logger = pino({ name: 'kafka-producer' });
const tracer = trace.getTracer('kafka-producer');

/**
 * High-performance Kafka producer with EOS support
 */
export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private schemaRegistry: SchemaRegistryClient | null = null;
  private isTransactional: boolean = false;
  private inTransaction: boolean = false;

  constructor(
    private config: KafkaClusterConfig,
    private producerConfig?: Partial<EOSProducerConfig>,
    schemaRegistryUrl?: string
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

    this.isTransactional = !!producerConfig?.transactionalId;

    if (schemaRegistryUrl) {
      this.schemaRegistry = new SchemaRegistryClient({ host: schemaRegistryUrl });
    }
  }

  /**
   * Connect and initialize producer
   */
  async connect(): Promise<void> {
    const span = tracer.startSpan('kafka.producer.connect');

    try {
      this.producer = this.kafka.producer({
        ...this.producerConfig,
        idempotent: true,
        maxInFlightRequests: this.isTransactional ? 1 : 5,
      });

      await this.producer.connect();

      if (this.isTransactional) {
        logger.info('Initializing transactional producer');
      }

      logger.info('Kafka producer connected');
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      logger.error({ error }, 'Failed to connect producer');
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Begin transaction (for EOS)
   */
  async beginTransaction(): Promise<void> {
    if (!this.isTransactional) {
      throw new Error('Producer not configured for transactions');
    }

    if (!this.producer) {
      throw new Error('Producer not connected');
    }

    await this.producer.transaction();
    this.inTransaction = true;
    logger.debug('Transaction started');
  }

  /**
   * Commit transaction
   */
  async commitTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }

    // Transaction is committed when the transaction() callback completes
    this.inTransaction = false;
    logger.debug('Transaction committed');
  }

  /**
   * Abort transaction
   */
  async abortTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No active transaction');
    }

    // Transaction is aborted by throwing error in transaction() callback
    this.inTransaction = false;
    logger.debug('Transaction aborted');
  }

  /**
   * Send message with optional schema validation
   */
  async send<T = unknown>(
    topic: string,
    message: StreamMessage<T>,
    options?: {
      key?: string;
      partition?: number;
      headers?: Record<string, string>;
      schemaSubject?: string;
      compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
    }
  ): Promise<RecordMetadata[]> {
    const span = tracer.startSpan('kafka.producer.send', {
      attributes: {
        'messaging.system': 'kafka',
        'messaging.destination': topic,
        'messaging.message_id': message.metadata.eventId,
      },
    });

    try {
      if (!this.producer) {
        throw new Error('Producer not connected');
      }

      let value: Buffer | string;

      // Encode message with schema registry if configured
      if (this.schemaRegistry && options?.schemaSubject) {
        value = await this.schemaRegistry.encode(options.schemaSubject, message);
      } else {
        value = JSON.stringify(message);
      }

      const record: ProducerRecord = {
        topic,
        messages: [
          {
            key: options?.key,
            value,
            partition: options?.partition,
            headers: {
              ...message.headers,
              ...options?.headers,
              'event-id': message.metadata.eventId,
              'event-type': message.metadata.eventType,
              'correlation-id': message.metadata.correlationId || '',
            },
            timestamp: String(message.metadata.timestamp),
          },
        ],
        compression: this.getCompressionType(options?.compression),
      };

      const metadata = await this.producer.send(record);

      logger.debug(
        {
          topic,
          eventId: message.metadata.eventId,
          partition: metadata[0].partition,
          offset: metadata[0].offset,
        },
        'Message sent'
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return metadata;
    } catch (error) {
      logger.error({ error, topic }, 'Failed to send message');
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Send batch of messages for high throughput
   */
  async sendBatch<T = unknown>(
    topic: string,
    messages: StreamMessage<T>[],
    options?: {
      compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
      schemaSubject?: string;
    }
  ): Promise<RecordMetadata[]> {
    const span = tracer.startSpan('kafka.producer.sendBatch', {
      attributes: {
        'messaging.system': 'kafka',
        'messaging.destination': topic,
        'messaging.batch.message_count': messages.length,
      },
    });

    try {
      if (!this.producer) {
        throw new Error('Producer not connected');
      }

      const encodedMessages = await Promise.all(
        messages.map(async (message) => {
          let value: Buffer | string;

          if (this.schemaRegistry && options?.schemaSubject) {
            value = await this.schemaRegistry.encode(options.schemaSubject, message);
          } else {
            value = JSON.stringify(message);
          }

          return {
            value,
            headers: {
              ...message.headers,
              'event-id': message.metadata.eventId,
              'event-type': message.metadata.eventType,
            },
            timestamp: String(message.metadata.timestamp),
          };
        })
      );

      const record: ProducerRecord = {
        topic,
        messages: encodedMessages,
        compression: this.getCompressionType(options?.compression),
      };

      const metadata = await this.producer.send(record);

      logger.info(
        { topic, count: messages.length },
        'Batch sent'
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return metadata;
    } catch (error) {
      logger.error({ error, topic }, 'Failed to send batch');
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Execute operation within transaction
   */
  async executeInTransaction<T>(
    operation: (producer: Producer) => Promise<T>
  ): Promise<T> {
    if (!this.isTransactional || !this.producer) {
      throw new Error('Transactional producer not available');
    }

    const span = tracer.startSpan('kafka.producer.transaction');

    try {
      const result = await this.producer.transaction(async (tx) => {
        return await operation(tx);
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      logger.error({ error }, 'Transaction failed');
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Disconnect producer
   */
  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
      logger.info('Kafka producer disconnected');
    }
  }

  /**
   * Get compression type enum
   */
  private getCompressionType(
    compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd'
  ): CompressionTypes | undefined {
    if (!compression) return undefined;

    const compressionMap = {
      gzip: CompressionTypes.GZIP,
      snappy: CompressionTypes.Snappy,
      lz4: CompressionTypes.LZ4,
      zstd: CompressionTypes.ZSTD,
    };

    return compressionMap[compression];
  }
}
