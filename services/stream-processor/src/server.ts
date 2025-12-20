import pino from 'pino';
import { PostgreSQLSink, RedisSink, MultiSink } from './sinks';

const logger = pino({ name: 'stream-processor' });

// Type definitions for workspace packages (resolved at runtime)
interface StreamMessage<T = unknown> {
  metadata: {
    eventId: string;
    eventType: string;
    timestamp: number;
    source: string;
  };
  payload: T;
}

interface ProcessingResult {
  success: boolean;
  retryable: boolean;
}

/**
 * Stream processor service
 *
 * This service processes events from Kafka topics and writes to various sinks.
 * In production, it integrates with:
 * - @intelgraph/kafka-integration for Kafka consumer
 * - @intelgraph/stream-analytics for metrics and enrichment
 * - @intelgraph/cep-engine for pattern matching
 */
class StreamProcessorService {
  private sinks: MultiSink | null = null;
  private isRunning = false;

  async start(): Promise<void> {
    logger.info('Starting stream processor service');

    // Initialize sinks
    const sinks: Array<PostgreSQLSink | RedisSink> = [];

    if (process.env.DATABASE_URL) {
      sinks.push(new PostgreSQLSink(process.env.DATABASE_URL));
    }

    if (process.env.REDIS_URL) {
      sinks.push(new RedisSink(process.env.REDIS_URL));
    }

    if (sinks.length > 0) {
      this.sinks = new MultiSink(sinks);
    }

    this.isRunning = true;

    logger.info('Stream processor service started');
    logger.info('Waiting for events...');

    // In production, this would initialize Kafka consumer and start processing
    // For now, we simulate a running service
    this.startHealthCheck();
  }

  private startHealthCheck(): void {
    setInterval(() => {
      if (this.isRunning) {
        logger.debug('Service health check: OK');
      }
    }, 30000);
  }

  async processMessage(message: StreamMessage): Promise<ProcessingResult> {
    try {
      logger.debug({ eventId: message.metadata.eventId }, 'Processing message');

      // Write to sinks
      if (this.sinks) {
        await this.sinks.write([message]);
      }

      return { success: true, retryable: false };
    } catch (error) {
      logger.error({ error }, 'Processing failed');
      return { success: false, retryable: true };
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping stream processor service');
    this.isRunning = false;

    if (this.sinks) {
      await this.sinks.close();
    }

    logger.info('Stream processor service stopped');
  }
}

// Start service
const service = new StreamProcessorService();

service.start().catch((error) => {
  logger.fatal({ error }, 'Failed to start service');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await service.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await service.stop();
  process.exit(0);
});

export { StreamProcessorService };
