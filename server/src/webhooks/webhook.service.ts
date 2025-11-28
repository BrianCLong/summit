import { pg } from '../db/pg.js';
// import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { webhookQueue } from './webhook.queue.js';
import { z } from 'zod/v4';

export interface WebhookConfig {
  id: string;
  tenant_id: string;
  url: string;
  secret: string;
  event_types: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  tenant_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'success' | 'failed';
  response_status?: number;
  response_body?: string;
  attempt_count: number;
  next_retry_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookDeliveryAttempt {
  id: string;
  delivery_id: string;
  webhook_id: string;
  tenant_id: string;
  attempt_number: number;
  status: 'success' | 'failed' | 'pending';
  response_status?: number;
  response_body?: string;
  error_message?: string;
  duration_ms?: number;
  created_at: Date;
}

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  event_types: z.array(z.string()).min(1),
  secret: z.string().optional(), // If not provided, one will be generated
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  event_types: z.array(z.string()).min(1).optional(),
  is_active: z.boolean().optional(),
  secret: z.string().optional(),
});

export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

export class WebhookService {
  /**
   * Build signing headers with timestamped HMAC for payload integrity
   */
  generateSignature(payload: any, secret: string, timestamp?: number): {
    signature: string;
    timestamp: number;
  } {
    const ts = timestamp || Date.now();
    const payloadString = JSON.stringify(payload);
    const dataToSign = `${ts}.${payloadString}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(dataToSign);
    const digest = hmac.digest('hex');
    return {
      signature: `t=${ts},v1=${digest}`,
      timestamp: ts,
    };
  }

  /**
   * Create a new webhook registration
   */
  async createWebhook(tenantId: string, input: CreateWebhookInput): Promise<WebhookConfig> {
    const secret = input.secret || crypto.randomBytes(32).toString('hex');

    const result = await pg.oneOrNone(
      `INSERT INTO webhooks (tenant_id, url, secret, event_types)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, input.url, secret, input.event_types],
      { tenantId }
    );

    return result;
  }

  /**
   * Get webhooks for a tenant
   */
  async getWebhooks(tenantId: string): Promise<WebhookConfig[]> {
    return pg.many(
      `SELECT * FROM webhooks WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
      { tenantId }
    );
  }

  /**
   * Get a specific webhook
   */
  async getWebhook(tenantId: string, webhookId: string): Promise<WebhookConfig | null> {
    return pg.oneOrNone(
      `SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2`,
      [webhookId, tenantId],
      { tenantId }
    );
  }

  /**
   * Update a webhook
   */
  async updateWebhook(tenantId: string, webhookId: string, input: UpdateWebhookInput): Promise<WebhookConfig | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.url) {
      updates.push(`url = $${idx++}`);
      values.push(input.url);
    }
    if (input.event_types) {
      updates.push(`event_types = $${idx++}`);
      values.push(input.event_types);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(input.is_active);
    }
    if (input.secret) {
      updates.push(`secret = $${idx++}`);
      values.push(input.secret);
    }

    if (updates.length === 0) {
      return this.getWebhook(tenantId, webhookId);
    }

    updates.push(`updated_at = NOW()`);

    values.push(webhookId);
    values.push(tenantId);

    const query = `
      UPDATE webhooks
      SET ${updates.join(', ')}
      WHERE id = $${idx} AND tenant_id = $${idx + 1}
      RETURNING *
    `;

    return pg.oneOrNone(query, values, { tenantId });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(tenantId: string, webhookId: string): Promise<boolean> {
    const result = await pg.oneOrNone(
      `DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [webhookId, tenantId],
      { tenantId }
    );
    return !!result;
  }

  /**
   * Trigger a webhook event for all subscribers
   */
  async triggerEvent(tenantId: string, eventType: string, payload: any): Promise<void> {
    // Find all active webhooks for this tenant and event type
    // We use the array operator @> to check if the event_types array contains the eventType
    const webhooks = await pg.many(
      `SELECT * FROM webhooks
       WHERE tenant_id = $1
       AND is_active = true
       AND event_types @> $2`,
      [tenantId, [eventType]],
      { tenantId }
    );

    if (webhooks.length === 0) {
      return;
    }

    // Create delivery records and enqueue jobs
    for (const webhook of webhooks) {
      const delivery = await pg.oneOrNone(
        `INSERT INTO webhook_deliveries (webhook_id, tenant_id, event_type, payload)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [webhook.id, tenantId, eventType, payload],
        { tenantId }
      );

      if (delivery) {
        await webhookQueue.add('deliver-webhook', {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          tenantId,
          url: webhook.url,
          secret: webhook.secret,
          payload,
          eventType,
          triggerType: 'event',
        });
      }
    }
  }

  /**
   * Trigger a single webhook, useful for testing or manual resend
   */
  async triggerWebhook(
    tenantId: string,
    webhookId: string,
    eventType: string,
    payload: any,
    triggerType: 'event' | 'test' = 'event'
  ): Promise<WebhookDelivery | null> {
    const webhook = await this.getWebhook(tenantId, webhookId);
    if (!webhook || !webhook.is_active) {
      return null;
    }

    const delivery = await pg.oneOrNone(
      `INSERT INTO webhook_deliveries (webhook_id, tenant_id, event_type, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [webhookId, tenantId, eventType, payload],
      { tenantId }
    );

    if (!delivery) {
      return null;
    }

    await webhookQueue.add('deliver-webhook', {
      deliveryId: delivery.id,
      webhookId,
      tenantId,
      url: webhook.url,
      secret: webhook.secret,
      payload,
      eventType,
      triggerType,
    });

    return delivery;
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(tenantId: string, webhookId: string, limit = 20, offset = 0): Promise<WebhookDelivery[]> {
    // Verify ownership first
    const webhook = await this.getWebhook(tenantId, webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return pg.many(
      `SELECT * FROM webhook_deliveries
       WHERE webhook_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [webhookId, limit, offset],
      { tenantId }
    );
  }

  /**
   * Delivery attempt history for observability and dashboards
   */
  async getDeliveryAttempts(
    tenantId: string,
    webhookId: string,
    deliveryId?: string,
    limit = 50
  ): Promise<WebhookDeliveryAttempt[]> {
    const webhook = await this.getWebhook(tenantId, webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const params: any[] = [webhookId, limit];
    const deliveryFilter = deliveryId ? 'AND delivery_id = $3' : '';
    if (deliveryId) {
      params.push(deliveryId);
    }

    return pg.many(
      `SELECT *
       FROM webhook_delivery_attempts
       WHERE webhook_id = $1
       ${deliveryFilter}
       ORDER BY created_at DESC
       LIMIT $2`,
      params,
      { tenantId }
    );
  }
}

export const webhookService = new WebhookService();
