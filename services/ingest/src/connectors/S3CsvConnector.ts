import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { Connector } from '../lib/Connector'; // Assumed location
import { IngestRecord, ConnectorConfig } from '../types'; // Assumed location
import { logger } from '../utils/logger'; // Assumed location

interface S3CsvConfig extends ConnectorConfig {
  parameters: {
    bucket: string;
    key: string;
    region?: string;
    delimiter?: string;
    hasHeaders?: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

export class S3CsvConnector extends Connector {
  private s3Client: S3Client;
  private stream: Readable | null = null;

  constructor(config: S3CsvConfig) {
    super(config);
    this.s3Client = new S3Client({
      region: config.parameters.region || 'us-east-1',
      credentials: {
        accessKeyId: config.parameters.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.parameters.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async connect(): Promise<void> {
    try {
      logger.info({
        message: 'Connecting to S3',
        bucket: this.config.parameters.bucket,
        key: this.config.parameters.key,
      });

      // Basic connectivity check (HeadObject would be better, but we'll trust GetObject for MVP)
      this.connected = true;
    } catch (error) {
      logger.error('Failed to connect to S3', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stream = null;
    this.connected = false;
    this.s3Client.destroy();
  }

  async *fetchData(): AsyncGenerator<IngestRecord[], void, unknown> {
    if (!this.connected) throw new Error('Not connected');

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.parameters.bucket,
        Key: this.config.parameters.key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      this.stream = response.Body as Readable;

      const records: IngestRecord[] = [];
      const parser = this.stream.pipe(csv({
        separator: this.config.parameters.delimiter || ',',
        headers: this.config.parameters.hasHeaders !== false,
      }));

      for await (const row of parser) {
        const record = this.processRow(row);
        if (record) {
          records.push(record);
        }

        // Batch yielding
        if (records.length >= (this.config.batchSize || 100)) {
          yield records.splice(0, records.length);
        }
      }

      // Yield remaining
      if (records.length > 0) {
        yield records;
      }

    } catch (error) {
      logger.error('Error fetching data from S3', error);
      throw error;
    }
  }

  private processRow(row: any): IngestRecord | null {
    // Basic provenance attachment
    const provenance = {
      source: 's3',
      bucket: this.config.parameters.bucket,
      key: this.config.parameters.key,
      ingested_at: new Date().toISOString(),
      row_hash: this.calculateHash(JSON.stringify(row))
    };

    // Schema mapping would go here based on config
    return {
      id: row.id || this.generateId(),
      type: this.config.parameters.entityType || 'Dynamic',
      properties: row,
      provenance,
    };
  }

  private calculateHash(data: string): string {
    // Placeholder for hash function
    return `hash-${data.length}`;
  }

  private generateId(): string {
    return `s3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
