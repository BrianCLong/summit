export type PayloadLimitKey = 'defaultJson' | 'webhooks' | 'receiptWebhook';

/**
 * Centralized payload size limits for each route group.
 * - Keep defaults conservative to protect webhook ingestion and receipt endpoints.
 * - Limits can be relaxed by setting the corresponding environment variables, but they
 *   default to safe values.
 */
export const payloadLimits: Record<PayloadLimitKey, string> = {
  defaultJson: process.env.DEFAULT_JSON_LIMIT || '1mb',
  webhooks: process.env.WEBHOOK_PAYLOAD_LIMIT || '512kb',
  receiptWebhook: process.env.RECEIPT_WEBHOOK_LIMIT || '256kb',
};

/**
 * Feature flags around payload enforcement. Defaults to enabled for safety.
 */
export const payloadLimitFlags = {
  enforceWebhookLimits: process.env.ENFORCE_WEBHOOK_LIMITS !== 'false',
};

export const PAYLOAD_TOO_LARGE_CODE = 'PAYLOAD_TOO_LARGE';

export function resolvePayloadLimit(key: PayloadLimitKey): string {
  if (key === 'receiptWebhook' && !payloadLimitFlags.enforceWebhookLimits) {
    return payloadLimits.defaultJson;
  }

  return payloadLimits[key];
}
