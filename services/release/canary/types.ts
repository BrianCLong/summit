export interface CanaryStep {
  /** Percentage of production traffic directed to the canary instance. */
  weight: number;
  /** Minimum bake time (in seconds) that the step must sustain healthy signals before promotion. */
  minBakeTimeSeconds: number;
}

export interface SyntheticCheckResult {
  name: string;
  passed: boolean;
  latencyMs: number;
  details?: string;
}

export interface ProbeResult {
  name: string;
  success: boolean;
  latencyMs: number;
}

export interface HealthMetrics {
  /** Error rate (0-1) observed on canary traffic. */
  errorRate: number;
  /** P95 latency in milliseconds for canary traffic. */
  latencyP95: number;
  /** Saturation (0-1) representing capacity pressure. */
  saturation: number;
  /** Raw probe results for deeper inspection. */
  probes: ProbeResult[];
}

export interface BaselineMetrics {
  /** Baseline error rate (0-1) from the steady/stable cohort. */
  errorRate: number;
  /** Baseline P95 latency in milliseconds from the steady/stable cohort. */
  latencyP95: number;
  /** Baseline saturation (0-1) from the steady/stable cohort. */
  saturation: number;
}

export interface ThresholdPolicy {
  /** Hard ceiling for acceptable error rate (0-1). */
  maxErrorRate: number;
  /** Hard ceiling for acceptable P95 latency in milliseconds. */
  maxLatencyP95: number;
  /** Hard ceiling for acceptable saturation (0-1). */
  maxSaturation: number;
  /** Minimum acceptable success rate across probes (0-1). */
  minProbeSuccess: number;
  /** Composite score threshold required to promote to the next step. */
  compositePassScore: number;
  /** Number of consecutive unhealthy evaluations before mandatory rollback. */
  consecutiveBreachLimit: number;
}

export interface ComponentWeights {
  errorRate: number;
  latency: number;
  saturation: number;
  probes: number;
}

export interface HealthSample {
  collectedAt: string; // ISO timestamp
  metrics: HealthMetrics;
  baseline: BaselineMetrics;
  syntheticChecks: SyntheticCheckResult[];
}

export type RolloutStatus =
  | 'idle'
  | 'running'
  | 'holding'
  | 'completed'
  | 'rolling_back'
  | 'aborted';

export interface StepHealthHistory {
  stepIndex: number;
  startedAt: string;
  evaluations: HealthEvaluation[];
}

export interface CanaryState {
  status: RolloutStatus;
  currentStepIndex: number;
  stepStartedAt?: string;
  breaches: number;
  history: StepHealthHistory[];
  abortSignal?: AbortSignal;
}

export interface AbortSignal {
  actor: string;
  reason: string;
  at: string;
}

export interface HealthEvaluation {
  collectedAt: string;
  compositeScore: number;
  componentScores: Record<string, number>;
  sloBreaches: string[];
  syntheticFailures: string[];
}

export interface EvaluationOutcome {
  action:
    | 'start_step'
    | 'promote'
    | 'hold'
    | 'rollback'
    | 'complete'
    | 'abort'
    | 'noop';
  reason: string;
  state: CanaryState;
  compositeScore: number;
  sloBreaches: string[];
  syntheticFailures: string[];
  helmCommands: string[];
  auditEvent?: AuditEvent;
}

export interface AuditEvent {
  actor: string;
  action: string;
  reason: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CanaryConfig {
  service: string;
  environment: string;
  steps: CanaryStep[];
  weights: ComponentWeights;
  policy: ThresholdPolicy;
}
