export type LongRunMode = 'advisory' | 'strict';

export interface LongRunBudgets {
  perHourUsd: number;
  totalUsd: number;
  tokens: number;
}

export interface ModelPolicy {
  searchModel: string;
  buildModel: string;
  debugModel: string;
  maxContextTokens?: number;
  routingNotes?: string;
}

export interface QualityGatePolicy {
  required: string[];
  optional?: string[];
}

export interface StopConditionPolicy {
  maxIterations: number;
  maxStallIterations: number;
  maxRepeatErrors: number;
  maxRepeatDiffs: number;
  requireConsecutiveDone: number;
  manualStopFile: string;
}

export interface LongRunJobSpec {
  job_id: string;
  goal: string;
  scope_paths: string[];
  allowed_tools: string[];
  mode?: LongRunMode;
  budgets: LongRunBudgets;
  model_policy: ModelPolicy;
  quality_gates: QualityGatePolicy;
  stop_conditions: StopConditionPolicy;
  metadata?: {
    owner?: string;
    labels?: string[];
    created_at?: string;
  };
}

export interface PlanStatus {
  completed: number;
  total: number;
  remaining?: string[];
}

export interface QualityGateStatus {
  passed: string[];
  failed: string[];
}

export interface DiffSummary {
  hash?: string;
  filesChanged?: string[];
  changedLines?: number;
  meaningful?: boolean;
}

export interface IterationMetrics {
  tokensUsed: number;
  costUsd: number;
  iterationTimeMs: number;
  testTimeMs: number;
}

export interface IterationInput {
  iteration: number;
  planStatus?: PlanStatus;
  qualityGates?: QualityGateStatus;
  diffSummary?: DiffSummary;
  errors?: string[];
  doneSignal?: boolean;
  metrics?: IterationMetrics;
  commandLog?: string[];
  patch?: string;
  planDiff?: string;
  testReport?: Record<string, unknown>;
  summary?: string;
}

export interface StopDecision {
  status: 'continue' | 'stop';
  reason: string;
  detail?: string;
}

export interface StopState {
  consecutiveDoneSignals: number;
  stallCount: number;
  diffHashCounts: Record<string, number>;
  errorCounts: Record<string, number>;
  lastMeaningfulIteration: number;
}

export interface EvidenceManifest {
  jobId: string;
  goal: string;
  mode: LongRunMode;
  createdAt: string;
  updatedAt: string;
  budgets: LongRunBudgets;
  modelPolicy: ModelPolicy;
  qualityGates: QualityGatePolicy;
  stopConditions: StopConditionPolicy;
  iterations: Array<{
    iteration: number;
    timestamp: string;
    metrics?: IterationMetrics;
    diffSummary?: DiffSummary;
    planStatus?: PlanStatus;
    qualityGates?: QualityGateStatus;
    stopDecision: StopDecision;
    checkpointPath: string;
  }>;
  completion: {
    status: 'in-progress' | 'completed' | 'halted';
    reason: string;
    verified: boolean;
    verifiedAt?: string;
  };
}
