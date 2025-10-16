/**
 * Generated TypeScript definitions from Maestro OpenAPI 3.1 spec
 * For full GA Maestro Build Plane implementation
 */

export interface Pipeline {
  id: string;
  name: string;
  version: string;
  dag: Record<string, unknown>;
  params: Record<string, unknown>;
  policies: string[];
  flags: string[];
  createdBy: string;
  verifiedBy: string;
}

export interface Run {
  id: string;
  pipelineId: string;
  commit: string;
  env: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  cost: Record<string, unknown>;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  artifacts: Artifact[];
  attestations: Attestation[];
  alerts: string[];
  traceId: string;
}

export interface Step {
  id: string;
  runId: string;
  name: string;
  status: string;
  logs: string[];
  metrics: Record<string, unknown>;
  attemptN: number;
}

export interface Artifact {
  id: string;
  type: string;
  uri: string;
  digest: string;
  sbomRef?: string;
  signed: boolean;
}

export interface Attestation {
  id: string;
  type: 'SBOM' | 'SLSA' | 'Cosign';
  status: string;
  details: Record<string, unknown>;
  evidence: Record<string, unknown>[];
}

export interface Policy {
  id: string;
  type: 'OPA' | 'Kyverno' | 'Gatekeeper';
  source: string;
  version: string;
  result: string;
  reason: string;
}

export interface Budget {
  id: string;
  tier: string;
  caps: Record<string, unknown>;
  usage: Record<string, unknown>[];
  alerts: string[];
}

export interface RoutingCandidate {
  provider: string;
  model: string;
  score: number;
  latency: number;
  cost: number;
  reliability: number;
  policyGrade: string;
}

export interface SLO {
  name: string;
  target: number;
  current: number;
  errorBudget: number;
  burnRate: number;
  windowHours: number;
}

export interface EvidenceBundle {
  runId: string;
  bundleUrl: string;
  signature: string;
  contents: {
    sbom: Record<string, unknown>;
    attestations: Attestation[];
    policyProofs: Record<string, unknown>[];
    sloSnapshot: Record<string, unknown>;
    rolloutSnapshot: Record<string, unknown>;
  };
}

export interface ControlHubSummary {
  autonomy: {
    level: number;
    canary: number;
  };
  health: {
    success: number;
    p95: number;
    burn: number;
  };
  budgets: {
    remaining: number;
    cap: number;
  };
  runs: { id: string; status: string; pipeline?: string }[];
  approvals: { id: string }[];
  changes: {
    at: string;
    title: string;
    by: string;
  }[];
}

export interface RunsListResponse {
  items: Run[];
  nextCursor?: string;
}

export interface RunAction {
  action: 'promote' | 'pause' | 'resume' | 'rerun' | 'rollback';
  reason?: string;
}

export interface DAGResponse {
  nodes: {
    id: string;
    label: string;
    state: string;
    retries?: number;
  }[];
  edges: {
    from: string;
    to: string;
  }[];
}

export interface RoutingPinRequest {
  class: string;
  provider: string;
  model: string;
  ttl?: number;
}

export interface PipelineSimulation {
  changes: Record<string, unknown>;
  policies: string[];
}

export interface SimulationResult {
  diff: Record<string, unknown>;
  violations: Record<string, unknown>[];
}

export interface Recipe {
  id: string;
  name: string;
  version: string;
  verified: boolean;
  signature: string;
  trustScore: number;
}

export interface RecipeInstantiation {
  params: Record<string, unknown>;
  name: string;
}

export interface Alert {
  id: string;
  severity: string;
  message: string;
  runbook: string;
  timestamp: string;
}

export interface AlertAck {
  assignee: string;
  note?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
}

// SSE Event types
export interface SSEEvent {
  ts: string;
  type: string;
  id: string;
  entity: string;
  payload: Record<string, unknown>;
  traceId?: string;
}

export type RunEventType =
  | 'run_started'
  | 'run_progress'
  | 'run_completed'
  | 'step_started'
  | 'step_completed'
  | 'step_failed';

export type PolicyEventType = 'policy_denied' | 'policy_approved';
export type BudgetEventType = 'budget_warning' | 'budget_exceeded';
export type AlertEventType = 'alert_fired' | 'alert_resolved';
export type RoutingEventType = 'routing_failover' | 'routing_restored';

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  traceId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  nextCursor?: string;
}

// Filter and query types
export interface RunFilters {
  status?: string;
  pipeline?: string;
  env?: string;
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface LogQuery {
  step?: string;
  since?: string;
  stream?: boolean;
}

// Enhanced types for specific features
export interface RunDetailTabs {
  overview: ControlHubSummary;
  dag: DAGResponse;
  logs: LogEntry[];
  observability: ObservabilityMetrics;
  evidence: EvidenceBundle;
  policies: PolicyResult[];
  artifacts: Artifact[];
  timeline: TimelineEvent[];
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  step?: string;
  metadata?: Record<string, unknown>;
}

export interface ObservabilityMetrics {
  traces: TraceData[];
  metrics: MetricData[];
  alerts: Alert[];
  slos: SLO[];
}

export interface TraceData {
  traceId: string;
  spans: SpanData[];
  duration: number;
  status: string;
}

export interface SpanData {
  spanId: string;
  operationName: string;
  startTime: number;
  duration: number;
  tags: Record<string, unknown>;
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  labels: Record<string, string>;
}

export interface PolicyResult {
  id: string;
  name: string;
  result: 'allow' | 'deny' | 'warn';
  reason: string;
  rulePath: string;
  evidence: Record<string, unknown>;
}

export interface TimelineEvent {
  timestamp: string;
  type: string;
  description: string;
  actor: string;
  metadata?: Record<string, unknown>;
}

// Command Palette types
export interface CommandPaletteAction {
  id: string;
  title: string;
  description?: string;
  category: string;
  icon?: string;
  hotkey?: string;
  handler: () => void;
}

// Environment and configuration
export interface EnvironmentConfig {
  name: string;
  base: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

// User and RBAC
export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  tenant: string;
}

export interface Tenant {
  id: string;
  name: string;
  tier: string;
  limits: Budget;
  users: User[];
}

export type PermissionAction =
  | 'read'
  | 'write'
  | 'delete'
  | 'execute'
  | 'admin';

export interface Permission {
  resource: string;
  action: PermissionAction;
  conditions?: Record<string, unknown>;
}
