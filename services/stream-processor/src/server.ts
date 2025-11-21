import pino from 'pino';
import { KafkaConsumer, TopicNames } from '@intelgraph/kafka-integration';
import { DataStream } from '@intelgraph/stream-processing';
import { MetricsCalculator, EnrichmentEngine } from '@intelgraph/stream-analytics';
import { PatternMatcher, FraudPatterns } from '@intelgraph/cep-engine';
import { PostgreSQLSink, RedisSink, MultiSink } from './sinks';

const logger = pino({ name: 'stream-processor' });

/**
 * Stream processor service
 */
class StreamProcessorService {
  private consumer!: KafkaConsumer;
  private metrics!: MetricsCalculator;
  private enrichment!: EnrichmentEngine;
  private patternMatcher!: PatternMatcher;
  private sinks!: MultiSink;

  async start(): Promise<void> {
    logger.info('Starting stream processor service');

    // Initialize components
    this.metrics = new MetricsCalculator(process.env.REDIS_URL);
    this.enrichment = new EnrichmentEngine(process.env.REDIS_URL);
    this.patternMatcher = new PatternMatcher();

    // Register fraud detection patterns
    this.patternMatcher.registerPattern(FraudPatterns.bruteForceLogin);
    this.patternMatcher.registerPattern(FraudPatterns.unusualTransaction);

    // Initialize sinks
    const pgSink = new PostgreSQLSink(process.env.DATABASE_URL || '');
    const redisSink = new RedisSink(process.env.REDIS_URL || '');
    this.sinks = new MultiSink([pgSink, redisSink]);

    // Initialize Kafka consumer
    this.consumer = new KafkaConsumer(
      {
        brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
        clientId: 'stream-processor',
      },
      {
        groupId: 'stream-processor-group',
      },
      process.env.SCHEMA_REGISTRY_URL
    );

    await this.consumer.connect();

    // Subscribe to topics
    await this.consumer.subscribe([
      TopicNames.EVENTS,
      TopicNames.ENTITIES,
      TopicNames.RELATIONSHIPS,
    ]);

    // Register message handler
    this.consumer.registerHandler(TopicNames.EVENTS, async (message, metadata) => {
      try {
        // Track metrics
        await this.metrics.increment('events.processed');

        // Enrich data
        const enriched = await this.enrichment.enrichMultiSource(message.payload, [
          async (data: any) => {
            if (data.ip) {
              return { geo: await this.enrichment.enrichGeolocation(data.ip) };
            }
            return {};
          },
        ]);

        // Pattern matching for CEP
        const matches = this.patternMatcher.processEvent(enriched);

        if (matches.length > 0) {
          logger.warn({ matches }, 'Pattern matches detected');
          await this.metrics.increment('patterns.matched', matches.length);
        }

        // Write to sinks
        await this.sinks.write([{ ...message, payload: enriched }]);

        return { success: true, retryable: false };
      } catch (error) {
        logger.error({ error, metadata }, 'Processing failed');
        return { success: false, retryable: true };
      }
    });

    // Start consuming
    await this.consumer.start();

    logger.info('Stream processor service started');
  }

  async stop(): Promise<void> {
    logger.info('Stopping stream processor service');

    if (this.consumer) {
      await this.consumer.stop();
    }

    if (this.sinks) {
      await this.sinks.close();
    }

    if (this.metrics) {
      await this.metrics.disconnect();
    }

    if (this.enrichment) {
      await this.enrichment.disconnect();
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
