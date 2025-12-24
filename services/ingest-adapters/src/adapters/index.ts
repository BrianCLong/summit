/**
 * Ingest Adapters Index
 *
 * Re-exports all adapter implementations for easy importing.
 */

export { BaseAdapter } from './base.js';
export type { BaseAdapterOptions, CheckpointStore, DLQStore } from './base.js';

export { S3Adapter } from './s3.js';
export { KafkaAdapter } from './kafka.js';
export { WebhookAdapter } from './webhook.js';
export type { WebhookRequest, WebhookResponse } from './webhook.js';

// Factory function to create adapters by type
import type { AdapterConfig, IngestAdapter, AdapterEvents } from '../types/index.js';
import type { CheckpointStore, DLQStore } from './base.js';
import { S3Adapter } from './s3.js';
import { KafkaAdapter } from './kafka.js';
import { WebhookAdapter } from './webhook.js';
import pino from 'pino';

export interface CreateAdapterOptions {
  config: AdapterConfig;
  events?: AdapterEvents;
  logger?: pino.Logger;
  checkpointStore?: CheckpointStore;
  dlqStore?: DLQStore;
}

export function createAdapter(options: CreateAdapterOptions): IngestAdapter {
  const { config, events, logger, checkpointStore, dlqStore } = options;

  switch (config.source_type) {
    case 's3':
      return new S3Adapter({ config, events, logger, checkpointStore, dlqStore });

    case 'kafka':
      return new KafkaAdapter({ config, events, logger, checkpointStore, dlqStore });

    case 'webhook':
      return new WebhookAdapter({ config, events, logger, checkpointStore, dlqStore });

    case 'gcs':
      // GCS adapter would be similar to S3 with Google Cloud Storage SDK
      throw new Error('GCS adapter not yet implemented');

    case 'sftp':
      // SFTP adapter would use ssh2-sftp-client
      throw new Error('SFTP adapter not yet implemented');

    default:
      throw new Error(`Unknown source type: ${(config as any).source_type}`);
  }
}
