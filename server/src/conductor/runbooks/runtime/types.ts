/**
 * Runbook Runtime Types
 *
 * Enhanced types for DAG-based runbook execution with:
 * - PAUSE/RESUME/CANCEL control actions
 * - Persistent execution state
 * - Pluggable step executors
 * - Comprehensive audit logging
 *
 * @module runbooks/runtime/types
 */

import { v4 as uuidv4 } from 'uuid';
import { LegalBasis, DataLicense, Evidence, Citation, CryptographicProof } from '../dags/types';

// ============================================================================
// Step & Runbook Status Types
// ============================================================================

/**
 * Status of an individual step execution
 */
export type RunbookStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'SKIPPED'
  | 'CANCELLED';

/**
 * Overall execution status
 */
export type RunbookExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Control actions for execution management
 */
export type RunbookControlAction = 'PAUSE' | 'RESUME' | 'CANCEL';

// ============================================================================
// Step Action Types
// ============================================================================

/**
 * Predefined action types for step executors
 */
export type RunbookActionType =
  | 'INGEST'
  | 'LOOKUP_GRAPH'
  | 'PATTERN_MINER'
  | 'ENRICH_INTEL'
  | 'GENERATE_REPORT'
  | 'NOTIFY'
  | 'VALIDATE'
  | 'TRANSFORM'
  | 'CUSTOM';

// ============================================================================
// Runbook Definition Types
// ============================================================================

/**
 * Retry policy for step execution
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffSeconds: number;
  backoffMultiplier?: number; // Exponential backoff
  maxBackoffSeconds?: number;
}

/**
 * Step definition within a runbook
 */
export interface RunbookStepDefinition {
  id: string;
  name: string;
  description?: string;
  actionType: RunbookActionType;
  dependsOn?: string[]; // Parent step IDs for DAG
  config: Record<string, unknown>; // Configuration payload for the step
  retryPolicy?: RetryPolicy;
  timeoutMs?: number;
  skipOnFailure?: boolean; // Allow workflow to continue if this step fails
}

/**
 * Complete runbook definition
 */
export interface RunbookDefinition {
  id: string;
  name: string;
  version: string;
  purpose: string;
  legalBasisRequired?: LegalBasis[];
  dataLicensesRequired?: DataLicense[];
  assumptions?: string[];
  kpis?: string[];
  steps: RunbookStepDefinition[];
  benchmarks?: {
    totalMs: number;
    perStepMs: Record<string, number>;
  };
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Execution State Types
// ============================================================================

/**
 * State of an individual step execution
 */
export interface RunbookStepExecutionState {
  stepId: string;
  status: RunbookStepStatus;
  attempt: number;
  startedAt?: string; // ISO timestamp
  finishedAt?: string;
  errorMessage?: string;
  output?: Record<string, unknown>;
  durationMs?: number;
}

/**
 * Complete execution state
 */
export interface RunbookExecution {
  executionId: string;
  runbookId: string;
  runbookVersion: string;
  startedBy: string;
  tenantId: string;
  startedAt: string;
  lastUpdatedAt: string;
  finishedAt?: string;
  status: RunbookExecutionStatus;
  input: Record<string, unknown>;
  steps: RunbookStepExecutionState[];
  authorityIds?: string[];
  legalBasis?: LegalBasis;
  dataLicenses?: DataLicense[];
  evidence: Evidence[];
  citations: Citation[];
  proofs: CryptographicProof[];
  kpis: Record<string, number>;
  error?: string;
  controlledBy?: string; // User who paused/resumed/cancelled
  controlledAt?: string;
}

// ============================================================================
// Step Executor Types
// ============================================================================

/**
 * Context provided to step executors
 */
export interface StepExecutorContext {
  executionId: string;
  runbookId: string;
  tenantId: string;
  userId: string;
  step: RunbookStepDefinition;
  input: Record<string, unknown>;
  previousStepOutputs: Record<string, unknown>; // Keyed by stepId
  legalBasis?: LegalBasis;
  dataLicenses?: DataLicense[];
  authorityIds?: string[];
}

/**
 * Result returned by step executors
 */
export interface StepExecutorResult {
  success: boolean;
  output: Record<string, unknown>;
  evidence?: Evidence[];
  citations?: Citation[];
  proofs?: CryptographicProof[];
  kpis?: Record<string, number>;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Step executor interface
 */
export interface StepExecutor {
  readonly actionType: RunbookActionType;
  execute(ctx: StepExecutorContext): Promise<StepExecutorResult>;
}

/**
 * Step executor registry
 */
export interface StepExecutorRegistry {
  register(executor: StepExecutor): void;
  getExecutor(actionType: RunbookActionType): StepExecutor | undefined;
  hasExecutor(actionType: RunbookActionType): boolean;
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/**
 * Repository for runbook definitions
 */
export interface RunbookDefinitionRepository {
  getById(id: string, version?: string): Promise<RunbookDefinition | null>;
  list(): Promise<RunbookDefinition[]>;
  listByIds(ids: string[]): Promise<RunbookDefinition[]>;
  save(definition: RunbookDefinition): Promise<void>;
  delete(id: string, version?: string): Promise<void>;
}

/**
 * Repository for execution state
 */
export interface RunbookExecutionRepository {
  create(execution: RunbookExecution): Promise<void>;
  update(execution: RunbookExecution): Promise<void>;
  getById(executionId: string): Promise<RunbookExecution | null>;
  listByRunbook(runbookId: string, limit?: number): Promise<RunbookExecution[]>;
  listByTenant(tenantId: string, limit?: number): Promise<RunbookExecution[]>;
  listByStatus(status: RunbookExecutionStatus, limit?: number): Promise<RunbookExecution[]>;
}

// ============================================================================
// Audit Log Types
// ============================================================================

/**
 * Event types for audit logging
 */
export type RunbookLogEventType =
  | 'EXECUTION_STARTED'
  | 'EXECUTION_STATUS_CHANGED'
  | 'STEP_STARTED'
  | 'STEP_SUCCEEDED'
  | 'STEP_FAILED'
  | 'STEP_SKIPPED'
  | 'EXECUTION_PAUSED'
  | 'EXECUTION_RESUMED'
  | 'EXECUTION_CANCELLED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED';

/**
 * Audit log entry
 */
export interface RunbookExecutionLogEntry {
  logId: string;
  executionId: string;
  runbookId: string;
  tenantId: string;
  timestamp: string;
  actorId: string;
  eventType: RunbookLogEventType;
  stepId?: string;
  details: Record<string, unknown>;
  previousHash?: string;
  hash: string;
}

/**
 * Audit log repository
 */
export interface RunbookExecutionLogRepository {
  append(entry: RunbookExecutionLogEntry): Promise<void>;
  listByExecution(executionId: string): Promise<RunbookExecutionLogEntry[]>;
  listByTenant(tenantId: string, limit?: number): Promise<RunbookExecutionLogEntry[]>;
  verifyChain(executionId: string): Promise<{ valid: boolean; error?: string }>;
}

// ============================================================================
// Runtime Interface
// ============================================================================

/**
 * Main runtime interface for executing runbooks
 */
export interface RunbookRuntime {
  /**
   * Start a new runbook execution
   */
  startExecution(
    runbookId: string,
    input: Record<string, unknown>,
    options: {
      startedBy: string;
      tenantId: string;
      authorityIds?: string[];
      legalBasis?: LegalBasis;
      dataLicenses?: DataLicense[];
    }
  ): Promise<RunbookExecution>;

