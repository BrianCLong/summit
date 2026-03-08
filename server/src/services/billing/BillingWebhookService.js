"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingWebhookService = exports.BillingWebhookService = void 0;
const crypto_1 = require("crypto");
const pg_js_1 = require("../../db/pg.js");
class BillingWebhookService {
    static instance;
    config;
    constructor(config) {
        this.config = {
            webhookUrl: process.env.BILLING_WEBHOOK_URL || '',
            signingSecret: process.env.BILLING_WEBHOOK_SECRET,
            timeoutMs: 10000,
            maxAttempts: 5,
            baseDelayMs: 1000,
            maxDelayMs: 30000,
            ...config,
        };
    }
    static getInstance(config) {
        if (!BillingWebhookService.instance) {
            BillingWebhookService.instance = new BillingWebhookService(config);
        }
        return BillingWebhookService.instance;
    }
    async enqueueEvent(tenantId, eventType, payload) {
        if (!this.config.webhookUrl) {
            throw new Error('Billing webhook URL is not configured.');
        }
        const eventId = (0, crypto_1.randomUUID)();
        await pg_js_1.pool.query(`
        INSERT INTO billing_webhook_outbox (
          id,
          tenant_id,
          event_type,
          payload,
          webhook_url,
          status,
          attempt_count,
          next_attempt_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', 0, now())
      `, [eventId, tenantId, eventType, JSON.stringify(payload), this.config.webhookUrl]);
        return eventId;
    }
    async processDueEvents(limit = 25) {
        const client = await pg_js_1.pool.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(`
          SELECT id, tenant_id, event_type, payload, webhook_url, attempt_count
          FROM billing_webhook_outbox
          WHERE status IN ('pending', 'retry')
            AND next_attempt_at <= now()
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        `, [limit]);
            const ids = rows.map((row) => row.id);
            if (ids.length > 0) {
                await client.query(`
            UPDATE billing_webhook_outbox
            SET status = 'delivering', updated_at = now()
            WHERE id = ANY($1::uuid[])
          `, [ids]);
            }
            await client.query('COMMIT');
            for (const row of rows) {
                await this.deliverRow(row);
            }
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async deliverRow(row) {
        try {
            await this.deliverEvent({
                eventId: row.id,
                eventType: row.event_type,
                tenantId: row.tenant_id,
                deliveredAt: new Date().toISOString(),
                payload: row.payload,
            }, row.webhook_url);
            await pg_js_1.pool.query(`
          UPDATE billing_webhook_outbox
          SET status = 'delivered', delivered_at = now(), updated_at = now()
          WHERE id = $1
        `, [row.id]);
        }
        catch (error) {
            const nextAttempt = row.attempt_count + 1;
            const retryDelayMs = Math.min(this.config.baseDelayMs * Math.pow(2, Math.max(nextAttempt - 1, 0)), this.config.maxDelayMs);
            const nextAttemptAt = new Date(Date.now() + retryDelayMs);
            const status = nextAttempt >= this.config.maxAttempts ? 'failed' : 'retry';
            await pg_js_1.pool.query(`
          UPDATE billing_webhook_outbox
          SET status = $1,
              attempt_count = $2,
              next_attempt_at = $3,
              last_error = $4,
              updated_at = now()
          WHERE id = $5
        `, [status, nextAttempt, nextAttemptAt, error?.message || 'Delivery failed', row.id]);
        }
    }
    async deliverEvent(event, webhookUrl) {
        const body = JSON.stringify(event);
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'summit-billing-webhook/1.0',
            'X-Summit-Event-Type': event.eventType,
        };
        if (this.config.signingSecret) {
            headers['X-Summit-Signature'] = this.signPayload(body, this.config.signingSecret);
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers,
                body,
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`Billing webhook failed with status ${response.status}`);
            }
        }
        finally {
            clearTimeout(timeout);
        }
    }
    signPayload(payload, secret) {
        return (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex');
    }
}
exports.BillingWebhookService = BillingWebhookService;
exports.billingWebhookService = BillingWebhookService.getInstance();
