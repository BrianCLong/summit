/**
 * Core type definitions for the Agentic Mesh Evaluation & Auto-Improvement Harness
 *
 * @module mesh-eval-sdk/types
 * @packageDocumentation
 */

// ============================================================================
// Scenario Types
// ============================================================================

/**
 * Categorization of evaluation scenarios
 */
export type ScenarioType =
  | 'code_transformation'
  | 'incident_investigation'
  | 'research_synthesis'
  | 'policy_sensitive'
  | 'export_controlled'
  | 'adversarial_prompting'
  | 'multi_step_reasoning'
  | 'tool_usage'
  | 'custom';

/**
 * Difficulty level of a scenario
 */
export type DifficultyLevel = 'trivial' | 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Input artifact for a scenario
 */
export interface ScenarioInput {
  /** Type of input */
  type: 'text' | 'code' | 'file' | 'structured';

  /** Content of the input */
  content: string | object;

  /** Optional metadata about the input */
  metadata?: Record<string, unknown>;
}

/**
 * Constraint on scenario execution
 */
export interface Constraint {
  /** Type of constraint */
  type: 'time_limit' | 'cost_limit' | 'policy_requirement' | 'tool_restriction';

  /** Constraint value (type depends on constraint type) */
  value: unknown;

  /** Whether this is a hard constraint (fail) or soft (warn) */
  strict: boolean;
}

/**
 * Expected output specification (for scenarios with ground truth)
 */
export interface ExpectedOutput {
  /** Type of expected output */
  type: 'exact_match' | 'regex' | 'semantic_similarity' | 'assertion' | 'custom';

  /** Expected value or pattern */
  value: unknown;

  /** Tolerance for numeric/similarity comparisons */
  tolerance?: number;

  /** Description of what this output represents */
  description?: string;
}

/**
 * Scoring strategy configuration
 */
export interface ScoringStrategy {
  /** Primary scoring method */
  method: 'rule_based' | 'llm_judged' | 'policy_based' | 'hybrid';

  /** Rule-based configuration */
  rules?: {
    assertions: Assertion[];
    aggregation?: 'all' | 'any' | 'weighted_average';
  };

  /** LLM judge configuration */
  llmJudge?: {
    model: string;
    prompt: string;
    dimensions: string[];
    temperature?: number;
  };

  /** Policy scoring configuration */
  policyScoring?: {
    maxViolations: number;
    requiredCompliance: string[];
  };

  /** Weights for hybrid scoring */
  weights?: Record<string, number>;
}

/**
 * Rule-based assertion
 */
export interface Assertion {
  /** Assertion type */
  type: 'contains' | 'not_contains' | 'regex_match' | 'json_valid' | 'custom';

  /** Expected value */
  value: unknown;

  /** Path in output to check (JSONPath or similar) */
  path?: string;

  /** Weight of this assertion in overall score */
  weight?: number;

  /** Error message if assertion fails */
  errorMessage?: string;
}

/**
 * Evaluation rubric for subjective scoring
 */
export interface EvaluationRubric {
  /** Dimensions to evaluate */
  dimensions: RubricDimension[];

  /** Overall scoring guidance */
  guidance?: string;

  /** Examples of different score levels */
  examples?: ScoringExample[];
}

/**
 * A dimension in an evaluation rubric
 */
export interface RubricDimension {
  /** Dimension name (e.g., 'correctness', 'clarity') */
  name: string;

  /** Weight in overall score (0-1) */
  weight: number;

  /** Description of what this dimension measures */
  description: string;

  /** Scoring levels (e.g., 1-5 with descriptions) */
  levels?: ScoreLevel[];
}

/**
 * A scoring level in a rubric dimension
 */
export interface ScoreLevel {
  /** Numeric score */
  score: number;

  /** Label for this level */
  label: string;

  /** Description of what this level means */
  description: string;
}

/**
 * Example for rubric calibration
 */
export interface ScoringExample {
  /** Input for the example */
  input: string;

  /** Output for the example */
  output: string;

  /** Expected score */
  score: number;

  /** Dimension-wise scores */
  dimensionScores?: Record<string, number>;

  /** Rationale for the score */
  rationale: string;
}

/**
 * Complete evaluation scenario definition
 */
export interface EvalScenario {
  /** Unique identifier (e.g., "sc-code-refactor-001") */
  id: string;

  /** Semantic version of this scenario */
  version: string;

  /** Scenario category */
  type: ScenarioType;

  /** Human-readable name */
  name: string;

  /** Detailed description */
  description: string;

  /** Classification tags */
  tags: string[];

  /** Input artifacts and prompts */
  inputs: ScenarioInput[];

  /** Execution constraints */
  constraints: Constraint[];

  /** Expected outputs (if ground truth exists) */
  expectedOutputs?: ExpectedOutput[];

