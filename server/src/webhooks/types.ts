export enum WebhookEventType {
  CASE_CREATED = 'case.created',
  EXPORT_READY = 'export.ready',
  INGEST_COMPLETED = 'ingest.completed',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  POISONED = 'poisoned',
}

export interface WebhookSubscription {
  id: string;
  tenant_id: string;
  event_type: WebhookEventType;
  target_url: string;
  secret: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  tenant_id: string;
  subscription_id: string;
  event_type: WebhookEventType;
  payload: any;
  status: DeliveryStatus;
  idempotency_key: string;
  attempt_count: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookAttempt {
  id: number;
  delivery_id: string;
  tenant_id: string;
  attempt_number: number;
  status: DeliveryStatus;
  response_status?: number | null;
  response_body?: string | null;
  error?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface DeliveryJobData {
  deliveryId: string;
  tenantId: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  targetUrl: string;
  secret: string;
  payload: any;
  idempotencyKey: string;
}
