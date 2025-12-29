export interface EventEnvelope<T = any> {
  event_id: string;
  tenant_id: string;
  occurred_at: string; // ISO8601
  type: string;
  actor: {
    id: string;
    type: 'user' | 'system' | 'api_key';
    [key: string]: any;
  };
  resource_refs: {
    type: string;
    id: string;
  }[];
  receipt_ref?: string; // Provenance receipt
  payload: T;
  schema_version: string;
}

export enum SinkType {
  WEBHOOK = 'webhook',
  QUEUE = 'queue', // SQS/Kafka stub
}

export interface EventSinkConfig {
  id: string;
  tenant_id: string;
  type: SinkType;
  config: {
    url?: string; // Webhook
    secret?: string; // Webhook signing secret
    queue_url?: string; // SQS stub
    topic?: string; // Kafka stub
    [key: string]: any;
  };
  enabled: boolean;
  filter_types?: string[]; // Optional: filter specific event types
}

export interface ReplayQuery {
  tenantId: string;
  startTime: Date;
  endTime: Date;
  eventTypes?: string[];
  sinkIds?: string[];
}
