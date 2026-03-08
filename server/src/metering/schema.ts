export enum MeterEventKind {
  INGEST_UNITS = 'ingest.units',
  QUERY_CREDITS = 'query.credits',
  STORAGE_BYTES_ESTIMATE = 'storage.bytes_estimate',
  USER_SEAT_ACTIVE = 'user.seat.active',
  LLM_TOKENS = 'llm.tokens',
  MAESTRO_COMPUTE_MS = 'maestro.compute.ms',
  API_REQUEST = 'api.request',
  POLICY_SIMULATION = 'policy.simulation',
  WORKFLOW_EXECUTION = 'workflow.execution',
  RECEIPT_WRITE = 'receipt.write',
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

export interface PolicySimulationMeterEvent extends MeterEventBase {
  kind: MeterEventKind.POLICY_SIMULATION;
  rulesCount: number;
}

export interface WorkflowExecutionMeterEvent extends MeterEventBase {
  kind: MeterEventKind.WORKFLOW_EXECUTION;
  workflowName: string;
  stepsCount: number;
}

export interface ReceiptWriteMeterEvent extends MeterEventBase {
  kind: MeterEventKind.RECEIPT_WRITE;
  action: string;
}

export type MeterEvent =
  | IngestMeterEvent
  | QueryMeterEvent
  | StorageMeterEvent
  | SeatMeterEvent
  | LlmMeterEvent
  | ComputeMeterEvent
  | RequestMeterEvent
  | PolicySimulationMeterEvent
  | WorkflowExecutionMeterEvent
  | ReceiptWriteMeterEvent;

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
  policySimulations: number;
  workflowExecutions: number;
  receiptWrites: number;
  lastEventAt: string;
  correlationIds: string[];
  // Additional quota tracking fields
  queryExecuted?: number;
  ingestItem?: number;
  exportBuilt?: number;
  artifactStoredBytes?: number;
  webhookDelivered?: number;
}