  /** How to score this scenario */
  scoringStrategy: ScoringStrategy;

  /** Scoring rubric (if subjective) */
  rubric?: EvaluationRubric;

  /** Difficulty level */
  difficulty: DifficultyLevel;

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Estimated duration in milliseconds */
  estimatedDuration: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Creator identifier */
  createdBy: string;

  /** Last update timestamp */
  updatedAt: Date;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Agent configuration for evaluation
 */
export interface AgentConfig {
  /** Agent identifier */
  id: string;

  /** Agent type */
  type: string;

  /** Model to use for this agent */
  model?: string;

  /** Agent-specific parameters */
  parameters?: Record<string, unknown>;

  /** Tools available to this agent */
  tools?: string[];
}

/**
 * Model configuration for evaluation
 */
export interface ModelConfig {
  /** Model identifier */
  id: string;

  /** Model provider */
  provider: 'anthropic' | 'openai' | 'google' | 'custom';

  /** Model name/version */
  name: string;

  /** Model parameters */
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    [key: string]: unknown;
  };
}

/**
 * Configuration for an evaluation run
 */
export interface EvalConfig {
  /** Unique configuration identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Scenarios to evaluate (IDs or suite name) */
  scenarios: string[];

  /** Agents to use in evaluation */
  agents: AgentConfig[];

  /** Models to route to */
  models: ModelConfig[];

  /** Routing policy version */
  routingPolicy?: string;

  /** Available tools */
  tools?: string[];

  /** Number of times to run each scenario */
  iterations?: number;

  /** Maximum concurrent executions */
  parallelism?: number;

  /** Global timeout in milliseconds */
  timeout?: number;

  /** Output directory or S3 path */
  outputPath?: string;

  /** Report format(s) */
  reportFormat?: 'json' | 'markdown' | 'html' | 'all';

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Execution & Results Types
// ============================================================================

/**
 * Status of an evaluation run
 */
export type EvalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Status of a scenario execution
 */
export type ScenarioResultStatus = 'pass' | 'fail' | 'skip' | 'error';

/**
 * Policy event captured during evaluation
 */
export interface PolicyEvent {
  /** Event timestamp */
  timestamp: Date;

  /** Policy that triggered */
  policyId: string;

  /** Action taken */
  action: 'allow' | 'deny' | 'redact' | 'escalate' | 'log';

  /** Reason for the action */
  reason: string;

  /** Severity level */
  severity?: 'low' | 'medium' | 'high' | 'critical';

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Result of executing a single scenario
 */
export interface ScenarioResult {
  /** Scenario identifier */
  scenarioId: string;

  /** Execution status */
  status: ScenarioResultStatus;

  /** Scoring results */
  score: EvalScore;

  /** Identified findings/issues */
  findings: EvalFinding[];

  /** Execution time in milliseconds */
  executionTime: number;

  /** Cost in USD */
  cost: number;

  /** Agent outputs */
  agentOutputs: unknown[];

  /** Policy events during execution */
  policyEvents: PolicyEvent[];

  /** Reference to provenance trace */
  provenanceTrace: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Summary statistics for an evaluation run
 */
export interface EvalSummary {
  /** Total scenarios executed */
  totalScenarios: number;

  /** Scenarios passed */
  passed: number;

  /** Scenarios failed */
  failed: number;

  /** Scenarios skipped */
  skipped: number;

  /** Scenarios with errors */
  errors: number;

  /** Overall pass rate (0-1) */
  passRate: number;

  /** Average score across all scenarios */
  avgScore: number;

  /** Total execution time in milliseconds */
  totalExecutionTime: number;

  /** Total cost in USD */
  totalCost: number;

  /** Safety violations detected */
  safetyViolations: number;

  /** Policy denials */
  policyDenials: number;

  /** Dimension-specific averages */
  dimensionAverages: Record<string, number>;
}

/**
 * An evaluation run instance
 */
export interface EvalRun {
  /** Unique run identifier */
  id: string;

  /** Reference to configuration */
  configId: string;

  /** Start timestamp */
  startedAt: Date;

  /** Completion timestamp */
  completedAt?: Date;

  /** Run status */
  status: EvalRunStatus;

  /** Scenario results */
  scenarios: ScenarioResult[];

  /** Aggregate summary */
  summary: EvalSummary;

  /** Git commit hash */
  gitCommit?: string;

  /** Git branch */
  branch?: string;

  /** Environment (dev, staging, prod) */
  environment: string;

  /** Who/what triggered this run */
  triggeredBy: string;

