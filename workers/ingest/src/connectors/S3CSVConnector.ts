import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { trace, context } from '@opentelemetry/api';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { z } from 'zod';
import { BaseConnector } from './BaseConnector';
import type { ListObjectsV2CommandOutput, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import type {
  ConnectorConfig,
  IngestRecord,
  ProvenanceMetadata,
} from '../types';

const tracer = trace.getTracer('intelgraph-s3csv-connector');

interface S3CSVConfig extends ConnectorConfig {
  type: 's3csv';
  url: string; // s3://bucket/path format
  delimiter?: string;
  headers?: boolean;
  encoding?: string;
}

export class S3CSVConnector extends BaseConnector {
  private s3Client: S3Client;
  protected config: S3CSVConfig;

  constructor(config: S3CSVConfig) {
    super(config);
    this.config = config;

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-west-2',
      endpoint: process.env.AWS_ENDPOINT_URL,
      credentials: process.env.AWS_ENDPOINT_URL
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined,
      forcePathStyle: !!process.env.AWS_ENDPOINT_URL, // Required for MinIO
    });
  }

  async *ingest(): AsyncGenerator<IngestRecord> {
    const span = tracer.startSpan('s3csv-ingest', {
      attributes: {
        'connector.type': 's3csv',
        'connector.source': this.config.name,
        'connector.url': this.config.url,
      },
    });

    try {
      const { bucket, key } = this.parseS3Url(this.config.url);

      span.setAttributes({
        's3.bucket': bucket,
        's3.key': key,
      });

      // List objects to handle prefix-based ingestion
      const objects = await this.listObjects(bucket, key);

      for (const obj of objects) {
        if (!obj.Key) continue;

        const objectSpan = tracer.startSpan('process-s3-object', {
          attributes: {
            's3.object.key': obj.Key,
            's3.object.size': obj.Size || 0,
            's3.object.last_modified': obj.LastModified?.toISOString() || '',
          },
        });

        try {
          yield* this.processObject(bucket, obj.Key, {
            source_system: 'demo-csv',
            collection_method: 'batch_import',
            source_url: `s3://${bucket}/${obj.Key}`,
            collected_at: new Date().toISOString(),
            file_hash: await this.calculateObjectHash(bucket, obj.Key),
          });

          objectSpan.setStatus({ code: 1 }); // OK
        } catch (error) {
          objectSpan.recordException(error as Error);
          objectSpan.setStatus({ code: 2, message: (error as Error).message }); // ERROR
          this.logger.error('Failed to process S3 object', {
            bucket,
            key: obj.Key,
            error: (error as Error).message,
          });
        } finally {
          objectSpan.end();
        }
      }

      span.setStatus({ code: 1 }); // OK
      span.setAttributes({
        'ingest.objects_processed': objects.length,
      });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  }

  private parseS3Url(url: string): { bucket: string; key: string } {
    const match = url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid S3 URL format: ${url}`);
    }
    return { bucket: match[1], key: match[2] };
  }

  private async listObjects(
    bucket: string,
    prefix: string,
  ): Promise<Array<{ Key?: string; Size?: number; LastModified?: Date }>> {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000,
    });

    const response = (await this.s3Client.send(command)) as ListObjectsV2CommandOutput;
    return response.Contents || [];
  }

  private async *processObject(
    bucket: string,
    key: string,
    provenance: ProvenanceMetadata,
  ): AsyncGenerator<IngestRecord> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`Empty response body for s3://${bucket}/${key}`);
    }

    const stream = response.Body as NodeJS.ReadableStream;
    const parser = parse({
      delimiter: this.config.delimiter || ',',
      columns: this.config.headers !== false,
      skip_empty_lines: true,
      encoding: this.config.encoding || 'utf8',
    });

    let recordCount = 0;

    for await (const record of stream.pipe(parser)) {
      recordCount++;

      // Validate record against schema if provided
      if (this.config.schemaRef && this.schema) {
        try {
          this.schema.parse(record);
        } catch (error) {
          this.logger.warn({
            msg: 'Schema validation failed for record',
            record_number: recordCount,
            key,
            error: (error as Error).message,
          });
          continue;
        }
      }

      // Transform according to datasources.yaml configuration
      const transformed = this.transformRecord(record);

      yield {
        id: transformed.entity_id || `${key}-${recordCount}`,
        type: transformed.type || 'unknown',
        name: transformed.entity_name || transformed.name || '',
        attributes: transformed,
        pii_flags: this.detectPII(transformed),
        source_id: `s3:${bucket}/${key}`,
        provenance,
        retention_tier: this.config.retention || 'standard-365d',
        purpose: this.config.purpose || 'investigation',
        region: 'US', // Enforced for Topicality
      };
    }

    this.logger.info({
      msg: 'Processed S3 CSV object',
      bucket,
      key,
      records_processed: recordCount,
    });
  }

  private transformRecord(record: any): any {
    // Apply transform rules from datasources.yaml
    const rules = this.config.transform_rules || {};

    return {
      entity_id: record[rules.id_field || 'id'],
      entity_name: record[rules.name_field || 'name'],
      type: record[rules.entity_type_field || 'type'],
      ...record,
    };
  }

  private detectPII(record: any): Record<string, boolean> {
    const piiFields = ['name', 'email', 'phone', 'address', 'ssn'];
    const piiFlags: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        piiFlags[key] = this.isPIIField(key, value, piiFields);
      }
    }

    return piiFlags;
  }

  private isPIIField(
    fieldName: string,
    value: string,
    piiFields: string[],
  ): boolean {
    // Simple heuristic - in production, use more sophisticated PII detection
    const lowerFieldName = fieldName.toLowerCase();
    return (
      piiFields.some((pii) => lowerFieldName.includes(pii)) ||
      /\b[\w\.-]+@[\w\.-]+\.\w+\b/.test(value) || // Email pattern
      /\b\d{3}-?\d{2}-?\d{4}\b/.test(value)
    ); // SSN pattern
  }

  private async calculateObjectHash(
    bucket: string,
    key: string,
  ): Promise<string> {
    // Simple implementation - in production, use proper crypto hash
    return `sha256:${Buffer.from(`${bucket}/${key}${Date.now()}`).toString('base64')}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { bucket } = this.parseS3Url(this.config.url);
      await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          MaxKeys: 1,
        }),
      );
      return true;
    } catch (error) {
      this.logger.error({
        msg: 'S3 health check failed',
        error: (error as Error).message,
      });
      return false;
    }
  }
}
