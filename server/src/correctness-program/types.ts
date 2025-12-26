import { randomUUID } from 'crypto';

export type DomainName = 'customer' | 'billing' | 'usage' | 'content' | 'permissions' | 'generic';

export interface TruthSource {
  name: string;
  description?: string;
  kind: 'database' | 'service' | 'cache' | 'queue' | 'file' | 'api';
  uri?: string;
  owners?: string[];
  guards?: string[];
}

export interface TruthMapEntry {
  domain: DomainName;
  systemOfRecord: TruthSource;
  writers: TruthSource[];
  readers: TruthSource[];
  caches?: TruthSource[];
  syncPaths: { from: string; to: string; cadence: string; guardedBy: string[] }[];
}

export type TruthDebtKind = 'duplicate_source' | 'dual_write' | 'manual_fix';

export interface TruthDebt {
  id: string;
  domain: DomainName;
  kind: TruthDebtKind;
  description: string;
  detectedAt: Date;
  mitigation?: string;
  owner?: string;
}

export interface CanonicalIdentityPolicy {
  canonicalIdField: string;
  mergePolicy: 'prefer_newest' | 'prefer_oldest' | 'manual_review';
  splitPolicy: 'manual_review' | 'auto_split_on_conflict';
  resolutionRules: string[];
}

export interface TruthCheckResult {
  entityId: string;
  domain: DomainName;
  status: 'healthy' | 'drift' | 'unknown';
  notes?: string;
  detectedDrift?: string[];
}

export type InvariantSeverity = 'info' | 'warn' | 'critical';

export interface InvariantDefinition<TInput = any> {
  id: string;
  domain: DomainName;
  description: string;
  severity: InvariantSeverity;
  validate: (input: TInput) => boolean | Promise<boolean>;
  remediation?: string;
}

export interface InvariantViolation<TInput = any> {
  id: string;
  invariantId: string;
  domain: DomainName;
  input: TInput;
  occurredAt: Date;
  quarantined: boolean;
  message: string;
}

export type StateTransition = { from: string; to: string; allowed: boolean; guard?: (payload: any) => boolean };

export interface StateMachineDefinition {
  id: string;
  domain: DomainName;
  states: string[];
  transitions: StateTransition[];
  initialState: string;
}

export interface BulkOperationGuardrail<TInput = any> {
  approver: string;
  dryRun: boolean;
  plannedChanges: TInput[];
}

export interface DriftPair<TRecord = any> {
  id: string;
  domain: DomainName;
  sourceLabel: string;
  targetLabel: string;
  loadSource: () => Promise<TRecord[]> | TRecord[];
  loadTarget: () => Promise<TRecord[]> | TRecord[];
  diff: (source: TRecord[], target: TRecord[]) => string[];
  riskTier: 'high' | 'medium' | 'low';
  autoFix?: (diffs: string[]) => Promise<string[]> | string[];
}

export interface ReconciliationRun {
  id: string;
  pairId: string;
  startedAt: Date;
  completedAt?: Date;
  driftDetected: string[];
  autoFixesApplied: string[];
  requiresReview: boolean;
}

export type MigrationStage = 'dual_run' | 'backfill' | 'verify' | 'cutover' | 'delete' | 'completed' | 'failed';

export interface MigrationManifest {
  id: string;
  domain: DomainName;
  scope: string;
  successCriteria: string[];
  decommissionPlan: string;
  batchSize: number;
  maxRetries: number;
  enableDualRun: boolean;
}

export interface MigrationCheckpoint {
  lastProcessedId?: string;
  processed: number;
  failed: number;
  total?: number;
}

export interface MigrationProgress {
  manifestId: string;
  stage: MigrationStage;
  checkpoint: MigrationCheckpoint;
  errors: string[];
  dlq: { id: string; error: string }[];
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface EventSchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  required: boolean;
}

export interface EventSchema {
  name: string;
  version: string;
  fields: EventSchemaField[];
  owner: string;
  piiSafe: boolean;
}

export interface EventEnvelope {
  id: string;
  name: string;
  version: string;
  payload: Record<string, any>;
  occurredAt: Date;
  correlationId?: string;
  orderingKey?: string;
  sequence?: number;
  dedupeKey?: string;
}

export interface EventHandlingResult {
  idempotentHit: boolean;
  validated: boolean;
  ordered: boolean;
}

export interface RecordTimelineEntry {
  entityId: string;
  domain: DomainName;
  occurredAt: Date;
  actor: string;
  action: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  correlationId: string;
}

export interface RepairAction<TPayload = any> {
  id: string;
  name: string;
  risk: 'low' | 'medium' | 'high';
  payload: TPayload;
  dryRun: boolean;
  diff: string;
  approvalRequired: boolean;
  approvedBy?: string;
  executedBy?: string;
  executedAt?: Date;
}

export interface CorrectnessScorecard {
  domain: DomainName;
  driftRate: number;
  invariantViolations: number;
  mttrHours: number;
  updatedAt: Date;
}

export interface ExceptionWaiver {
  id: string;
  domain: DomainName;
  description: string;
  expiresAt: Date;
  owner: string;
}

export const newIdentifier = () => randomUUID();

export interface AgentCoordinationPlan {
  id: string;
  agents: string[];
  dependencies: { from: string; to: string; type: 'data' | 'control' | 'resource' }[];
  executionSequence: string[][]; // Parallel execution groups
  timeoutMs: number;
  governanceRequirements: string[];
  auditTrail: boolean;
}

export interface CoordinationResult {
  success: boolean;
  agentResults: Map<string, any>;
  invariantViolations: number;
  governanceCompliance: boolean;
  elapsedMs: number;
  traceId: string;
}

export interface AgentCoordinationConfig {
  enableGovernanceChecks: boolean;
  maxConcurrency: number;
  requireAuditTrail: boolean;
  correctnessThreshold: number;
  circuitBreakerEnabled: boolean;
}
