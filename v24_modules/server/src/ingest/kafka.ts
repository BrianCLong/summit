import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { signalService } from '../services/signalService.js';
import { logger } from '../observability/logger.js';
import { incrementCounter, recordHistogram } from '../observability/metrics.js';
import { config } from '../../config/environment.js';

// Signal schema for Kafka messages
const kafkaSignalSchema = Joi.object({
  tenantId: Joi.string().required().max(255),
  type: Joi.string().required().max(100),
  value: Joi.number().required().min(-1000).max(1000),
  weight: Joi.number().optional().min(0).max(100).default(1.0),
  source: Joi.string().required().max(255),
  ts: Joi.date()
    .iso()
    .optional()
    .default(() => new Date()),
  metadata: Joi.object().optional(),
  messageId: Joi.string().optional(),
  partition: Joi.number().optional(),
  offset: Joi.string().optional(),
});

class KafkaSignalConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private isRunning: boolean = false;
  private processingCount: number = 0;
  private lastCommittedOffsets: Map<string, string> = new Map();

  constructor() {
    if (!config.KAFKA_BROKERS) {
      throw new Error('KAFKA_BROKERS not configured');
    }

    this.kafka = new Kafka({
      clientId: `${config.OTEL_SERVICE_NAME}-consumer`,
      brokers: config.KAFKA_BROKERS.split(','),
      retry: {
        initialRetryTime: 300,
        retries: 5,
        maxRetryTime: 30000,
        factor: 2,
      },
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });

    this.consumer = this.kafka.consumer({
      groupId: config.KAFKA_GROUP_ID,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      minBytes: 1,
      maxBytes: 10485760, // 10MB
      maxWaitTimeInMs: 5000,
      retry: {
        initialRetryTime: 100,
        retries: 3,
        maxRetryTime: 30000,
        factor: 2,
      },
    });

    // Setup error handlers
    this.consumer.on('consumer.crash', (error) => {
      logger.error('Kafka consumer crashed', {
        error: error.payload.error.message,
        stack: error.payload.error.stack,
        groupId: config.KAFKA_GROUP_ID,
      });

      incrementCounter('kafka_consumer_crashes_total', {
        group_id: config.KAFKA_GROUP_ID,
        error_type: error.payload.error.name,
      });

      // Attempt to restart after a delay
      setTimeout(() => this.reconnect(), 5000);
    });

    this.consumer.on('consumer.disconnect', () => {
      logger.warn('Kafka consumer disconnected', {
        groupId: config.KAFKA_GROUP_ID,
      });

      incrementCounter('kafka_consumer_disconnects_total', {
        group_id: config.KAFKA_GROUP_ID,
      });
    });

    this.consumer.on('consumer.connect', () => {
      logger.info('Kafka consumer connected', {
        groupId: config.KAFKA_GROUP_ID,
        topic: config.KAFKA_TOPIC_COHERENCE,
      });

      incrementCounter('kafka_consumer_connects_total', {
        group_id: config.KAFKA_GROUP_ID,
      });
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Kafka consumer already running');
      return;
    }

    try {
      logger.info('Starting Kafka signal consumer', {
        groupId: config.KAFKA_GROUP_ID,
        topic: config.KAFKA_TOPIC_COHERENCE,
        brokers: config.KAFKA_BROKERS,
      });

      await this.consumer.connect();

      await this.consumer.subscribe({
        topic: config.KAFKA_TOPIC_COHERENCE,
        fromBeginning: false,
      });

      await this.consumer.run({
        partitionsConsumedConcurrently: 3,
        eachMessage: this.processMessage.bind(this),
      });

      this.isRunning = true;

      logger.info('Kafka signal consumer started successfully', {
        groupId: config.KAFKA_GROUP_ID,
        topic: config.KAFKA_TOPIC_COHERENCE,
      });
    } catch (error) {
      logger.error('Failed to start Kafka consumer', {
        error: error.message,
        stack: error.stack,
        groupId: config.KAFKA_GROUP_ID,
      });

      incrementCounter('kafka_consumer_start_errors_total', {
        group_id: config.KAFKA_GROUP_ID,
        error_type: error.name,
      });

      throw error;
    }
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message, heartbeat } = payload;
    const startTime = Date.now();
    const messageId = message.key?.toString() || uuidv4();

    this.processingCount++;

    try {
      // Parse message
      let signalData;
      try {
        signalData = JSON.parse(message.value?.toString() || '{}');
      } catch (parseError) {
        logger.error('Failed to parse Kafka message', {
          messageId,
          topic,
          partition,
          offset: message.offset,
          error: parseError.message,
        });

        incrementCounter('kafka_message_parse_errors_total', {
          topic,
          partition: partition.toString(),
          error_type: 'json_parse',
        });

        return; // Skip invalid JSON messages
      }

      // Add Kafka metadata to signal
      const enrichedSignal = {
        ...signalData,
        messageId,
        partition,
        offset: message.offset,
        kafkaTimestamp: message.timestamp,
      };

      // Validate signal
      const { error, value: validatedSignal } =
        kafkaSignalSchema.validate(enrichedSignal);

      if (error) {
        logger.error('Kafka signal validation failed', {
          messageId,
          topic,
          partition,
          offset: message.offset,
          validationErrors: error.details.map((d) => d.message),
          signalData: enrichedSignal,
        });

        incrementCounter('kafka_signal_validation_errors_total', {
          topic,
          partition: partition.toString(),
          tenant_id: enrichedSignal.tenantId || 'unknown',
        });

        return; // Skip invalid signals
      }

      // Create provenance record
      const provenance = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        source: 'kafka-consumer',
        messageId,
        topic,
        partition,
        offset: message.offset,
        purpose: 'benchmarking',
        retention: 'standard-365d',
        license: 'Restricted-TOS',
        residency: 'US',
      };

      // Attach provenance to signal
      const signalWithProvenance = {
        ...validatedSignal,
        provenance,
      };

      // Send heartbeat to maintain session
      await heartbeat();

      // Process signal with idempotency
      const result =
        await signalService.ingestSignalIdempotent(signalWithProvenance);

      // Record success metrics
      const processingDuration = Date.now() - startTime;

      incrementCounter('kafka_signals_processed_total', {
        topic,
        partition: partition.toString(),
        tenant_id: validatedSignal.tenantId,
        signal_type: validatedSignal.type,
        source: validatedSignal.source,
        result: result.wasProcessed ? 'processed' : 'deduplicated',
      });

      recordHistogram(
        'kafka_signal_processing_duration_seconds',
        processingDuration / 1000,
        {
          topic,
          partition: partition.toString(),
          tenant_id: validatedSignal.tenantId,
        },
      );

      // Track offset for monitoring
      const partitionKey = `${topic}-${partition}`;
      this.lastCommittedOffsets.set(partitionKey, message.offset);

      logger.debug('Kafka signal processed successfully', {
        messageId,
        topic,
        partition,
        offset: message.offset,
        tenantId: validatedSignal.tenantId,
        signalType: validatedSignal.type,
        signalId: result.signalId,
        wasProcessed: result.wasProcessed,
        provenanceId: provenance.id,
        duration: processingDuration,
      });
    } catch (error) {
      const processingDuration = Date.now() - startTime;

      incrementCounter('kafka_signal_processing_errors_total', {
        topic,
        partition: partition.toString(),
        error_type: error.name || 'unknown',
      });

      recordHistogram(
        'kafka_signal_error_duration_seconds',
        processingDuration / 1000,
        {
          topic,
          partition: partition.toString(),
          error_type: error.name || 'unknown',
        },
      );

      logger.error('Failed to process Kafka signal', {
        messageId,
        topic,
        partition,
        offset: message.offset,
        error: error.message,
        stack: error.stack,
        duration: processingDuration,
      });

      // For now, we continue processing (at-least-once delivery)
      // In production, you might want to send to a DLQ after retries
    } finally {
      this.processingCount--;

      // Send periodic heartbeat during long processing
      if (this.processingCount % 100 === 0) {
        await heartbeat();
      }
    }
  }

  private async reconnect(): Promise<void> {
    if (this.isRunning) {
      logger.info('Attempting to reconnect Kafka consumer', {
        groupId: config.KAFKA_GROUP_ID,
      });

      try {
        await this.stop();
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Brief pause
        await this.start();

        logger.info('Kafka consumer reconnected successfully', {
          groupId: config.KAFKA_GROUP_ID,
        });
      } catch (error) {
        logger.error('Failed to reconnect Kafka consumer', {
          error: error.message,
          groupId: config.KAFKA_GROUP_ID,
        });

        // Retry after longer delay
        setTimeout(() => this.reconnect(), 10000);
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping Kafka signal consumer', {
      groupId: config.KAFKA_GROUP_ID,
      processingCount: this.processingCount,
    });

    try {
      // Wait for in-flight messages to complete (with timeout)
      const maxWaitTime = 30000; // 30 seconds
      const waitStart = Date.now();

      while (this.processingCount > 0 && Date.now() - waitStart < maxWaitTime) {
        logger.info('Waiting for in-flight messages to complete', {
          processingCount: this.processingCount,
          waitTime: Date.now() - waitStart,
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.consumer.disconnect();
      this.isRunning = false;

      logger.info('Kafka signal consumer stopped', {
        groupId: config.KAFKA_GROUP_ID,
        lastOffsets: Object.fromEntries(this.lastCommittedOffsets),
      });
    } catch (error) {
      logger.error('Error stopping Kafka consumer', {
        error: error.message,
        stack: error.stack,
        groupId: config.KAFKA_GROUP_ID,
      });
    }
  }

  // Health check method
  isHealthy(): boolean {
    return this.isRunning && this.processingCount < 1000; // Reasonable processing queue
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      processingCount: this.processingCount,
      groupId: config.KAFKA_GROUP_ID,
      topic: config.KAFKA_TOPIC_COHERENCE,
      lastOffsets: Object.fromEntries(this.lastCommittedOffsets),
    };
  }
}

// Global consumer instance
let kafkaConsumer: KafkaSignalConsumer | null = null;

export async function startKafkaConsumer(): Promise<void> {
  if (config.KAFKA_ENABLED !== 'true') {
    logger.info('Kafka consumer disabled by configuration');
    return;
  }

  try {
    kafkaConsumer = new KafkaSignalConsumer();
    await kafkaConsumer.start();

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, stopping Kafka consumer');
      if (kafkaConsumer) {
        await kafkaConsumer.stop();
      }
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, stopping Kafka consumer');
      if (kafkaConsumer) {
        await kafkaConsumer.stop();
      }
    });
  } catch (error) {
    logger.error('Failed to start Kafka consumer', {
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
}

export function getKafkaConsumerStatus() {
  return (
    kafkaConsumer?.getStatus() || { isRunning: false, error: 'Not initialized' }
  );
}

export function isKafkaConsumerHealthy(): boolean {
  return kafkaConsumer?.isHealthy() || false;
}