  /**
   * Get execution state
   */
  getExecution(executionId: string): Promise<RunbookExecution | null>;

  /**
   * Control execution (PAUSE/RESUME/CANCEL)
   */
  controlExecution(
    executionId: string,
    action: RunbookControlAction,
    actorId: string
  ): Promise<RunbookExecution>;

  /**
   * Get execution logs
   */
  getExecutionLogs(executionId: string): Promise<RunbookExecutionLogEntry[]>;
}

// ============================================================================
// Service Interfaces for CTI
// ============================================================================

/**
 * Indicator ingest service interface
 */
export interface IndicatorIngestService {
  ingestIndicators(input: {
    indicators: string[];
    indicatorTypes?: string[];
    caseId?: string;
    source?: string;
  }): Promise<{
    indicatorNodeIds: string[];
    enrichedIndicators: Array<{
      id: string;
      value: string;
      type: string;
      reputation?: string;
      firstSeen?: string;
      lastSeen?: string;
    }>;
  }>;
}

/**
 * Infrastructure enrichment service interface
 */
export interface InfrastructureEnrichmentService {
  enrichInfrastructure(input: {
    indicatorNodeIds: string[];
    depth?: number;
  }): Promise<{
    infraNodeIds: string[];
    infrastructure: Array<{
      id: string;
      type: string;
      value: string;
      relationships: Array<{
        type: string;
        target: string;
      }>;
    }>;
  }>;
}

/**
 * Pattern miner service interface
 */
export interface PatternMinerService {
  findMatchingCampaigns(input: {
    infraNodeIds: string[];
    indicatorNodeIds?: string[];
    minConfidence?: number;
  }): Promise<{
    campaignIds: string[];
    matches: Array<{
      campaignId: string;
      campaignName: string;
      score: number;
      matchedIndicators: number;
      matchedTTPs: string[];
      actorProfile?: {
        id: string;
        name: string;
        aliases: string[];
        motivation: string;
      };
    }>;
  }>;
}

/**
 * Report generator service interface
 */
export interface ReportGeneratorService {
  generateAttributionReport(input: {
    indicators: string[];
    infraNodeIds: string[];
    campaignMatches: Array<{ campaignId: string; campaignName: string; score: number }>;
    residualUnknowns: string[];
    caseId?: string;
  }): Promise<{
    reportId: string;
    reportSummary: string;
    reportUrl?: string;
    confidenceScore: number;
    attributedActor?: {
      id: string;
      name: string;
      confidence: number;
    };
  }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a new execution ID
 */
export function generateExecutionId(): string {
  return `exec-${uuidv4()}`;
}

/**
 * Generate a new log entry ID
 */
export function generateLogId(): string {
  return `log-${uuidv4()}`;
}

/**
 * Get current ISO timestamp
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Create initial execution state
 */
export function createInitialExecution(
  runbook: RunbookDefinition,
  input: Record<string, unknown>,
  options: {
    startedBy: string;
    tenantId: string;
    authorityIds?: string[];
    legalBasis?: LegalBasis;
    dataLicenses?: DataLicense[];
  }
): RunbookExecution {
  const now = nowISO();
  return {
    executionId: generateExecutionId(),
    runbookId: runbook.id,
    runbookVersion: runbook.version,
    startedBy: options.startedBy,
    tenantId: options.tenantId,
    startedAt: now,
    lastUpdatedAt: now,
    status: 'PENDING',
    input,
    steps: runbook.steps.map((step) => ({
      stepId: step.id,
      status: 'PENDING',
      attempt: 0,
    })),
    authorityIds: options.authorityIds,
    legalBasis: options.legalBasis,
    dataLicenses: options.dataLicenses,
    evidence: [],
    citations: [],
    proofs: [],
    kpis: {},
  };
}
