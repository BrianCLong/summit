import {
  PullConnector,
  ConnectorContext,
  ConnectorResult,
  ConnectorConfig,
  ConnectorManifest,
  ConnectorEntity,
} from '@summit/connector-sdk';
import { GCSConnector, GCSObjectMetadata } from './gcs.js';
import pLimit from 'p-limit';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import readline from 'readline';

interface SchemaConfig {
  entityType?: string;
  idField?: string;
  fieldMap?: Record<string, string>;
}

export class GCSBatchConnector extends PullConnector {
  readonly manifest: ConnectorManifest = {
    id: 'gcs-batch-ingest',
    name: 'GCS Batch Ingestion',
    version: '1.0.0',
    description: 'Batch ingestion from Google Cloud Storage with schema mapping',
    status: 'stable',
    category: 'storage',
    capabilities: ['pull', 'batch'],
    entityTypes: ['*'],
    relationshipTypes: [],
    authentication: ['service-account', 'api-key'],
    requiredSecrets: ['projectId', 'bucketName'],
    configSchema: {
      type: 'object',
      properties: {
        prefix: { type: 'string' },
        batchSize: { type: 'number' },
        concurrency: { type: 'number' },
        schema: { type: 'object' },
      },
    },
    license: 'MIT',
    maintainer: 'IntelGraph',
  };

  private gcs?: GCSConnector;
  private batchSize = 100;
  private concurrency = 5;
  private schemaConfig: SchemaConfig = {};

  protected async onInitialize(config: ConnectorConfig): Promise<void> {
    const { projectId, bucketName, credentials } = config.secrets;
    const {
      batchSize,
      concurrency,
      schema,
      projectId: cfgProjectId,
      bucketName: cfgBucketName,
    } = config.config as any;

    this.batchSize = batchSize || 100;
    this.concurrency = concurrency || 5;
    this.schemaConfig = schema || {};

    this.gcs = new GCSConnector(config.tenantId, {
      projectId: projectId || cfgProjectId,
      bucketName: bucketName || cfgBucketName,
      credentials: credentials ? JSON.parse(credentials) : undefined,
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.gcs) return { success: false, message: 'Not initialized' };
    const result = await this.gcs.healthCheck();
    return {
      success: result.healthy,
      message: result.error || 'Connected',
    };
  }

  async pull(context: ConnectorContext): Promise<ConnectorResult> {
    this.ensureInitialized();
    if (!this.gcs) throw new Error('GCS Connector not initialized');

    const startTime = Date.now();
    let entitiesProcessed = 0;
    let errorCount = 0;
    const limit = pLimit(this.concurrency);
    const prefix = (this.config?.config.prefix as string) || '';

    try {
      let pageToken = (await context.stateStore.getCursor()) || undefined;
      let hasMore = true;

      while (hasMore && !context.signal.aborted) {
        const result = await this.gcs.listObjects({
          prefix,
          pageToken,
          maxResults: this.batchSize,
        });

        const files = result.objects;
        pageToken = result.nextPageToken;
        hasMore = !!pageToken;

        await Promise.all(
          files.map((file) =>
            limit(async () => {
              if (context.signal.aborted) return;

              const stateKey = `file:${file.name}`;
              const lastEtag = await context.stateStore.get<string>(stateKey);

              if (lastEtag === file.etag) {
                context.logger.debug(`Skipping already ingested file: ${file.name}`);
                return;
              }

              context.logger.info(`Processing file: ${file.name}`);

              try {
                const isNdjson = file.name.endsWith('.jsonl') || file.name.endsWith('.ndjson');
                const isJson = file.name.endsWith('.json');
                const isCsv = file.name.endsWith('.csv');

                if (!isJson && !isCsv && !isNdjson) {
                  context.logger.warn(`Unsupported file type: ${file.name}`);
                  return;
                }

                // Check size for buffered JSON
                if (isJson && file.size > 100 * 1024 * 1024) {
                  throw new Error(`File too large for JSON buffering (limit 100MB): ${file.size} bytes. Use .ndjson for large files.`);
                }

                const stream = await this.gcs!.downloadStream(file.name);
                let count = 0;

                if (isNdjson) {
                  count = await this.processNdjsonStream(stream, file, context);
                } else if (isJson) {
                  count = await this.processJsonStream(stream, file, context);
                } else if (isCsv) {
                  count = await this.processCsvStream(stream, file, context);
                }

                if (count > 0) {
                  await context.stateStore.set(stateKey, file.etag);
                  entitiesProcessed += count;
                }
              } catch (err) {
                context.logger.error(`Error processing file ${file.name}`, err as Error);
                errorCount++;
              }
            }),
          ),
        );

        if (pageToken) {
          await context.stateStore.setCursor(pageToken);
        }
      }

      return {
        success: true,
        entitiesProcessed,
        relationshipsProcessed: 0,
        errorCount,
        durationMs: Date.now() - startTime,
        cursor: pageToken,
      };
    } catch (error) {
      return this.failureResult(
        error as Error,
        entitiesProcessed,
        0,
        Date.now() - startTime,
      );
    }
  }

  private async processJsonStream(
    stream: Readable,
    metadata: GCSObjectMetadata,
    context: ConnectorContext,
  ): Promise<number> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString('utf-8');

    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      context.logger.error(`Invalid JSON in ${metadata.name}`);
      throw e; // Let pull catch it as a file error
    }

    const records = Array.isArray(data) ? data : [data];
    let count = 0;

    for (const record of records) {
      const entity = this.mapRecordToEntity(record, metadata, count);
      await context.emitter.emitEntity(entity);
      count++;
    }
    return count;
  }

  private async processNdjsonStream(
    stream: Readable,
    metadata: GCSObjectMetadata,
    context: ConnectorContext,
  ): Promise<number> {
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let count = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        const entity = this.mapRecordToEntity(record, metadata, count);
        await context.emitter.emitEntity(entity);
        count++;
      } catch (e) {
        context.logger.warn(`Invalid JSON line in ${metadata.name}: ${(e as Error).message}`);
        // We log line errors but don't fail the file?
        // Or we could track partial errors. For now, just warn.
      }
    }
    return count;
  }

  private async processCsvStream(
    stream: Readable,
    metadata: GCSObjectMetadata,
    context: ConnectorContext,
  ): Promise<number> {
    let count = 0;

    await pipeline(
      stream,
      parse({ columns: true, skip_empty_lines: true }),
      async (source) => {
        for await (const record of source) {
          const entity = this.mapRecordToEntity(record, metadata, count);
          await context.emitter.emitEntity(entity);
          count++;
        }
      },
    );

    return count;
  }

  private mapRecordToEntity(
    record: any,
    metadata: GCSObjectMetadata,
    index: number,
  ): ConnectorEntity {
    const { entityType, idField, fieldMap } = this.schemaConfig;

    let externalId: string;
    if (idField && record[idField]) {
      externalId = String(record[idField]);
    } else {
      externalId = `${metadata.name}#${index}`;
    }

    const props: Record<string, any> = {};
    if (fieldMap) {
      for (const [source, target] of Object.entries(fieldMap)) {
        if (record[source] !== undefined) {
          props[target] = record[source];
        }
      }
    } else {
      Object.assign(props, record);
    }

    return {
      type: entityType || 'Document',
      externalId: this.generateExternalId(metadata.bucket, externalId),
      props,
      sourceMeta: {
        bucket: metadata.bucket,
        key: metadata.name,
        etag: metadata.etag,
        contentType: metadata.contentType,
        processedAt: new Date(),
      },
    };
  }
}
