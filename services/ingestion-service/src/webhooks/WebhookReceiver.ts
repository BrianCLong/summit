/**
 * Webhook receiver - handles incoming webhooks from external systems
 */

import { Logger } from 'winston';
import { IngestionManager } from '../ingestion/IngestionManager.js';

export interface WebhookConfig {
  id: string;
  name: string;
  source: string;
  ingestionId: string;
  secret?: string;
  signatureHeader?: string;
  transformFunction?: (payload: any) => any;
}

export class WebhookReceiver {
  private logger: Logger;
  private ingestionManager: IngestionManager;
  private webhooks: Map<string, WebhookConfig> = new Map();

  constructor(logger: Logger, ingestionManager: IngestionManager) {
    this.logger = logger;
    this.ingestionManager = ingestionManager;
  }

  /**
   * Register webhook
   */
  registerWebhook(config: WebhookConfig): void {
    this.webhooks.set(config.id, config);
    this.logger.info(`Registered webhook ${config.id} from ${config.source}`);
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(webhookId: string, payload: any, headers: any): Promise<void> {
    const webhook = this.webhooks.get(webhookId);

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    this.logger.info(`Received webhook ${webhookId} from ${webhook.source}`);

    try {
      // Verify webhook signature if configured
      if (webhook.secret && webhook.signatureHeader) {
        this.verifySignature(payload, headers[webhook.signatureHeader], webhook.secret);
      }

      // Transform payload if function provided
      const transformedPayload = webhook.transformFunction
        ? webhook.transformFunction(payload)
        : payload;

      // Queue data for ingestion
      await this.queueForIngestion(webhook.ingestionId, transformedPayload);

      this.logger.info(`Successfully processed webhook ${webhookId}`);
    } catch (error) {
      this.logger.error(`Error processing webhook ${webhookId}`, { error });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(payload: any, signature: string, secret: string): void {
    // Would implement HMAC signature verification
    // Different platforms use different signature methods (GitHub, Stripe, etc.)
    this.logger.debug('Verifying webhook signature');
  }

  /**
   * Queue data for ingestion
   */
  private async queueForIngestion(ingestionId: string, data: any): Promise<void> {
    // Would queue data to be processed by the ingestion pipeline
    // Could use Bull/Redis queues or directly trigger ingestion

    this.logger.debug(`Queuing data for ingestion ${ingestionId}`, {
      recordCount: Array.isArray(data) ? data.length : 1
    });
  }

  /**
   * List registered webhooks
   */
  listWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get webhook by ID
   */
  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  /**
   * Delete webhook
   */
  deleteWebhook(id: string): void {
    this.webhooks.delete(id);
    this.logger.info(`Deleted webhook ${id}`);
  }
}
