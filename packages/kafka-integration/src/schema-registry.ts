import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';
import { StreamMessage, SchemaRegistryConfig } from './types';
import pino from 'pino';

const logger = pino({ name: 'schema-registry' });

/**
 * Schema Registry client for message schema management
 */
export class SchemaRegistryClient {
  private registry: SchemaRegistry;
  private schemaCache: Map<string, { id: number; schema: any }> = new Map();

  constructor(config: SchemaRegistryConfig) {
    this.registry = new SchemaRegistry({
      host: config.host,
      auth: config.auth,
      clientId: config.clientId,
    });
  }

  /**
   * Register a new schema
   */
  async registerSchema(
    subject: string,
    schema: any,
    type: SchemaType = SchemaType.AVRO
  ): Promise<number> {
    try {
      const { id } = await this.registry.register(
        { type, schema: JSON.stringify(schema) },
        { subject }
      );

      this.schemaCache.set(subject, { id, schema });

      logger.info({ subject, id }, 'Schema registered');
      return id;
    } catch (error) {
      logger.error({ error, subject }, 'Failed to register schema');
      throw error;
    }
  }

  /**
   * Get schema by subject
   */
  async getSchema(subject: string): Promise<any> {
    // Check cache first
    if (this.schemaCache.has(subject)) {
      return this.schemaCache.get(subject)!.schema;
    }

    try {
      const schema = await this.registry.getLatestSchemaId(subject);
      return schema;
    } catch (error) {
      logger.error({ error, subject }, 'Failed to get schema');
      throw error;
    }
  }

  /**
   * Encode message using schema
   */
  async encode<T = unknown>(
    subject: string,
    message: StreamMessage<T>
  ): Promise<Buffer> {
    try {
      const schemaId = await this.registry.getLatestSchemaId(subject);
      const encoded = await this.registry.encode(schemaId, message);
      return encoded;
    } catch (error) {
      logger.error({ error, subject }, 'Failed to encode message');
      throw error;
    }
  }

  /**
   * Decode message using schema
   */
  async decode(buffer: Buffer): Promise<StreamMessage> {
    try {
      const decoded = await this.registry.decode(buffer);
      return decoded as StreamMessage;
    } catch (error) {
      logger.error({ error }, 'Failed to decode message');
      throw error;
    }
  }

  /**
   * Check schema compatibility
   */
  async checkCompatibility(
    subject: string,
    schema: any,
    type: SchemaType = SchemaType.AVRO
  ): Promise<boolean> {
    try {
      const result = await this.registry.checkCompatibility(subject, {
        type,
        schema: JSON.stringify(schema),
      });
      return result.compatible;
    } catch (error) {
      logger.error({ error, subject }, 'Failed to check compatibility');
      throw error;
    }
  }
}
