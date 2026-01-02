// @ts-nocheck
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Logger } from './Logger.js';
import { SchemaRegistryClient } from './SchemaRegistry.js';
import { KafkaProducerWrapper } from './KafkaProducer.js';

export interface ConsumerConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
  schemaRegistry?: SchemaRegistryClient;
  dlqProducer?: KafkaProducerWrapper;
  dlqTopic?: string;
  partitionsConsumedConcurrently?: number;
}

export type MessageHandler = (message: any) => Promise<void>;

export class KafkaConsumerWrapper {
  private consumer: Consumer;
  private logger = new Logger('KafkaConsumer');
  private schemaRegistry?: SchemaRegistryClient;
  private dlqProducer?: KafkaProducerWrapper;
  private dlqTopic?: string;
  private isConnected = false;
  private config: ConsumerConfig;

  constructor(config: ConsumerConfig) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      logLevel: 0,
    });

    this.consumer = kafka.consumer({ groupId: config.groupId });
    this.schemaRegistry = config.schemaRegistry;
    this.dlqProducer = config.dlqProducer;
    this.dlqTopic = config.dlqTopic;
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.consumer.connect();
        this.isConnected = true;
        this.logger.info('Connected to Kafka Consumer');
      } catch (error: any) {
        this.logger.error('Failed to connect to Kafka Consumer', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.consumer.disconnect();
      this.isConnected = false;
      this.logger.info('Disconnected from Kafka Consumer');
    }
  }

  async subscribe(topic: string, fromBeginning: boolean = false): Promise<void> {
    await this.connect();
    await this.consumer.subscribe({ topic, fromBeginning });
    this.logger.info(`Subscribed to topic ${topic}`);
  }

  async run(handler: MessageHandler): Promise<void> {
    await this.connect();
    await this.consumer.run({
      partitionsConsumedConcurrently: this.config.partitionsConsumedConcurrently || 1,
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          let payload: any;
          if (message.value) {
            if (this.schemaRegistry) {
              payload = await this.schemaRegistry.decode(message.value);
            } else {
              payload = JSON.parse(message.value.toString());
            }
          }
          await handler(payload);
        } catch (error: any) {
          this.logger.error(`Error processing message from topic ${topic}`, error);

          if (this.dlqProducer && this.dlqTopic && message.value) {
            try {
              // Wrap original message with error metadata
              const dlqPayload = {
                originalTopic: topic,
                originalPartition: partition,
                originalValue: message.value.toString('base64'),
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              };
              await this.dlqProducer.send(this.dlqTopic, [dlqPayload]);
              this.logger.info(`Sent failed message to DLQ ${this.dlqTopic}`);
              return;
            } catch (dlqError) {
              this.logger.error('Failed to send to DLQ', dlqError);
              throw dlqError;
            }
          }

          throw error;
        }
      },
    });
  }
}
