import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import pino from 'pino';
import type { TwinService } from '../core/TwinService.js';
import type { EventBus } from '../core/EventBus.js';

const logger = pino({ name: 'StreamIngestion' });

interface IngestMessage {
  twinId: string;
  source: string;
  properties: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Stream Ingestion Pipeline
 * Handles real-time data ingestion from Kafka topics
 */
export class StreamIngestion {
  private kafka: Kafka;
  private consumer: Consumer;
  private twinService: TwinService;
  private eventBus: EventBus;
  private running = false;

  private topics = [
    'twin-data-updates',
    'iot-sensor-data',
    'entity-changes',
    'external-feeds',
  ];

  constructor(twinService: TwinService, eventBus: EventBus) {
    this.twinService = twinService;
    this.eventBus = eventBus;
    this.kafka = new Kafka({
      clientId: 'twin-ingestion',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });
    this.consumer = this.kafka.consumer({ groupId: 'twin-ingestion-group' });
  }

  async start(): Promise<void> {
    await this.consumer.connect();

    for (const topic of this.topics) {
      try {
        await this.consumer.subscribe({ topic, fromBeginning: false });
        logger.info({ topic }, 'Subscribed to topic');
      } catch (error) {
        logger.warn({ topic, error }, 'Failed to subscribe to topic');
      }
    }

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    this.running = true;
    logger.info('Stream ingestion started');
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.consumer.disconnect();
    logger.info('Stream ingestion stopped');
  }

  private async handleMessage({ topic, message }: EachMessagePayload): Promise<void> {
    if (!message.value) return;

    try {
      const data = JSON.parse(message.value.toString()) as IngestMessage;

      logger.debug({ topic, twinId: data.twinId }, 'Processing message');

      // Route based on topic
      switch (topic) {
        case 'twin-data-updates':
          await this.handleTwinUpdate(data);
          break;
        case 'iot-sensor-data':
          await this.handleSensorData(data);
          break;
        case 'entity-changes':
          await this.handleEntityChange(data);
          break;
        case 'external-feeds':
          await this.handleExternalFeed(data);
          break;
        default:
          logger.warn({ topic }, 'Unknown topic');
      }
    } catch (error) {
      logger.error({ topic, error }, 'Failed to process message');
    }
  }

  private async handleTwinUpdate(data: IngestMessage): Promise<void> {
    await this.twinService.updateState({
      twinId: data.twinId,
      properties: data.properties,
      source: data.source,
      confidence: 0.95,
    });
  }

  private async handleSensorData(data: IngestMessage): Promise<void> {
    // Transform sensor data format
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data.properties)) {
      transformed[`sensor_${key}`] = value;
    }

    await this.twinService.updateState({
      twinId: data.twinId,
      properties: transformed,
      source: `IOT:${data.source}`,
      confidence: 0.9,
    });
  }

  private async handleEntityChange(data: IngestMessage): Promise<void> {
    // Sync entity changes from main IntelGraph system
    await this.twinService.updateState({
      twinId: data.twinId,
      properties: data.properties,
      source: `ENTITY:${data.source}`,
      confidence: 0.99,
    });
  }

  private async handleExternalFeed(data: IngestMessage): Promise<void> {
    await this.twinService.updateState({
      twinId: data.twinId,
      properties: data.properties,
      source: `EXTERNAL:${data.source}`,
      confidence: 0.7, // Lower confidence for external data
    });
  }
}
