"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRepository = exports.WebhookRepository = void 0;
const crypto_1 = require("crypto");
const pg_js_1 = require("../db/pg.js");
const types_js_1 = require("./types.js");
class WebhookRepository {
    async getSubscriptionsForEvent(tenantId, eventType) {
        return pg_js_1.pg.readMany(`SELECT id, tenant_id, event_type, target_url, secret, active, created_at, updated_at
       FROM webhook_subscriptions
       WHERE tenant_id = $1 AND event_type = $2 AND active = true`, [tenantId, eventType], { tenantId });
    }
    async findDeliveryByKey(tenantId, subscriptionId, idempotencyKey) {
        return pg_js_1.pg.oneOrNone(`SELECT * FROM webhook_deliveries
       WHERE tenant_id = $1 AND subscription_id = $2 AND idempotency_key = $3`, [tenantId, subscriptionId, idempotencyKey], { tenantId });
    }
    async createDelivery(input) {
        const deliveryId = (0, crypto_1.randomUUID)();
        return pg_js_1.pg.oneOrNone(`INSERT INTO webhook_deliveries (
         id, tenant_id, subscription_id, event_type, payload, status, idempotency_key, attempt_count, next_attempt_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)
       ON CONFLICT (tenant_id, subscription_id, idempotency_key)
       DO UPDATE SET updated_at = NOW()
       RETURNING *`, [
            deliveryId,
            input.tenantId,
            input.subscriptionId,
            input.eventType,
            input.payload,
            types_js_1.DeliveryStatus.PENDING,
            input.idempotencyKey,
            input.nextAttemptAt ?? new Date(),
        ], { tenantId: input.tenantId });
    }
    async markInProgress(tenantId, deliveryId) {
        await pg_js_1.pg.write(`UPDATE webhook_deliveries
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`, [types_js_1.DeliveryStatus.IN_PROGRESS, deliveryId, tenantId], { tenantId });
    }
    async markSuccess(tenantId, deliveryId, attemptCount) {
        await pg_js_1.pg.write(`UPDATE webhook_deliveries
       SET status = $1, attempt_count = $2, last_error = NULL, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4`, [types_js_1.DeliveryStatus.SUCCEEDED, attemptCount, deliveryId, tenantId], { tenantId });
    }
    async markFailure(tenantId, deliveryId, attemptCount, error, poisoned, nextAttemptAt) {
        await pg_js_1.pg.write(`UPDATE webhook_deliveries
       SET status = $1, attempt_count = $2, last_error = $3, next_attempt_at = $4, updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6`, [
            poisoned ? types_js_1.DeliveryStatus.POISONED : types_js_1.DeliveryStatus.FAILED,
            attemptCount,
            error,
            nextAttemptAt ?? null,
            deliveryId,
            tenantId,
        ], { tenantId });
    }
    async recordAttempt(tenantId, deliveryId, attemptNumber, status, responseStatus, responseBody, error, durationMs) {
        await pg_js_1.pg.write(`INSERT INTO webhook_delivery_attempts (
         tenant_id, delivery_id, attempt_number, status, response_status, response_body, error, duration_ms
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            tenantId,
            deliveryId,
            attemptNumber,
            status,
            responseStatus ?? null,
            responseBody ?? null,
            error ?? null,
            durationMs ?? null,
        ], { tenantId });
    }
}
exports.WebhookRepository = WebhookRepository;
exports.webhookRepository = new WebhookRepository();
