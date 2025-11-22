/**
 * S3 Bucket Connector
 *
 * Ingests files from S3-compatible object storage.
 * Supports AWS S3, MinIO, and other S3-compatible services.
 */

import { Readable } from 'stream';
import { PullConnector } from '../base-connector';
import type {
  ConnectorManifest,
  ConnectorConfig,
  ConnectorContext,
  ConnectorResult,
  ConnectorEntity,
} from '../types';

/**
 * Minimal S3 Client interface for dependency injection
 * Compatible with AWS SDK v3 (@aws-sdk/client-s3)
 */
export interface S3Client {
  listObjectsV2(params: {
    Bucket: string;
    Prefix?: string;
    MaxKeys?: number;
    ContinuationToken?: string;
  }): Promise<{
    Contents?: Array<{ Key?: string; Size?: number; LastModified?: Date }>;
    IsTruncated?: boolean;
    NextContinuationToken?: string;
  }>;

  getObject(params: {
    Bucket: string;
    Key: string;
  }): Promise<{
    Body?: Readable | ReadableStream<any> | Blob;
    ContentType?: string;
    ContentLength?: number;
  }>;
}

export interface S3BucketConnectorConfig {
  bucket: string;
  prefix?: string;
  filePattern?: string; // regex pattern to filter files
  maxFiles?: number;
  region?: string;
  endpoint?: string; // for S3-compatible services
  entityType?: string;
  parseJson?: boolean; // if true, parse JSON files
  parseNdjson?: boolean; // if true, parse NDJSON files
}

/**
 * S3 Bucket Connector
 */
export class S3BucketConnector extends PullConnector {
  readonly manifest: ConnectorManifest = {
    id: 's3-bucket-connector',
    name: 'S3 Bucket Connector',
    version: '1.0.0',
    description: 'Ingests files from S3-compatible object storage',
    status: 'stable',
    category: 'storage',
    capabilities: ['pull', 'batch', 'incremental'],
    entityTypes: ['GenericRecord', 'Document'],
    relationshipTypes: [],
    authentication: ['aws-credentials', 'iam-role'],
    requiredSecrets: [], // Optional: accessKeyId, secretAccessKey
    license: 'MIT',
    maintainer: 'IntelGraph Team',
    documentationUrl: 'https://docs.intelgraph.io/connectors/s3-bucket',
    tags: ['s3', 'aws', 'object-storage', 'files'],
    configSchema: {
      type: 'object',
      properties: {
        bucket: { type: 'string' },
        prefix: { type: 'string' },
        filePattern: { type: 'string' },
        maxFiles: { type: 'number' },
        region: { type: 'string', default: 'us-east-1' },
        endpoint: { type: 'string' },
        entityType: { type: 'string', default: 'Document' },
        parseJson: { type: 'boolean', default: false },
        parseNdjson: { type: 'boolean', default: false },
      },
      required: ['bucket'],
    },
  };

  private s3Config!: S3BucketConnectorConfig;
  private s3Client!: S3Client;

  /**
   * Set S3 client (for dependency injection)
   * Call this before initialize() to provide a custom S3 client
   */
  setS3Client(client: S3Client): void {
    this.s3Client = client;
  }

  protected async onInitialize(config: ConnectorConfig): Promise<void> {
    this.s3Config = config.config as S3BucketConnectorConfig;

    // Validate configuration
    if (!this.s3Config.bucket) {
      throw new Error('bucket is required');
    }

    // If S3 client not provided, create one using AWS SDK
    if (!this.s3Client) {
      this.s3Client = await this.createS3Client(config);
    }
  }