  /** Artifact URLs (S3, etc.) */
  artifactUrls?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Scoring Types
// ============================================================================

/**
 * Scoring method used
 */
export type ScoringMethod = 'rule_based' | 'llm_judged' | 'policy_based' | 'hybrid';

/**
 * Pass/fail status with partial support
 */
export type PassFailStatus = 'pass' | 'fail' | 'partial' | 'uncertain';

/**
 * Risk level assessment
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Structured evaluation score
 */
export interface EvalScore {
  /** Overall score (0-1 normalized) */
  overall: number;

  /** Dimension-specific scores */
  dimensions: {
    correctness?: number;
    coherence?: number;
    completeness?: number;
    safety?: number;
    efficiency?: number;
    [key: string]: number | undefined;
  };

  /** Categorical pass/fail status */
  passFailStatus: PassFailStatus;

  /** Risk level assessment */
  riskLevel?: RiskLevel;

  /** Rationale for the score */
  rationale: string;

  /** Identified strengths */
  strengths: string[];

  /** Identified weaknesses */
  weaknesses: string[];

  /** Scoring method used */
  scoringMethod: ScoringMethod;

  /** Judge model (if LLM-judged) */
  judgeModel?: string;

  /** Judge confidence (0-1) */
  confidence?: number;
}

// ============================================================================
// Finding Types
// ============================================================================

/**
 * Type of finding/issue
 */
export type FindingType =
  | 'correctness_issue'
  | 'safety_violation'
  | 'policy_breach'
  | 'performance_regression'
  | 'cost_anomaly'
  | 'tool_misuse'
  | 'reasoning_error'
  | 'hallucination'
  | 'prompt_injection'
  | 'data_leakage';

/**
 * Severity of finding
 */
export type FindingSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Location information for a finding
 */
export interface FindingLocation {
  /** Agent identifier */
  agent?: string;

  /** Execution step number */
  step?: number;

  /** Tool call identifier */
  toolCall?: string;

  /** Line number (for code) */
  line?: number;

  /** Additional location metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Structured finding/issue
 */
export interface EvalFinding {
  /** Unique finding identifier */
  id: string;

  /** Scenario where this was found */
  scenarioId: string;

  /** Run where this was found */
  runId: string;

  /** Type of finding */
  type: FindingType;

  /** Severity level */
  severity: FindingSeverity;

  /** Finding title */
  title: string;

  /** Detailed description */
  description: string;

  /** Location information */
  location?: FindingLocation;

  /** Recommended remediation */
  recommendation?: string;

  /** Related findings */
  relatedFindings?: string[];

  /** Creation timestamp */
  createdAt: Date;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Baseline Types
// ============================================================================

/**
 * Baseline track type
 */
export type BaselineTrack = 'release' | 'branch' | 'experimental';

/**
 * Per-scenario baseline metrics
 */
export interface ScenarioBaseline {
  /** Scenario identifier */
  scenarioId: string;

  /** Pass rate (0-1) */
  passRate: number;

  /** Average score (0-1) */
  avgScore: number;

  /** P95 latency in milliseconds */
  p95Latency: number;

  /** Average cost in USD */
  avgCost: number;

  /** Dimension-specific baselines */
  dimensionBaselines?: Record<string, number>;
}

/**
 * Versioned performance baseline snapshot
 */
export interface BaselineSnapshot {
  /** Unique baseline identifier */
  id: string;

  /** Version (semantic version or git tag) */
  version: string;

  /** Baseline track */
  track: BaselineTrack;

  /** Aggregate metrics */
  metrics: {
    overallPassRate: number;
    avgCorrectness: number;
    avgSafety: number;
    avgCost: number;
    p95Latency: number;
    [key: string]: number;
  };

  /** Per-scenario baselines */
  scenarioBaselines: Map<string, ScenarioBaseline>;

  /** Git commit hash */
  gitCommit: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Creator identifier */
  createdBy: string;

  /** Notes about this baseline */
  notes?: string;
}

/**
 * Comparison between two baselines or runs
 */
export interface BaselineComparison {
  /** Baseline or run being compared */
  current: string;

  /** Reference baseline */
  reference: string;

  /** Overall delta */
  overallDelta: number;

  /** Dimension deltas */
  dimensionDeltas: Record<string, number>;

  /** Regressions detected */
  regressions: RegressionInfo[];

  /** Improvements detected */
  improvements: ImprovementInfo[];
}

/**
 * Information about a regression
 */
export interface RegressionInfo {
  /** Scenario or dimension affected */
  subject: string;

  /** Metric that regressed */
  metric: string;

  /** Previous value */
  baseline: number;

  /** Current value */
  current: number;

  /** Delta (negative) */
  delta: number;

  /** Severity of regression */
  severity: FindingSeverity;
}

/**
 * Information about an improvement
 */
export interface ImprovementInfo {
  /** Scenario or dimension affected */
  subject: string;

  /** Metric that improved */
  metric: string;

