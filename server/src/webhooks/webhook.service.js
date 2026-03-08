"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookService = exports.WebhookService = exports.UpdateWebhookSchema = exports.CreateWebhookSchema = void 0;
const pg_js_1 = require("../db/pg.js");
// import { v4 as uuidv4 } from 'uuid';
const crypto_1 = __importDefault(require("crypto"));
const webhook_queue_js_1 = require("./webhook.queue.js");
const zod_1 = require("zod");
exports.CreateWebhookSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    event_types: zod_1.z.array(zod_1.z.string()).min(1),
    secret: zod_1.z.string().optional(), // If not provided, one will be generated
});
exports.UpdateWebhookSchema = zod_1.z.object({
    url: zod_1.z.string().url().optional(),
    event_types: zod_1.z.array(zod_1.z.string()).min(1).optional(),
    is_active: zod_1.z.boolean().optional(),
    secret: zod_1.z.string().optional(),
});
class WebhookService {
    /**
     * Build signing headers with timestamped HMAC for payload integrity
     */
    generateSignature(payload, secret, timestamp) {
        const ts = timestamp || Date.now();
        const payloadString = JSON.stringify(payload);
        const dataToSign = `${ts}.${payloadString}`;
        const hmac = crypto_1.default.createHmac('sha256', secret);
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
    async createWebhook(tenantId, input) {
        const secret = input.secret || crypto_1.default.randomBytes(32).toString('hex');
        const result = await pg_js_1.pg.oneOrNone(`INSERT INTO webhooks (tenant_id, url, secret, event_types)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [tenantId, input.url, secret, input.event_types], { tenantId });
        return result;
    }
    /**
     * Get webhooks for a tenant
     */
    async getWebhooks(tenantId) {
        return pg_js_1.pg.many(`SELECT * FROM webhooks WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId], { tenantId });
    }
    /**
     * Get a specific webhook
     */
    async getWebhook(tenantId, webhookId) {
        return pg_js_1.pg.oneOrNone(`SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2`, [webhookId, tenantId], { tenantId });
    }
    /**
     * Update a webhook
     */
    async updateWebhook(tenantId, webhookId, input) {
        const updates = [];
        const values = [];
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
        return pg_js_1.pg.oneOrNone(query, values, { tenantId });
    }
    /**
     * Delete a webhook
     */
    async deleteWebhook(tenantId, webhookId) {
        const result = await pg_js_1.pg.oneOrNone(`DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2 RETURNING id`, [webhookId, tenantId], { tenantId });
        return !!result;
    }
    /**
     * Trigger a webhook event for all subscribers
     */
    async triggerEvent(tenantId, eventType, payload) {
        // Find all active webhooks for this tenant and event type
        // We use the array operator @> to check if the event_types array contains the eventType
        const webhooks = await pg_js_1.pg.many(`SELECT * FROM webhooks
       WHERE tenant_id = $1
       AND is_active = true
       AND event_types @> $2`, [tenantId, [eventType]], { tenantId });
        if (webhooks.length === 0) {
            return;
        }
        // Create delivery records and enqueue jobs
        for (const webhook of webhooks) {
            const delivery = await pg_js_1.pg.oneOrNone(`INSERT INTO webhook_deliveries (webhook_id, tenant_id, event_type, payload)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [webhook.id, tenantId, eventType, payload], { tenantId });
            if (delivery) {
                await webhook_queue_js_1.webhookQueue.add('deliver-webhook', {
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
    async triggerWebhook(tenantId, webhookId, eventType, payload, triggerType = 'event') {
        const webhook = await this.getWebhook(tenantId, webhookId);
        if (!webhook || !webhook.is_active) {
            return null;
        }
        const delivery = await pg_js_1.pg.oneOrNone(`INSERT INTO webhook_deliveries (webhook_id, tenant_id, event_type, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [webhookId, tenantId, eventType, payload], { tenantId });
        if (!delivery) {
            return null;
        }
        await webhook_queue_js_1.webhookQueue.add('deliver-webhook', {
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
    async getDeliveries(tenantId, webhookId, limit = 20, offset = 0) {
        // Verify ownership first
        const webhook = await this.getWebhook(tenantId, webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        return pg_js_1.pg.many(`SELECT * FROM webhook_deliveries
       WHERE webhook_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`, [webhookId, limit, offset], { tenantId });
    }
    /**
     * Delivery attempt history for observability and dashboards
     */
    async getDeliveryAttempts(tenantId, webhookId, deliveryId, limit = 50) {
        const webhook = await this.getWebhook(tenantId, webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        const params = [webhookId, limit];
        const deliveryFilter = deliveryId ? 'AND delivery_id = $3' : '';
        if (deliveryId) {
            params.push(deliveryId);
        }
        return pg_js_1.pg.many(`SELECT *
       FROM webhook_delivery_attempts
       WHERE webhook_id = $1
       ${deliveryFilter}
       ORDER BY created_at DESC
       LIMIT $2`, params, { tenantId });
    }
}
exports.WebhookService = WebhookService;
exports.webhookService = new WebhookService();
