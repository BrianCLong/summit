import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import {
  CreateWebhookSubscription,
  DeliveryStatus,
  WebhookDelivery,
  WebhookDeliveryAttempt,
  WebhookSubscription,
  WebhookEventType,
} from './types';

const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  signature_algorithm VARCHAR(50) DEFAULT 'HMAC-SHA256',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT webhook_deliveries_status_chk CHECK (status IN ('pending','delivering','succeeded','failed','dead')),
  UNIQUE(subscription_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
  id UUID PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  duration_ms INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_tenant ON webhook_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON webhook_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_attempt ON webhook_deliveries(next_attempt_at);
`;

function mapSubscription(row: any): WebhookSubscription {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    targetUrl: row.target_url,
    secret: row.secret,
    eventTypes: row.event_types,
    isActive: row.is_active,
    description: row.description || undefined,
    signatureAlgorithm: row.signature_algorithm,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDelivery(row: any): WebhookDelivery {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    eventType: row.event_type,
    payload: row.payload,
    status: row.status as DeliveryStatus,
    idempotencyKey: row.idempotency_key,
    attemptCount: row.attempt_count,
    nextAttemptAt: row.next_attempt_at,
    lastAttemptAt: row.last_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    error: row.error,
  };
}

function mapAttempt(row: any): WebhookDeliveryAttempt {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    error: row.error,
    durationMs: row.duration_ms,
    attemptNumber: row.attempt_number,
    createdAt: row.created_at,
  };
}

export class WebhookRepository {
  constructor(private readonly pool: Pool) {}

  async ensureSchema(): Promise<void> {
    await this.pool.query(BASE_SCHEMA);
  }

  async createSubscription(
    input: CreateWebhookSubscription,
  ): Promise<WebhookSubscription> {
    const result = await this.pool.query(
      `INSERT INTO webhook_subscriptions (
        id, tenant_id, target_url, secret, event_types, is_active, description, signature_algorithm
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.targetUrl,
        input.secret,
        input.eventTypes,
        input.isActive ?? true,
        input.description ?? null,
        input.signatureAlgorithm ?? 'HMAC-SHA256',
      ],
    );

    return mapSubscription(result.rows[0]);
  }

  async getSubscription(id: string): Promise<WebhookSubscription | null> {
    const result = await this.pool.query(
      'SELECT * FROM webhook_subscriptions WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapSubscription(result.rows[0]);
  }

  async findSubscriptionsForEvent(
    tenantId: string,
    eventType: WebhookEventType,
  ): Promise<WebhookSubscription[]> {
    // Use ANY() instead of @> for better compatibility with test mocks (pg-mem)
    const result = await this.pool.query(
      `SELECT * FROM webhook_subscriptions
       WHERE tenant_id = $1
       AND is_active = TRUE
       AND $2 = ANY(event_types)`,
      [tenantId, eventType],
    );

    return result.rows.map(mapSubscription);
  }

  async createDelivery(
    subscriptionId: string,
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<WebhookDelivery> {
    const result = await this.pool.query(
      `INSERT INTO webhook_deliveries (
        id, subscription_id, event_type, payload, status, idempotency_key, attempt_count, next_attempt_at
      ) VALUES ($1,$2,$3,$4,'pending',$5,0,COALESCE($6, CURRENT_TIMESTAMP))
      ON CONFLICT (subscription_id, idempotency_key)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [randomUUID(), subscriptionId, eventType, payload, idempotencyKey, null],
    );

    return mapDelivery(result.rows[0]);
  }

  async getDelivery(id: string): Promise<WebhookDelivery | null> {
    const result = await this.pool.query(
      'SELECT * FROM webhook_deliveries WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapDelivery(result.rows[0]);
  }

  async getDueDeliveries(limit: number): Promise<WebhookDelivery[]> {
    // Cast to timestamp for pg-mem compatibility (avoids timestamptz casting issues)
    const result = await this.pool.query(
      `SELECT * FROM webhook_deliveries
       WHERE status IN ('pending','failed')
       AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
       ORDER BY next_attempt_at NULLS FIRST, created_at
       LIMIT $1`,
      [limit],
    );

    return result.rows.map(mapDelivery);
  }

  async markDeliveryStatus(
    id: string,
    status: DeliveryStatus,
    attemptCount: number,
    error?: string,
    nextAttemptAt?: Date | null,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_deliveries
       SET status = $2,
           attempt_count = $3,
           error = $4,
           next_attempt_at = $5,
           last_attempt_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, status, attemptCount, error ?? null, nextAttemptAt ?? null],
    );
  }

  async recordAttempt(attempt: Omit<WebhookDeliveryAttempt, 'id' | 'createdAt'>): Promise<WebhookDeliveryAttempt> {
    const result = await this.pool.query(
      `INSERT INTO webhook_delivery_attempts (
        id, delivery_id, response_status, response_body, error, duration_ms, attempt_number
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        randomUUID(),
        attempt.deliveryId,
        attempt.responseStatus ?? null,
        attempt.responseBody ?? null,
        attempt.error ?? null,
        attempt.durationMs,
        attempt.attemptNumber,
      ],
    );

    return mapAttempt(result.rows[0]);
  }

  async listAttempts(deliveryId: string): Promise<WebhookDeliveryAttempt[]> {
    const result = await this.pool.query(
      'SELECT * FROM webhook_delivery_attempts WHERE delivery_id = $1 ORDER BY created_at',
      [deliveryId],
    );

    return result.rows.map(mapAttempt);
  }

  async overrideNextAttempt(id: string, at: Date): Promise<void> {
    await this.pool.query(
      'UPDATE webhook_deliveries SET next_attempt_at = $2 WHERE id = $1',
      [id, at],
    );
  }

  async countDeliveries(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM webhook_deliveries');
    return result.rows[0].count;
  }
}
