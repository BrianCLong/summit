/**
 * Webhook Adapter
 *
 * Receives ingest records via HTTP webhooks with signature validation
 * and rate limiting.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  WebhookAdapterConfig,
  Checkpoint,
  IngestEnvelope,
} from '../types/index.js';
import { BaseAdapter, BaseAdapterOptions } from './base.js';
import { IngestEnvelopeSchema } from '../types/index.js';

export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  method: string;
  path: string;
  ip?: string;
}

export interface WebhookResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export class WebhookAdapter extends BaseAdapter {
  private recordCount = 0;
  private lastReceivedAt: string | null = null;
  private secretKey: string | null = null;
  private queue: IngestEnvelope[] = [];
  private maxQueueSize = 1000;
  private isProcessingQueue = false;

  constructor(options: BaseAdapterOptions) {
    super(options);
  }

  private get webhookConfig(): WebhookAdapterConfig {
    return this.config as WebhookAdapterConfig;
  }

  protected async doInitialize(): Promise<void> {
    // Load secret key for signature validation
    if (this.webhookConfig.validate_signature) {
      this.secretKey = process.env[`WEBHOOK_SECRET_${this.name.toUpperCase()}`] ?? null;
      if (!this.secretKey) {
        this.logger.warn('Signature validation enabled but no secret key configured');
      }
    }

    // Restore checkpoint
    const checkpoint = await this.getCheckpoint();
    if (checkpoint) {
      this.recordCount = checkpoint.total_records_processed;
      this.lastReceivedAt = checkpoint.last_processed_at;
      this.logger.info({ recordCount: this.recordCount }, 'Restored checkpoint');
    }
  }

  protected async doStart(): Promise<void> {
    // Webhook adapter is passive - it just handles incoming requests
    this.logger.info(
      { path: this.webhookConfig.path, method: this.webhookConfig.method ?? 'POST' },
      'Webhook adapter ready'
    );

    // Start background processor
    this.startQueueProcessor();
  }

  protected async doStop(): Promise<void> {
    // Save final checkpoint
    await this.setCheckpoint(this.createCheckpoint(this.recordCount.toString()));
  }

  protected async doHealthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
    return {
      healthy: true,
      details: {
        path: this.webhookConfig.path,
        method: this.webhookConfig.method ?? 'POST',
        recordCount: this.recordCount,
        lastReceivedAt: this.lastReceivedAt,
        signatureValidation: this.webhookConfig.validate_signature ?? false,
        queueSize: this.queue.length,
      },
    };
  }

  protected getSourceIdentifier(): string {
    return `webhook://${this.name}${this.webhookConfig.path}`;
  }

  protected createCheckpoint(position: string): Checkpoint {
    return {
      id: `${this.config.tenant_id}:${this.getSourceIdentifier()}`,
      tenant_id: this.config.tenant_id,
      source: this.getSourceIdentifier(),
      source_type: 'webhook',
      position,
      last_processed_at: this.lastReceivedAt ?? new Date().toISOString(),
      records_since_checkpoint: 0,
      total_records_processed: this.recordCount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Public API for HTTP Handler
  // -------------------------------------------------------------------------

  /**
   * Handle an incoming webhook request.
   * Called by the HTTP server when a request matches this adapter's path.
   */
  async handleRequest(request: WebhookRequest): Promise<WebhookResponse> {
    // Validate method
    const expectedMethod = this.webhookConfig.method ?? 'POST';
    if (request.method.toUpperCase() !== expectedMethod) {
      return {
        status: 405,
        body: { error: 'Method not allowed', expected: expectedMethod },
      };
    }

    // Check backpressure & Queue Size
    // Note: We prioritize queue size check for fast-ack, but respect drain mode if set
    if (this.queue.length >= this.maxQueueSize) {
       return {
        status: 503,
        body: { error: 'Service temporarily unavailable (queue full)' },
        headers: { 'Retry-After': '10' },
      };
    }

    if (this.config.backpressure?.drain_mode) {
      return {
        status: 503,
        body: { error: 'Service is draining' },
        headers: { 'Retry-After': '10' },
      };
    }

    // Validate signature if configured
    if (this.webhookConfig.validate_signature && this.secretKey) {
      const signatureValid = this.validateSignature(request);
      if (!signatureValid) {
        this.logger.warn({ ip: request.ip, path: request.path }, 'Invalid webhook signature');
        return {
          status: 401,
          body: { error: 'Invalid signature' },
        };
      }
    }

    // Validate body size
    const bodySize = JSON.stringify(request.body).length;
    const maxSize = this.webhookConfig.max_body_size ?? 10 * 1024 * 1024; // 10MB default
    if (bodySize > maxSize) {
      return {
        status: 413,
        body: { error: 'Payload too large', maxSize },
      };
    }

    try {
      // Process the request body
      const records = this.extractRecords(request.body);
      let queuedCount = 0;

      for (const record of records) {
        try {
          const envelope = this.createEnvelopeFromRecord(record);
          this.queue.push(envelope);
          queuedCount++;
        } catch (error) {
          this.logger.warn({ error, recordId: record.id }, 'Failed to create envelope from record');
          // We can't return partial error easily in 202, so we just log and skip invalid records
        }
      }

      this.lastReceivedAt = new Date().toISOString();

      return {
        status: 202,
        body: {
          status: 'accepted',
          queued: queuedCount,
          message: 'Records queued for processing'
        },
      };
    } catch (error) {
      this.logger.error({ error }, 'Error processing webhook request');
      return {
        status: 500,
        body: { error: 'Internal server error' },
      };
    }
  }

  /**
   * Get the path this adapter listens on.
   */
  getPath(): string {
    return this.webhookConfig.path;
  }

  /**
   * Get the HTTP method this adapter accepts.
   */
  getMethod(): string {
    return this.webhookConfig.method ?? 'POST';
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private startQueueProcessor() {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    // Fire and forget, but handle errors
    (async () => {
      while (this.running) {
        if (this.queue.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Check if we can accept more concurrent tasks
        // This relies on BaseAdapter's backpressure controller
        if (!this.backpressure.isAccepting()) {
          // Wait a bit if overloaded
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }

        const envelope = this.queue.shift();
        if (envelope) {
          // Process concurrently - do NOT await
          this.processRecord(envelope).then(() => {
            this.recordCount++;

            // Checkpoint periodically
            if (this.recordCount % 100 === 0) {
               this.setCheckpoint(this.createCheckpoint(this.recordCount.toString())).catch(() => {});
            }
          }).catch(error => {
            this.logger.error({ error, entityId: envelope.entity.id }, 'Error processing queued record');
            // processRecord already handles DLQ, so we just log here
          });
        }
      }
      this.isProcessingQueue = false;
    })().catch(err => {
      this.logger.error({ err }, 'Queue processor crashed');
      this.isProcessingQueue = false;
    });
  }

  private validateSignature(request: WebhookRequest): boolean {
    if (!this.secretKey) return false;

    const headerName = this.webhookConfig.signature_header ?? 'x-signature';
    const signature = request.headers[headerName.toLowerCase()];

    if (!signature || Array.isArray(signature)) {
      return false;
    }

    // Calculate expected signature
    const payload = JSON.stringify(request.body);
    const expectedSignature = createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    // Compare with timing-safe comparison
    try {
      const sigBuffer = Buffer.from(signature.replace('sha256=', ''), 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  private extractRecords(body: unknown): Array<Record<string, unknown>> {
    if (!body) {
      return [];
    }

    // Handle array of records
    if (Array.isArray(body)) {
      return body as Array<Record<string, unknown>>;
    }

    // Handle single record
    if (typeof body === 'object') {
      // Check if it's a wrapper with a records/data array
      const obj = body as Record<string, unknown>;
      if (Array.isArray(obj.records)) {
        return obj.records as Array<Record<string, unknown>>;
      }
      if (Array.isArray(obj.data)) {
        return obj.data as Array<Record<string, unknown>>;
      }
      if (Array.isArray(obj.items)) {
        return obj.items as Array<Record<string, unknown>>;
      }

      // Treat as single record
      return [obj];
    }

    return [];
  }

  private createEnvelopeFromRecord(record: Record<string, unknown>): IngestEnvelope {
    // Check if it's already an IngestEnvelope
    const validation = IngestEnvelopeSchema.safeParse(record);
    if (validation.success) {
      return validation.data;
    }

    // Extract entity info from record
    const entityType = (record._type as string) ?? (record.type as string) ?? 'unknown';
    const entityId = (record._id as string) ?? (record.id as string) ?? `webhook:${Date.now()}`;
    const revision = (record._revision as number) ?? (record.revision as number) ?? 1;

    return this.createEnvelope(
      record,
      entityType,
      entityId,
      revision,
      this.getSourceIdentifier()
    );
  }
}
