export enum MeterEventKind {
  INGEST_UNITS = 'ingest.units',
  QUERY_CREDITS = 'query.credits',
  STORAGE_BYTES_ESTIMATE = 'storage.bytes_estimate',
  USER_SEAT_ACTIVE = 'user.seat.active',
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

export type MeterEvent =
  | IngestMeterEvent
  | QueryMeterEvent
  | StorageMeterEvent
  | SeatMeterEvent;

export interface TenantUsageDailyRow {
  tenantId: string;
  date: string; // YYYY-MM-DD
  ingestUnits: number;
  queryCredits: number;
  storageBytesEstimate: number;
  activeSeats: number;
  lastEventAt: string;
  correlationIds: string[];
}
