import { randomUUID } from 'crypto';
import { pg } from '../db/pg.js';
import { DeliveryStatus, WebhookDelivery, WebhookEventType, WebhookSubscription } from './types.js';

interface DeliveryInput {
  tenantId: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  payload: any;
  idempotencyKey: string;
  nextAttemptAt?: Date;
}

export class WebhookRepository {
  async getSubscriptionsForEvent(
    tenantId: string,
    eventType: WebhookEventType,
  ): Promise<WebhookSubscription[]> {
    return pg.readMany(
      `SELECT id, tenant_id, event_type, target_url, secret, active, created_at, updated_at
       FROM webhook_subscriptions
       WHERE tenant_id = $1 AND event_type = $2 AND active = true`,
      [tenantId, eventType],
      { tenantId },
    );
  }

  async findDeliveryByKey(
    tenantId: string,
    subscriptionId: string,
    idempotencyKey: string,
  ): Promise<WebhookDelivery | null> {
    return pg.oneOrNone(
      `SELECT * FROM webhook_deliveries
       WHERE tenant_id = $1 AND subscription_id = $2 AND idempotency_key = $3`,
      [tenantId, subscriptionId, idempotencyKey],
      { tenantId },
    );
  }

  async createDelivery(input: DeliveryInput): Promise<WebhookDelivery> {
    const deliveryId = randomUUID();
    return pg.oneOrNone(
      `INSERT INTO webhook_deliveries (
         id, tenant_id, subscription_id, event_type, payload, status, idempotency_key, attempt_count, next_attempt_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)
       ON CONFLICT (tenant_id, subscription_id, idempotency_key)
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [
        deliveryId,
        input.tenantId,
        input.subscriptionId,
        input.eventType,
        input.payload,
        DeliveryStatus.PENDING,
        input.idempotencyKey,
        input.nextAttemptAt ?? new Date(),
      ],
      { tenantId: input.tenantId },
    );
  }

  async markInProgress(tenantId: string, deliveryId: string): Promise<void> {
    await pg.write(
      `UPDATE webhook_deliveries
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [DeliveryStatus.IN_PROGRESS, deliveryId, tenantId],
      { tenantId },
    );
  }

  async markSuccess(
    tenantId: string,
    deliveryId: string,
    attemptCount: number,
  ): Promise<void> {
    await pg.write(
      `UPDATE webhook_deliveries
       SET status = $1, attempt_count = $2, last_error = NULL, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4`,
      [DeliveryStatus.SUCCEEDED, attemptCount, deliveryId, tenantId],
      { tenantId },
    );
  }

  async markFailure(
    tenantId: string,
    deliveryId: string,
    attemptCount: number,
    error: string,
    poisoned: boolean,
    nextAttemptAt?: Date,
  ): Promise<void> {
    await pg.write(
      `UPDATE webhook_deliveries
       SET status = $1, attempt_count = $2, last_error = $3, next_attempt_at = $4, updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6`,
      [
        poisoned ? DeliveryStatus.POISONED : DeliveryStatus.FAILED,
        attemptCount,
        error,
        nextAttemptAt ?? null,
        deliveryId,
        tenantId,
      ],
      { tenantId },
    );
  }

  async recordAttempt(
    tenantId: string,
    deliveryId: string,
    attemptNumber: number,
    status: DeliveryStatus,
    responseStatus?: number,
    responseBody?: string,
    error?: string,
    durationMs?: number,
  ): Promise<void> {
    await pg.write(
      `INSERT INTO webhook_delivery_attempts (
         tenant_id, delivery_id, attempt_number, status, response_status, response_body, error, duration_ms
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tenantId,
        deliveryId,
        attemptNumber,
        status,
        responseStatus ?? null,
        responseBody ?? null,
        error ?? null,
        durationMs ?? null,
      ],
      { tenantId },
    );
  }
}

export const webhookRepository = new WebhookRepository();
