// @ts-nocheck
import { Logger } from './Logger.js';
import { GlueClient, GetSchemaCommand, CreateSchemaCommand } from '@aws-sdk/client-glue';

export interface SchemaRegistryClient {
  register(subject: string, schema: any): Promise<number>;
  getId(subject: string, schema: any): Promise<number>;
  getSchema(id: number): Promise<any>;
  encode(id: number, payload: any): Promise<Buffer>;
  decode(buffer: Buffer): Promise<any>;
}

export class MockSchemaRegistry implements SchemaRegistryClient {
  private schemas: Map<number, any> = new Map();
  private subjects: Map<string, number> = new Map();
  private idCounter = 1;
  private logger = new Logger('MockSchemaRegistry');

  async register(subject: string, schema: any): Promise<number> {
    const id = this.idCounter++;
    this.schemas.set(id, schema);
    this.subjects.set(subject, id);
    this.logger.info(`Registered schema for subject ${subject} with ID ${id}`);
    return id;
  }

  async getId(subject: string, schema: any): Promise<number> {
    const id = this.subjects.get(subject);
    if (!id) {
      return this.register(subject, schema);
    }
    return id;
  }

  async getSchema(id: number): Promise<any> {
    const schema = this.schemas.get(id);
    if (!schema) {
      throw new Error(`Schema with ID ${id} not found`);
    }
    return schema;
  }

  async encode(id: number, payload: any): Promise<Buffer> {
    // Wire format: [MagicByte (1)] [SchemaID (4)] [Payload]
    const payloadBuf = Buffer.from(JSON.stringify(payload));
    const buffer = Buffer.alloc(1 + 4 + payloadBuf.length);
    buffer.writeUInt8(0, 0); // Magic Byte
    buffer.writeUInt32BE(id, 1); // Schema ID
    payloadBuf.copy(buffer, 5);
    return buffer;
  }

  async decode(buffer: Buffer): Promise<any> {
    if (buffer.readUInt8(0) !== 0) {
      throw new Error('Invalid Magic Byte');
    }
    // const schemaId = buffer.readUInt32BE(1);
    const payloadBuf = buffer.subarray(5);
    return JSON.parse(payloadBuf.toString());
  }
}

export class GlueSchemaRegistry implements SchemaRegistryClient {
  private client: GlueClient;
  private logger = new Logger('GlueSchemaRegistry');
  private registryName: string;
  private idCache: Map<string, number> = new Map();

  constructor(region: string, registryName: string) {
    this.client = new GlueClient({ region });
    this.registryName = registryName;
  }

  async register(subject: string, schema: any): Promise<number> {
    // Check cache first
    if (this.idCache.has(subject)) {
      return this.idCache.get(subject)!;
    }

    try {
      // Try to get existing
      return await this.getId(subject, schema);
    } catch (e: any) {
      if (e.name === 'EntityNotFoundException') {
        try {
          // Create Schema
          const schemaDef = JSON.stringify({
             "$id": `https://example.com/${subject}`,
             "$schema": "https://json-schema.org/draft/2020-12/schema",
             "title": subject,
             "type": "object",
             "properties": {} // Simplified generic schema
          });

          await this.client.send(new CreateSchemaCommand({
            RegistryId: { RegistryName: this.registryName },
            SchemaName: subject,
            DataFormat: 'JSON',
            Compatibility: 'BACKWARD',
            SchemaDefinition: schemaDef
          }));
          this.logger.info(`Created new schema for ${subject}`);
          // Recurse to get ID (assumes creation sets version 1)
          return await this.getId(subject, schema);
        } catch (createErr) {
          this.logger.error(`Failed to create schema for ${subject}`, createErr);
          throw createErr;
        }
      }
      throw e;
    }
  }

  async getId(subject: string, schema: any): Promise<number> {
    if (this.idCache.has(subject)) {
      return this.idCache.get(subject)!;
    }

    try {
      const command = new GetSchemaCommand({
        SchemaId: { SchemaName: subject, RegistryName: this.registryName }
      });
      const response = await this.client.send(command);
      const version = response.LatestSchemaVersion;
      const id = typeof version === 'number' ? version : parseInt(String(version || '1'));

      this.idCache.set(subject, id);
      return id;
    } catch (error: any) {
      // Don't log error here if we expect caller to handle EntityNotFound (like register)
      // But usually getId is called by producer expecting success.
      // Re-throwing so caller can decide.
      throw error;
    }
  }

  async getSchema(id: number): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async encode(id: number, payload: any): Promise<Buffer> {
    const payloadBuf = Buffer.from(JSON.stringify(payload));
    const buffer = Buffer.alloc(1 + 4 + payloadBuf.length);
    buffer.writeUInt8(0, 0); // Magic Byte
    buffer.writeUInt32BE(id, 1); // Schema ID
    payloadBuf.copy(buffer, 5);
    return buffer;
  }

  async decode(buffer: Buffer): Promise<any> {
    if (buffer.length < 5) {
      throw new Error('Buffer too short');
    }
    if (buffer.readUInt8(0) !== 0) {
      throw new Error('Invalid Magic Byte');
    }
    const payloadBuf = buffer.subarray(5);
    return JSON.parse(payloadBuf.toString());
  }
}
