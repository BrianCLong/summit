import { Kafka, Producer } from 'kafkajs';
import { randomUUID } from 'crypto';
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

interface LoadTestConfig {
  brokers: string[];
  topic: string;
  targetThroughput: number; // events per second
  duration: number; // seconds
  batchSize: number;
}

class LoadTester {
  private kafka: Kafka;
  private producer: Producer;
  private config: LoadTestConfig;
  private eventsSent = 0;
  private startTime = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.kafka = new Kafka({
      clientId: 'load-tester',
      brokers: config.brokers,
    });
    this.producer = this.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
      transactionalId: `load-tester-${randomUUID()}`,
    });
  }

  async run(): Promise<void> {
    await this.producer.connect();
    logger.info({ config: this.config }, 'Load test starting');

    this.startTime = Date.now();
    const endTime = this.startTime + this.config.duration * 1000;

    const intervalMs = (this.config.batchSize / this.config.targetThroughput) * 1000;

    const interval = setInterval(async () => {
      if (Date.now() >= endTime) {
        clearInterval(interval);
        await this.finish();
        return;
      }

      await this.sendBatch();
    }, intervalMs);
  }

  private async sendBatch(): Promise<void> {
    const messages = [];

    for (let i = 0; i < this.config.batchSize; i++) {
      messages.push({
        key: randomUUID(),
        value: JSON.stringify(this.generateEvent()),
      });
    }

    try {
      await this.producer.send({
        topic: this.config.topic,
        messages,
      });

      this.eventsSent += messages.length;

      const elapsed = (Date.now() - this.startTime) / 1000;
      const currentThroughput = Math.round(this.eventsSent / elapsed);

      if (this.eventsSent % 1000 === 0) {
        logger.info(
          {
            sent: this.eventsSent,
            elapsed: elapsed.toFixed(1),
            throughput: currentThroughput,
            target: this.config.targetThroughput,
          },
          'Progress'
        );
      }
    } catch (error) {
      logger.error({ error }, 'Failed to send batch');
    }
  }

  private generateEvent() {
    const eventTypes = [
      'entity.created',
      'entity.updated',
      'relationship.created',
      'analytics.completed',
      'audit.logged',
    ];

    const sources = [
      'intelligence-platform',
      'copilot-service',
      'data-ingestion',
      'external-feed',
    ];

    return {
      id: randomUUID(),
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      timestamp: Date.now(),
      data: {
        entityId: `entity-${randomUUID()}`,
        value: Math.random(),
        metadata: {
          randomField1: Math.random().toString(36),
          randomField2: Math.floor(Math.random() * 1000),
        },
      },
      metadata: {
        version: '1.0.0',
        userId: `user-${Math.floor(Math.random() * 100)}`,
        tenantId: `tenant-${Math.floor(Math.random() * 10)}`,
      },
      provenance: {
        policyTags: ['LOAD_TEST'],
        classification: 'UNCLASSIFIED',
        source: 'load-tester',
      },
    };
  }

  private async finish(): Promise<void> {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const actualThroughput = Math.round(this.eventsSent / elapsed);

    logger.info(
      {
        totalEvents: this.eventsSent,
        duration: elapsed.toFixed(1),
        targetThroughput: this.config.targetThroughput,
        actualThroughput,
        efficiency: ((actualThroughput / this.config.targetThroughput) * 100).toFixed(1) + '%',
      },
      'Load test completed'
    );

    await this.producer.disconnect();
    process.exit(0);
  }
}

// Run load test
const config: LoadTestConfig = {
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  topic: process.env.KAFKA_TOPIC || 'events',
  targetThroughput: parseInt(process.env.TARGET_THROUGHPUT || '10000', 10),
  duration: parseInt(process.env.DURATION || '60', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
};

const tester = new LoadTester(config);
tester.run().catch((error) => {
  logger.error({ error }, 'Load test failed');
  process.exit(1);
});
