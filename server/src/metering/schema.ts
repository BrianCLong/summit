export enum MeterEventKind {
  INGEST_UNITS = 'ingest.units', // Deprecated but kept for compat
  QUERY_CREDITS = 'query.credits', // Deprecated but kept for compat
  STORAGE_BYTES_ESTIMATE = 'storage.bytes_estimate', // Deprecated but kept for compat
  USER_SEAT_ACTIVE = 'user.seat.active', // Deprecated but kept for compat

  // New kinds
  QUERY_EXECUTED = 'query_executed',
  INGEST_ITEM = 'ingest_item',
  EXPORT_BUILT = 'export_built',
  ARTIFACT_STORED_BYTES = 'artifact_stored_bytes',
  WEBHOOK_DELIVERED = 'webhook_delivered'
}

export interface MeterEventBase {
  tenantId: string;
  occurredAt?: Date;
  idempotencyKey?: string;
  correlationId?: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface IngestMeterEvent extends MeterEventBase {
  kind: MeterEventKind.INGEST_UNITS;
  units: number;
}

export interface QueryMeterEvent extends MeterEventBase {
  kind: MeterEventKind.QUERY_CREDITS;
  credits: number;
}

export interface StorageMeterEvent extends MeterEventBase {
  kind: MeterEventKind.STORAGE_BYTES_ESTIMATE;
  bytes: number;
}

export interface SeatMeterEvent extends MeterEventBase {
  kind: MeterEventKind.USER_SEAT_ACTIVE;
  seatCount?: number;
  userId?: string;
}

// New Events
export interface QueryExecutedEvent extends MeterEventBase {
  kind: MeterEventKind.QUERY_EXECUTED;
  count?: number; // defaults to 1
}

export interface IngestItemEvent extends MeterEventBase {
  kind: MeterEventKind.INGEST_ITEM;
  count?: number; // defaults to 1
}

export interface ExportBuiltEvent extends MeterEventBase {
  kind: MeterEventKind.EXPORT_BUILT;
  count?: number; // defaults to 1
}

export interface ArtifactStoredBytesEvent extends MeterEventBase {
  kind: MeterEventKind.ARTIFACT_STORED_BYTES;
  bytes: number;
}

export interface WebhookDeliveredEvent extends MeterEventBase {
  kind: MeterEventKind.WEBHOOK_DELIVERED;
  count?: number; // defaults to 1
}

export type MeterEvent =
  | IngestMeterEvent
  | QueryMeterEvent
  | StorageMeterEvent
  | SeatMeterEvent
  | QueryExecutedEvent
  | IngestItemEvent
  | ExportBuiltEvent
  | ArtifactStoredBytesEvent
  | WebhookDeliveredEvent;

export interface TenantUsageDailyRow {
  tenantId: string;
  date: string; // YYYY-MM-DD

  // Legacy fields
  ingestUnits: number;
  queryCredits: number;
  storageBytesEstimate: number;
  activeSeats: number;

  // New fields
  queryExecuted: number;
  ingestItem: number;
  exportBuilt: number;
  artifactStoredBytes: number;
  webhookDelivered: number;

  lastEventAt: string;
  correlationIds: string[];
}
