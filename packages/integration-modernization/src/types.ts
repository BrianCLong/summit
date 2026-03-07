export type IntegrationKind = "pull" | "push" | "event-driven" | "file-based" | "human-in-the-loop";

export type ContractVersioning = {
  current: string;
  supported: string[];
};

export type PaginationContract =
  | { type: "cursor"; param: string }
  | { type: "offset"; param: string; limitParam?: string }
  | { type: "none" };

export type ErrorContract = {
  retryableErrors: string[];
  fatalErrors: string[];
};

export type IdempotencyContract = {
  idempotencyKeyHeader: string;
  dedupeWindowSeconds: number;
};

export type ConnectorContract = {
  versioning: ContractVersioning;
  pagination: PaginationContract;
  errors: ErrorContract;
  idempotency: IdempotencyContract;
};

export type HealthStatus = "connected" | "degraded" | "failing" | "paused";

export type ConnectorOwner = {
  team: string;
  pagerDuty?: string;
  slackChannel?: string;
};

export type ConnectorMetadata = {
  id: string;
  name: string;
  kind: IntegrationKind;
  owner: ConnectorOwner;
  contract: ConnectorContract;
  sandboxFixtures?: Record<string, unknown>;
  systemOfRecord?: string;
};

export type ConnectorResult = {
  success: boolean;
  data?: unknown;
  error?: Error;
};

export type SandboxMode = "live" | "sandbox";

export type RetryPolicy = {
  attempts: number;
  backoffMs: number;
};

export type DeliveryStatus = "pending" | "delivered" | "failed" | "dead-lettered";

export type EventRecord = {
  tenantId: string;
  name: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  timestamp: number;
  status: DeliveryStatus;
  attempts: number;
};

export type SchemaDefinition = {
  name: string;
  version: string;
  requiredFields: string[];
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  timestamp: number;
  details?: Record<string, unknown>;
};

export type Approval = {
  approvedBy?: string;
  approvedAt?: number;
  required: boolean;
};

export type WorkflowStep = {
  id: string;
  name: string;
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  approval?: Approval;
  maxAttempts?: number;
};

export type WorkflowInstance = {
  id: string;
  tenantId: string;
  steps: WorkflowStep[];
  cursor: number;
  state: "pending" | "running" | "failed" | "completed" | "paused";
  history: AuditEntry[];
  payload: Record<string, unknown>;
};

export type QuarantineRecord = {
  connectorId: string;
  reason: string;
  payload: unknown;
  timestamp: number;
};

export type ReconciliationResult = {
  drift: Record<string, { expected: unknown; actual: unknown }>;
  resolved: string[];
};
