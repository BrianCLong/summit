export type WebhookEventType = "case.created" | "export.ready" | "ingest.completed";

export type DeliveryStatus = "pending" | "delivering" | "succeeded" | "failed" | "dead";

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  targetUrl: string;
  secret: string;
  eventTypes: WebhookEventType[];
  isActive: boolean;
  description?: string;
  signatureAlgorithm: "HMAC-SHA256";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookSubscription {
  tenantId: string;
  targetUrl: string;
  secret: string;
  eventTypes: WebhookEventType[];
  description?: string;
  isActive?: boolean;
  signatureAlgorithm?: "HMAC-SHA256";
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  idempotencyKey: string;
  attemptCount: number;
  nextAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  error?: string | null;
}

export interface WebhookDeliveryAttempt {
  id: string;
  deliveryId: string;
  responseStatus?: number | null;
  responseBody?: string | null;
  error?: string | null;
  durationMs: number;
  attemptNumber: number;
  createdAt: Date;
}

export interface WebhookMetrics {
  recordSuccess(durationMs: number): void;
  recordFailure(durationMs: number): void;
  recordDeadLetter(error: string): void;
}

export interface WebhookEvent {
  tenantId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}
