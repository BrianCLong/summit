import {
  BaseConnector,
  ConnectorConfig,
  IngestRecord,
} from '../sdk/ConnectorSDK.js';
import { logger } from '../utils/logger.js';
import { createHash, randomUUID } from 'crypto';

export class S3CsvConnector extends BaseConnector {
  private connection: any = null;
  private currentRunId: string;
  private readonly parserVersion = '1.2.0';

  constructor() {
    const config: ConnectorConfig = {
      id: 's3-csv',
      name: 'S3 CSV Connector',
      version: '1.1.0',
      description: 'Ingest CSV data from AWS S3 buckets with integrated hardened provenance tracking',
      supportedFormats: ['text/csv'],
      batchSize: 100,
      maxRetries: 3,
      timeout: 30000,
      parameters: [
        {
          name: 'bucket',
          type: 'string',
          required: true,
          description: 'S3 Bucket name',
        },
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'S3 Object key',
        },
        {
          name: 'region',
          type: 'string',
          required: false,
          description: 'AWS Region',
          defaultValue: 'us-east-1',
        }
      ],
    };

    super(config);
    this.currentRunId = randomUUID();
  }

  async validate(parameters: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    if (!parameters.bucket) errors.push('Bucket is required');
    if (!parameters.key) errors.push('Key is required');
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    return { success: true, message: 'S3 Connection Mock Success' };
  }

  async connect(): Promise<void> {
    logger.info(`Connecting to S3 bucket ${this.parameters.bucket}`);
    this.currentRunId = randomUUID();
    this.connection = null;
  }

  async disconnect(): Promise<void> {
    this.connection = null;
    logger.info('Disconnected from S3');
  }

  async *fetchData(): AsyncGenerator<IngestRecord[], void, unknown> {
    // Stub
    yield [];
  }

  /**
   * Deterministically serialize an object or array by sorting keys alphabetically.
   * Matches @intelgraph/prov-ledger-core logic.
   */
  private canonicalSerialize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.canonicalSerialize(item)).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    const parts = sortedKeys.map(key => {
      return JSON.stringify(key) + ':' + this.canonicalSerialize(obj[key]);
    });
    return '{' + parts.join(',') + '}';
  }

  protected createProvenanceMetadata(row: any, objectContentHash: string = 'unknown') {
    const recordHash = createHash('sha256')
      .update(this.canonicalSerialize(row))
      .digest('hex');

    return {
      source_uri: `s3://${this.parameters.bucket}/${this.parameters.key}`,
      content_hash: objectContentHash,
      record_hash: recordHash,
      ingest_time: new Date().toISOString(),
      ingest_run_id: this.currentRunId,
      parser_version: this.parserVersion,
      operator: 'system-agent',
      method: 'S3CsvConnector'
    };
  }
}
