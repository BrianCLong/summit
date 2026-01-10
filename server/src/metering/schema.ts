export enum MeterEventKind {
  INGEST_UNITS = 'ingest.units',
  QUERY_CREDITS = 'query.credits',
  STORAGE_BYTES_ESTIMATE = 'storage.bytes_estimate',
  USER_SEAT_ACTIVE = 'user.seat.active',
  LLM_TOKENS = 'llm.tokens',
  MAESTRO_COMPUTE_MS = 'maestro.compute.ms',
  API_REQUEST = 'api.request',
  RUN_STARTED = 'run_started',
  STEP_EXECUTED = 'step_executed',
  APPROVAL_DECISION = 'approval_decision',
  RECEIPT_EMITTED = 'receipt_emitted',
  EVIDENCE_EXPORTED = 'evidence_exported',
  STORAGE_BYTES_WRITTEN = 'storage_bytes_written',
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

export interface LlmMeterEvent extends MeterEventBase {
  kind: MeterEventKind.LLM_TOKENS;
  tokens: number;
  model: string;
  provider: string;
}

export interface ComputeMeterEvent extends MeterEventBase {
  kind: MeterEventKind.MAESTRO_COMPUTE_MS;
  durationMs: number;
  taskId?: string;
}

export interface RequestMeterEvent extends MeterEventBase {
  kind: MeterEventKind.API_REQUEST;
  endpoint?: string;
  method?: string;
  statusCode?: number;
}

export interface RunStartedMeterEvent extends MeterEventBase {
  kind: MeterEventKind.RUN_STARTED;
  runId: string;
  pipelineName?: string;
}

export interface StepExecutedMeterEvent extends MeterEventBase {
  kind: MeterEventKind.STEP_EXECUTED;
  runId: string;
  stepId: string;
  status: 'success' | 'failed';
  tool?: string;
}

export interface ApprovalDecisionMeterEvent extends MeterEventBase {
  kind: MeterEventKind.APPROVAL_DECISION;
  runId: string;
  stepId: string;
  decision: 'approved' | 'declined';
  userId?: string;
}

export interface ReceiptEmittedMeterEvent extends MeterEventBase {
  kind: MeterEventKind.RECEIPT_EMITTED;
  runId: string;
  receiptId: string;
  artifactId: string;
}

export interface EvidenceExportedMeterEvent extends MeterEventBase {
  kind: MeterEventKind.EVIDENCE_EXPORTED;
  runId: string;
  evidenceCount?: number;
}

export interface StorageBytesWrittenMeterEvent extends MeterEventBase {
  kind: MeterEventKind.STORAGE_BYTES_WRITTEN;
  bytes: number;
  storagePath?: string;
}

export type MeterEvent =
  | IngestMeterEvent
  | QueryMeterEvent
  | StorageMeterEvent
  | SeatMeterEvent
  | LlmMeterEvent
  | ComputeMeterEvent
  | RequestMeterEvent
  | RunStartedMeterEvent
  | StepExecutedMeterEvent
  | ApprovalDecisionMeterEvent
  | ReceiptEmittedMeterEvent
  | EvidenceExportedMeterEvent
  | StorageBytesWrittenMeterEvent;

export interface TenantUsageDailyRow {
  tenantId: string;
  date: string; // YYYY-MM-DD
  ingestUnits: number;
  queryCredits: number;
  storageBytesEstimate: number;
  activeSeats: number;
  llmTokens: number;
  computeMs: number;
  apiRequests: number;
  lastEventAt: string;
  correlationIds: string[];
  // Additional quota tracking fields
  queryExecuted?: number;
  ingestItem?: number;
  exportBuilt?: number;
  artifactStoredBytes?: number;
  webhookDelivered?: number;
}
