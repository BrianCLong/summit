// @ts-nocheck
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { Logger } from './Logger.js';
import { SchemaRegistryClient } from './SchemaRegistry.js';

export interface ProducerConfig {
  clientId: string;
  brokers: string[];
  schemaRegistry?: SchemaRegistryClient;
}

export class KafkaProducerWrapper {
  private producer: Producer;
  private logger = new Logger('KafkaProducer');
  private schemaRegistry?: SchemaRegistryClient;
  private isConnected = false;

  constructor(config: ProducerConfig) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      logLevel: 0, // ERROR only
    });

    this.producer = kafka.producer();
    this.schemaRegistry = config.schemaRegistry;
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        this.logger.info('Connected to Kafka Producer');
      } catch (error: any) {
        this.logger.error('Failed to connect to Kafka Producer', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      this.logger.info('Disconnected from Kafka Producer');
    }
  }

  async send(topic: string, messages: any[]): Promise<void> {
    await this.connect();

    const kafkaMessages = await Promise.all(messages.map(async (msg) => {
      let value: Buffer | string;
      if (this.schemaRegistry) {
        // Dynamic schema lookup based on topic name (subject)
        // We assume subject naming strategy is TopicNameStrategy
        const subject = topic;
        // We pass 'msg' as schema to check compatibility or registration
        // In a real system we might cache this ID.
        const schemaId = await this.schemaRegistry.getId(subject, msg);
        value = await this.schemaRegistry.encode(schemaId, msg);
      } else {
        value = JSON.stringify(msg);
      }

      return {
        value,
      };
    }));

    try {
      await this.producer.send({
        topic,
        messages: kafkaMessages,
      });
    } catch (error: any) {
      this.logger.error(`Failed to send messages to topic ${topic}`, error);
      throw error;
    }
  }
}