  /**
   * Create S3 client using AWS SDK v3
   * This is dynamically imported to avoid hard dependency
   */
  private async createS3Client(config: ConnectorConfig): Promise<S3Client> {
    try {
      // Dynamic import of AWS SDK v3
      const { S3Client: AWSS3Client } = await import('@aws-sdk/client-s3');
      const { ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3');

      const clientConfig: any = {
        region: this.s3Config.region || 'us-east-1',
      };

      // Add credentials if provided
      if (config.secrets.accessKeyId && config.secrets.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: config.secrets.accessKeyId,
          secretAccessKey: config.secrets.secretAccessKey,
        };
      }

      // Add endpoint for S3-compatible services (MinIO, etc.)
      if (this.s3Config.endpoint) {
        clientConfig.endpoint = this.s3Config.endpoint;
        clientConfig.forcePathStyle = true;
      }

      const awsClient = new AWSS3Client(clientConfig);

      // Wrap AWS client to match our interface
      return {
        async listObjectsV2(params) {
          const command = new ListObjectsV2Command(params);
          return await awsClient.send(command);
        },
        async getObject(params) {
          const command = new GetObjectCommand(params);
          const response = await awsClient.send(command);
          return {
            Body: response.Body as any,
            ContentType: response.ContentType,
            ContentLength: response.ContentLength,
          };
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to load AWS SDK. Install @aws-sdk/client-s3 or provide S3Client via setS3Client(): ${(error as Error).message}`
      );
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.s3Client.listObjectsV2({
        Bucket: this.s3Config.bucket,
        MaxKeys: 1,
      });

      return {
        success: true,
        message: `Successfully connected to S3 bucket: ${this.s3Config.bucket}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to S3 bucket: ${(error as Error).message}`,
      };
    }
  }

  async pull(context: ConnectorContext): Promise<ConnectorResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    let entitiesProcessed = 0;
    const errors: any[] = [];
    let filesProcessed = 0;

    try {
      const {
        bucket,
        prefix,
        filePattern,
        maxFiles,
        entityType = 'Document',
        parseJson = false,
        parseNdjson = false,
      } = this.s3Config;

      context.logger.info('Starting S3 bucket ingestion', {
        bucket,
        prefix,
        filePattern,
        maxFiles,
      });

      // Load cursor from state if available
      let continuationToken = await context.stateStore.getCursor();
      let hasMore = true;
      const filePatternRegex = filePattern ? new RegExp(filePattern) : null;

      while (hasMore) {
        this.checkAborted(context.signal);

        // Rate limiting
        await context.rateLimiter.acquire();

        // List objects
        const listResult = await this.s3Client.listObjectsV2({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken || undefined,
        });

        const objects = listResult.Contents || [];

        context.logger.debug('Listed S3 objects', {
          count: objects.length,
          hasMore: listResult.IsTruncated,
        });

        for (const object of objects) {
          if (!object.Key) continue;

          // Check file pattern
          if (filePatternRegex && !filePatternRegex.test(object.Key)) {
            context.logger.debug('Skipping file (pattern mismatch)', {
              key: object.Key,
            });
            continue;
          }

          // Check max files limit
          if (maxFiles && filesProcessed >= maxFiles) {
            context.logger.info('Reached max files limit', { maxFiles });
            hasMore = false;
            break;
          }

          try {
            await this.processS3Object(
              bucket,
              object.Key,
              entityType,
              parseJson,
              parseNdjson,
              context,
              (entity) => {
                entitiesProcessed++;
              }
            );

            filesProcessed++;
            context.metrics.increment('s3.files.processed', 1, {
              connector: this.manifest.id,
            });
          } catch (error) {
            context.logger.error('Error processing S3 object', error as Error, {
              bucket,
              key: object.Key,
            });

            errors.push({
              code: 'S3_OBJECT_PROCESSING_ERROR',
              message: (error as Error).message,
              recordId: object.Key,
              retryable: true,
            });
          }
        }

        // Update continuation token
        if (listResult.IsTruncated && listResult.NextContinuationToken) {
          continuationToken = listResult.NextContinuationToken;
          await context.stateStore.setCursor(continuationToken);
        } else {
          hasMore = false;
        }
      }

      await context.emitter.flush();

      const durationMs = Date.now() - startTime;
      context.logger.info('S3 bucket ingestion completed', {
        filesProcessed,
        entitiesProcessed,
        errorCount: errors.length,
        durationMs,
      });

      context.metrics.timing('s3.ingestion.duration', durationMs, {
        connector: this.manifest.id,
      });

      return {
        success: errors.length === 0,
        entitiesProcessed,
        relationshipsProcessed: 0,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        cursor: continuationToken || undefined,
        durationMs,
        metadata: {
          bucket,
          prefix,
          filesProcessed,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      context.logger.error('S3 bucket ingestion failed', error as Error);

      return this.failureResult(error as Error, entitiesProcessed, 0, durationMs);
    }
  }

  /**
   * Process a single S3 object
   */
  private async processS3Object(
    bucket: string,
    key: string,
    entityType: string,
    parseJson: boolean,
    parseNdjson: boolean,
    context: ConnectorContext,
    onEntity: (entity: ConnectorEntity) => void
  ): Promise<void> {
    const getResult = await this.s3Client.getObject({
      Bucket: bucket,
      Key: key,
    });

    if (!getResult.Body) {
      throw new Error(`No body in S3 object: ${key}`);
    }

    // Read body as string
    const body = await this.streamToString(getResult.Body);

    // Parse based on configuration
    if (parseJson) {
      const data = JSON.parse(body);

      if (Array.isArray(data)) {
        // Array of records
        for (let i = 0; i < data.length; i++) {
          const entity: ConnectorEntity = {
            type: entityType,
            externalId: this.generateExternalId(bucket, `${key}_${i}`),
            props: data[i],
            confidence: 1.0,
            observedAt: new Date(),
            sourceMeta: {
              bucket,
              key,
              index: i,
            },
          };

          await context.emitter.emitEntity(entity);
          onEntity(entity);
        }
      } else {
        // Single record
        const entity: ConnectorEntity = {
          type: entityType,
          externalId: this.generateExternalId(bucket, key),
          props: data,
          confidence: 1.0,
          observedAt: new Date(),
          sourceMeta: {
            bucket,
            key,
          },
        };

        await context.emitter.emitEntity(entity);
        onEntity(entity);
      }
    } else if (parseNdjson) {
      // Newline-delimited JSON
      const lines = body.split('\n').filter((line) => line.trim());

      for (let i = 0; i < lines.length; i++) {
        const data = JSON.parse(lines[i]);

        const entity: ConnectorEntity = {
          type: entityType,
          externalId: this.generateExternalId(bucket, `${key}_${i}`),
          props: data,
          confidence: 1.0,
          observedAt: new Date(),
          sourceMeta: {
            bucket,
            key,
            lineNumber: i + 1,
          },
        };

        await context.emitter.emitEntity(entity);
        onEntity(entity);
      }
    } else {
      // Treat as document
      const entity: ConnectorEntity = {
        type: entityType,
        externalId: this.generateExternalId(bucket, key),
        props: {
          content: body,
          contentType: getResult.ContentType,
          contentLength: getResult.ContentLength,
          fileName: key.split('/').pop(),
        },
        confidence: 1.0,
        observedAt: new Date(),
        sourceMeta: {
          bucket,
          key,
        },
      };

      await context.emitter.emitEntity(entity);
      onEntity(entity);
    }
  }

  /**
   * Convert stream to string
   */
  private async streamToString(stream: Readable | ReadableStream<any> | Blob): Promise<string> {
    if (stream instanceof Blob) {
      return await stream.text();
    }

    if (stream instanceof ReadableStream) {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      return result;
    }

    // Node.js Readable stream
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      (stream as Readable).on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      (stream as Readable).on('error', reject);
      (stream as Readable).on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }
}