  /** Previous value */
  baseline: number;

  /** Current value */
  current: number;

  /** Delta (positive) */
  delta: number;
}

// ============================================================================
// Update Proposal Types
// ============================================================================

/**
 * Type of configuration update
 */
export type UpdateProposalType = 'routing' | 'policy' | 'agent_config';

/**
 * Status of update proposal
 */
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'implemented';

/**
 * Structured configuration diff
 */
export interface ConfigDiff {
  /** What changed */
  changed: Record<string, { old: unknown; new: unknown }>;

  /** What was added */
  added?: Record<string, unknown>;

  /** What was removed */
  removed?: Record<string, unknown>;
}

/**
 * Supporting data for a proposal
 */
export interface ProposalSupportingData {
  /** Evaluation run IDs that support this proposal */
  evalRunIds: string[];

  /** Metrics supporting the change */
  metrics: Record<string, number>;

  /** Regression tests to validate */
  regressionTests: string[];

  /** Expected improvements */
  expectedImprovements?: Record<string, number>;
}

/**
 * Proposed configuration update
 */
export interface UpdateProposal {
  /** Unique proposal identifier */
  id: string;

  /** Type of update */
  type: UpdateProposalType;

  /** Summary of changes */
  summary: string;

  /** Structured diff */
  diff: ConfigDiff;

  /** Rationale for the change */
  rationale: string;

  /** Supporting data */
  supportingData: ProposalSupportingData;

  /** Approval status */
  status: ProposalStatus;

  /** Request timestamp */
  requestedAt: Date;

  /** Requester identifier */
  requestedBy: string;

  /** Reviewer identifier */
  reviewedBy?: string;

  /** Review timestamp */
  reviewedAt?: Date;

  /** Review notes */
  reviewNotes?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Self-Play Types
// ============================================================================

/**
 * Self-play mode
 */
export type SelfPlayMode = 'adversarial' | 'collaborative' | 'exploratory';

/**
 * Self-play configuration
 */
export interface SelfPlayConfig {
  /** Self-play mode */
  mode: SelfPlayMode;

  /** Number of rounds */
  rounds: number;

  /** Participating agents */
  agents: {
    primary?: string;
    redTeam?: string;
    critic?: string;
    judge?: string;
    [role: string]: string | undefined;
  };

  /** Base scenario to vary */
  baseScenarioId?: string;

  /** Variation strategy */
  variationStrategy?: {
    perturbation: 'input' | 'constraint' | 'difficulty';
    amount: number;
  };

  /** Success criteria */
  successCriteria?: {
    minRounds: number;
    convergenceThreshold: number;
  };
}

/**
 * Result of a self-play round
 */
export interface SelfPlayRound {
  /** Round number */
  round: number;

  /** Scenario used in this round */
  scenarioId: string;

  /** Agent outputs */
  agentOutputs: Record<string, unknown>;

  /** Scores */
  scores: Record<string, number>;

  /** Whether agents converged */
  converged: boolean;

  /** Findings from this round */
  findings: EvalFinding[];
}

/**
 * Self-play execution result
 */
export interface SelfPlayResult {
  /** Unique result identifier */
  id: string;

  /** Configuration used */
  config: SelfPlayConfig;

  /** All rounds */
  rounds: SelfPlayRound[];

  /** Scenarios generated */
  generatedScenarios: string[];

  /** Summary statistics */
  summary: {
    totalRounds: number;
    successRate: number;
    avgScores: Record<string, number>;
    keyFindings: EvalFinding[];
  };

  /** Start timestamp */
  startedAt: Date;

  /** Completion timestamp */
  completedAt: Date;
}

// ============================================================================
// Curriculum Types
// ============================================================================

/**
 * Curriculum strategy
 */
export type CurriculumStrategy = 'coverage' | 'difficulty' | 'error_driven';

/**
 * Curriculum configuration
 */
export interface CurriculumConfig {
  /** Strategy to use */
  strategy: CurriculumStrategy;

  /** Target coverage per scenario type */
  targetCoverage?: Record<ScenarioType, number>;

  /** Difficulty progression */
  difficultyProgression?: DifficultyLevel[];

  /** Error rate threshold for focusing */
  errorThreshold?: number;

  /** Maximum scenarios to generate */
  maxScenarios?: number;
}

/**
 * Curriculum state tracking
 */
export interface CurriculumState {
  /** Current coverage */
  coverage: Record<ScenarioType, number>;

  /** Performance by scenario type */
  performance: Record<ScenarioType, { passRate: number; avgScore: number }>;

  /** Identified gaps */
  gaps: {
    scenarioType: ScenarioType;
    severity: number;
    recommendedScenarios: number;
  }[];

  /** Last updated */
  updatedAt: Date;
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  // Scenario types already exported inline above
};
