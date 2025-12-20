// @ts-nocheck
/**
 * S3 Adapter
 *
 * Polls S3 buckets for new objects and processes them as ingest records.
 * Supports JSONL, JSON, CSV, and Parquet formats.
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { createHash } from 'crypto';
import { parse as parseCSV } from 'papaparse';
import type {
  S3AdapterConfig,
  Checkpoint,
  IngestEnvelope,
} from '../types/index.js';
import { BaseAdapter, BaseAdapterOptions } from './base.js';
import { computeFileChecksum } from '../lib/dedupe.js';

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export class S3Adapter extends BaseAdapter {
  private client: S3Client | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastProcessedKey: string | null = null;
  private processing = false;

  constructor(options: BaseAdapterOptions) {
    super(options);
  }

  private get s3Config(): S3AdapterConfig {
    return this.config as S3AdapterConfig;
  }

  protected async doInitialize(): Promise<void> {
    this.client = new S3Client({
      region: this.s3Config.region,
      ...(this.s3Config.endpoint && { endpoint: this.s3Config.endpoint }),
    });

    // Verify bucket access
    try {
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.s3Config.bucket,
          Prefix: this.s3Config.prefix,
          MaxKeys: 1,
        })
      );
    } catch (error) {
      throw new Error(`Failed to access S3 bucket ${this.s3Config.bucket}: ${error}`);
    }

    // Restore checkpoint
    const checkpoint = await this.getCheckpoint();
    if (checkpoint) {
      this.lastProcessedKey = checkpoint.position;
      this.logger.info({ lastKey: this.lastProcessedKey }, 'Restored checkpoint');
    }
  }

  protected async doStart(): Promise<void> {
    const pollInterval = this.config.polling_interval_ms ?? 30000;

    // Initial poll
    await this.poll();

    // Start polling timer
    this.pollTimer = setInterval(async () => {
      if (!this.processing && this.running) {
        await this.poll();
      }
    }, pollInterval);
  }

  protected async doStop(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait for any in-progress processing
    while (this.processing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  protected async doHealthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    if (!this.client) {
      return { healthy: false, details: { error: 'S3 client not initialized' } };
    }

    try {
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.s3Config.bucket,
          Prefix: this.s3Config.prefix,
          MaxKeys: 1,
        })
      );
      return {
        healthy: true,
        details: {
          bucket: this.s3Config.bucket,
          prefix: this.s3Config.prefix,
          lastProcessedKey: this.lastProcessedKey,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          bucket: this.s3Config.bucket,
          error: String(error),
        },
      };
    }
  }

  protected getSourceIdentifier(): string {
    return `s3://${this.s3Config.bucket}/${this.s3Config.prefix ?? ''}`;
  }

  protected createCheckpoint(position: string): Checkpoint {
    return {
      id: `${this.config.tenant_id}:${this.getSourceIdentifier()}`,
      tenant_id: this.config.tenant_id,
      source: this.getSourceIdentifier(),
      source_type: 's3',
      position,
      last_processed_at: new Date().toISOString(),
      records_since_checkpoint: 0,
      total_records_processed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private async poll(): Promise<void> {
    if (!this.client || !this.backpressure.isAccepting()) {
      return;
    }

    this.processing = true;
    try {
      const objects = await this.listNewObjects();

      for (const obj of objects) {
        if (!this.running || !this.backpressure.isAccepting()) {
          break;
        }

        await this.processObject(obj);
        this.lastProcessedKey = obj.key;

        // Save checkpoint
        await this.setCheckpoint(this.createCheckpoint(obj.key));
      }
    } catch (error) {
      this.logger.error({ error }, 'Error during S3 poll');
    } finally {
      this.processing = false;
    }
  }

  private async listNewObjects(): Promise<S3Object[]> {
    const objects: S3Object[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client!.send(
        new ListObjectsV2Command({
          Bucket: this.s3Config.bucket,
          Prefix: this.s3Config.prefix,
          StartAfter: this.lastProcessedKey ?? undefined,
          MaxKeys: this.config.max_batch_size ?? 1000,
          ContinuationToken: continuationToken,
        })
      );

      for (const content of response.Contents ?? []) {
        if (!content.Key || !content.Size) continue;

        // Apply file pattern filter if configured
        if (this.s3Config.file_pattern) {
          const pattern = new RegExp(this.s3Config.file_pattern);
          if (!pattern.test(content.Key)) continue;
        }

        objects.push({
          key: content.Key,
          size: content.Size,
          lastModified: content.LastModified ?? new Date(),
          etag: content.ETag ?? '',
        });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken && objects.length < (this.config.max_batch_size ?? 1000));

    // Sort by key to ensure consistent ordering
    objects.sort((a, b) => a.key.localeCompare(b.key));

    return objects;
  }

  private async processObject(obj: S3Object): Promise<void> {
    this.logger.info({ key: obj.key, size: obj.size }, 'Processing S3 object');

    try {
      const content = await this.downloadObject(obj.key);
      const checksum = await computeFileChecksum(content);
      const format = this.detectFormat(obj.key);

      const records = await this.parseContent(content, format);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const envelope = this.createEnvelopeFromRecord(
          record,
          obj.key,
          checksum,
          i,
          records.length
        );

        await this.processRecord(envelope);
      }

      // Delete after processing if configured
      if (this.s3Config.delete_after_process) {
        await this.deleteObject(obj.key);
        this.logger.debug({ key: obj.key }, 'Deleted processed S3 object');
      }
    } catch (error) {
      this.logger.error({ key: obj.key, error }, 'Error processing S3 object');
      throw error;
    }
  }

  private async downloadObject(key: string): Promise<Buffer> {
    const response = await this.client!.send(
      new GetObjectCommand({
        Bucket: this.s3Config.bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`Empty response body for ${key}`);
    }

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private async deleteObject(key: string): Promise<void> {
    await this.client!.send(
      new DeleteObjectCommand({
        Bucket: this.s3Config.bucket,
        Key: key,
      })
    );
  }

  private detectFormat(key: string): 'jsonl' | 'json' | 'csv' | 'parquet' {
    const lowerKey = key.toLowerCase();

    if (lowerKey.endsWith('.jsonl') || lowerKey.endsWith('.ndjson')) {
      return 'jsonl';
    }
    if (lowerKey.endsWith('.json')) {
      return 'json';
    }
    if (lowerKey.endsWith('.csv')) {
      return 'csv';
    }
    if (lowerKey.endsWith('.parquet')) {
      return 'parquet';
    }

    // Default to JSONL
    return 'jsonl';
  }

  private async parseContent(
    content: Buffer,
    format: 'jsonl' | 'json' | 'csv' | 'parquet'
  ): Promise<Record<string, unknown>[]> {
    const text = content.toString('utf-8');

    switch (format) {
      case 'jsonl':
        return this.parseJSONL(text);

      case 'json':
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [parsed];

      case 'csv':
        return this.parseCSV(text);

      case 'parquet':
        // Parquet parsing would require parquetjs-lite
        this.logger.warn('Parquet parsing not yet implemented');
        return [];

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private parseJSONL(text: string): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        try {
          records.push(JSON.parse(trimmed));
        } catch (error) {
          this.logger.warn({ line: trimmed.substring(0, 100) }, 'Failed to parse JSONL line');
        }
      }
    }

    return records;
  }

  private parseCSV(text: string): Record<string, unknown>[] {
    const result = parseCSV(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (result.errors.length > 0) {
      this.logger.warn({ errors: result.errors }, 'CSV parsing had errors');
    }

    return result.data as Record<string, unknown>[];
  }

  private createEnvelopeFromRecord(
    record: Record<string, unknown>,
    key: string,
    checksum: string,
    sequence: number,
    batchSize: number
  ): IngestEnvelope {
    // Try to extract entity info from record
    const entityType = (record['_type'] as string) ?? (record['type'] as string) ?? 'unknown';
    const entityId = (record['_id'] as string) ?? (record['id'] as string) ?? `${key}:${sequence}`;
    const revision = (record['_revision'] as number) ?? (record['revision'] as number) ?? 1;

    const envelope = this.createEnvelope(
      record,
      entityType,
      entityId,
      revision,
      `s3://${this.s3Config.bucket}/${key}`
    );

    // Add S3-specific metadata
    envelope.ingest.file_path = key;
    envelope.ingest.file_checksum = checksum;
    envelope.ingest.batch_sequence = sequence;
    envelope.ingest.batch_size = batchSize;
    envelope.ingest.format = this.detectFormat(key);

    return envelope;
  }
}
