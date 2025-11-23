/**
 * Runtime validators for evaluation types using Zod
 *
 * @module mesh-eval-sdk/validators
 */

import { z } from 'zod';

// ============================================================================
// Scenario Validators
// ============================================================================

export const ScenarioTypeSchema = z.enum([
  'code_transformation',
  'incident_investigation',
  'research_synthesis',
  'policy_sensitive',
  'export_controlled',
  'adversarial_prompting',
  'multi_step_reasoning',
  'tool_usage',
  'custom',
]);

export const DifficultyLevelSchema = z.enum(['trivial', 'easy', 'medium', 'hard', 'expert']);

export const ScenarioInputSchema = z.object({
  type: z.enum(['text', 'code', 'file', 'structured']),
  content: z.union([z.string(), z.record(z.unknown())]),
  metadata: z.record(z.unknown()).optional(),
});

export const ConstraintSchema = z.object({
  type: z.enum(['time_limit', 'cost_limit', 'policy_requirement', 'tool_restriction']),
  value: z.unknown(),
  strict: z.boolean(),
});

export const ExpectedOutputSchema = z.object({
  type: z.enum(['exact_match', 'regex', 'semantic_similarity', 'assertion', 'custom']),
  value: z.unknown(),
  tolerance: z.number().optional(),
  description: z.string().optional(),
});

export const AssertionSchema = z.object({
  type: z.enum(['contains', 'not_contains', 'regex_match', 'json_valid', 'custom']),
  value: z.unknown(),
  path: z.string().optional(),
  weight: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const ScoringStrategySchema = z.object({
  method: z.enum(['rule_based', 'llm_judged', 'policy_based', 'hybrid']),
  rules: z
    .object({
      assertions: z.array(AssertionSchema),
      aggregation: z.enum(['all', 'any', 'weighted_average']).optional(),
    })
    .optional(),
  llmJudge: z
    .object({
      model: z.string(),
      prompt: z.string(),
      dimensions: z.array(z.string()),
      temperature: z.number().optional(),
    })
    .optional(),
  policyScoring: z
    .object({
      maxViolations: z.number(),
      requiredCompliance: z.array(z.string()),
    })
    .optional(),
  weights: z.record(z.number()).optional(),
});

export const ScoreLevelSchema = z.object({
  score: z.number(),
  label: z.string(),
  description: z.string(),
});

export const RubricDimensionSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
  description: z.string(),
  levels: z.array(ScoreLevelSchema).optional(),
});

export const ScoringExampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  score: z.number(),
  dimensionScores: z.record(z.number()).optional(),
  rationale: z.string(),
});

export const EvaluationRubricSchema = z.object({
  dimensions: z.array(RubricDimensionSchema),
  guidance: z.string().optional(),
  examples: z.array(ScoringExampleSchema).optional(),
});

export const EvalScenarioSchema = z.object({
  id: z.string(),
  version: z.string(),
  type: ScenarioTypeSchema,
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  inputs: z.array(ScenarioInputSchema),
  constraints: z.array(ConstraintSchema),
  expectedOutputs: z.array(ExpectedOutputSchema).optional(),
  scoringStrategy: ScoringStrategySchema,
  rubric: EvaluationRubricSchema.optional(),
  difficulty: DifficultyLevelSchema,
  estimatedCost: z.number().nonnegative(),
  estimatedDuration: z.number().nonnegative(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Configuration Validators
// ============================================================================

export const AgentConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  model: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
  tools: z.array(z.string()).optional(),
});

export const ModelConfigSchema = z.object({
  id: z.string(),
  provider: z.enum(['anthropic', 'openai', 'google', 'custom']),
  name: z.string(),
  parameters: z
    .object({
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      topP: z.number().optional(),
    })
    .passthrough()
    .optional(),
});

export const EvalConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  scenarios: z.array(z.string()),
  agents: z.array(AgentConfigSchema),
  models: z.array(ModelConfigSchema),
  routingPolicy: z.string().optional(),
  tools: z.array(z.string()).optional(),
  iterations: z.number().positive().optional(),
  parallelism: z.number().positive().optional(),
  timeout: z.number().positive().optional(),
  outputPath: z.string().optional(),
  reportFormat: z.enum(['json', 'markdown', 'html', 'all']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Execution & Results Validators
// ============================================================================

export const EvalRunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);

export const ScenarioResultStatusSchema = z.enum(['pass', 'fail', 'skip', 'error']);

export const PolicyEventSchema = z.object({
  timestamp: z.date(),
  policyId: z.string(),
  action: z.enum(['allow', 'deny', 'redact', 'escalate', 'log']),
  reason: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  context: z.record(z.unknown()).optional(),
});

export const PassFailStatusSchema = z.enum(['pass', 'fail', 'partial', 'uncertain']);

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const ScoringMethodSchema = z.enum(['rule_based', 'llm_judged', 'policy_based', 'hybrid']);

export const EvalScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  dimensions: z.record(z.number().min(0).max(1).optional()),
  passFailStatus: PassFailStatusSchema,
  riskLevel: RiskLevelSchema.optional(),
  rationale: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  scoringMethod: ScoringMethodSchema,
  judgeModel: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const FindingTypeSchema = z.enum([
  'correctness_issue',
  'safety_violation',
  'policy_breach',
  'performance_regression',
  'cost_anomaly',
  'tool_misuse',
  'reasoning_error',
  'hallucination',
  'prompt_injection',
  'data_leakage',
]);

export const FindingSeveritySchema = z.enum(['info', 'warning', 'error', 'critical']);

export const FindingLocationSchema = z.object({
  agent: z.string().optional(),
  step: z.number().optional(),
  toolCall: z.string().optional(),
  line: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const EvalFindingSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  runId: z.string(),
  type: FindingTypeSchema,
  severity: FindingSeveritySchema,
  title: z.string(),
  description: z.string(),
  location: FindingLocationSchema.optional(),
  recommendation: z.string().optional(),
  relatedFindings: z.array(z.string()).optional(),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export const ScenarioResultSchema = z.object({
  scenarioId: z.string(),
  status: ScenarioResultStatusSchema,
  score: EvalScoreSchema,
  findings: z.array(EvalFindingSchema),
  executionTime: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  agentOutputs: z.array(z.unknown()),
  policyEvents: z.array(PolicyEventSchema),
  provenanceTrace: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const EvalSummarySchema = z.object({
  totalScenarios: z.number().nonnegative(),
  passed: z.number().nonnegative(),
  failed: z.number().nonnegative(),
  skipped: z.number().nonnegative(),
  errors: z.number().nonnegative(),
  passRate: z.number().min(0).max(1),
  avgScore: z.number().min(0).max(1),
  totalExecutionTime: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  safetyViolations: z.number().nonnegative(),
  policyDenials: z.number().nonnegative(),
  dimensionAverages: z.record(z.number()),
});

export const EvalRunSchema = z.object({
  id: z.string(),
  configId: z.string(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  status: EvalRunStatusSchema,
  scenarios: z.array(ScenarioResultSchema),
  summary: EvalSummarySchema,
  gitCommit: z.string().optional(),
  branch: z.string().optional(),
  environment: z.string(),
  triggeredBy: z.string(),
  artifactUrls: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Baseline Validators
// ============================================================================

export const BaselineTrackSchema = z.enum(['release', 'branch', 'experimental']);

export const ScenarioBaselineSchema = z.object({
  scenarioId: z.string(),
  passRate: z.number().min(0).max(1),
  avgScore: z.number().min(0).max(1),
  p95Latency: z.number().nonnegative(),
  avgCost: z.number().nonnegative(),
  dimensionBaselines: z.record(z.number()).optional(),
});

export const BaselineSnapshotSchema = z.object({
  id: z.string(),
  version: z.string(),
  track: BaselineTrackSchema,
  metrics: z.record(z.number()),
  scenarioBaselines: z.map(z.string(), ScenarioBaselineSchema),
  gitCommit: z.string(),
  createdAt: z.date(),
  createdBy: z.string(),
  notes: z.string().optional(),
});

export const RegressionInfoSchema = z.object({
  subject: z.string(),
  metric: z.string(),
  baseline: z.number(),
  current: z.number(),
  delta: z.number().negative(),
  severity: FindingSeveritySchema,
});

export const ImprovementInfoSchema = z.object({
  subject: z.string(),
  metric: z.string(),
  baseline: z.number(),
  current: z.number(),
  delta: z.number().positive(),
});

export const BaselineComparisonSchema = z.object({
  current: z.string(),
  reference: z.string(),
  overallDelta: z.number(),
  dimensionDeltas: z.record(z.number()),
  regressions: z.array(RegressionInfoSchema),
  improvements: z.array(ImprovementInfoSchema),
});

// ============================================================================
// Update Proposal Validators
// ============================================================================

export const UpdateProposalTypeSchema = z.enum(['routing', 'policy', 'agent_config']);

export const ProposalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'implemented']);

export const ConfigDiffSchema = z.object({
  changed: z.record(z.object({ old: z.unknown(), new: z.unknown() })),
  added: z.record(z.unknown()).optional(),
  removed: z.record(z.unknown()).optional(),
});

export const ProposalSupportingDataSchema = z.object({
  evalRunIds: z.array(z.string()),
  metrics: z.record(z.number()),
  regressionTests: z.array(z.string()),
  expectedImprovements: z.record(z.number()).optional(),
});

export const UpdateProposalSchema = z.object({
  id: z.string(),
  type: UpdateProposalTypeSchema,
  summary: z.string(),
  diff: ConfigDiffSchema,
  rationale: z.string(),
  supportingData: ProposalSupportingDataSchema,
  status: ProposalStatusSchema,
  requestedAt: z.date(),
  requestedBy: z.string(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.date().optional(),
  reviewNotes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Self-Play Validators
// ============================================================================

export const SelfPlayModeSchema = z.enum(['adversarial', 'collaborative', 'exploratory']);

export const SelfPlayConfigSchema = z.object({
  mode: SelfPlayModeSchema,
  rounds: z.number().positive(),
  agents: z.record(z.string().optional()),
  baseScenarioId: z.string().optional(),
  variationStrategy: z
    .object({
      perturbation: z.enum(['input', 'constraint', 'difficulty']),
      amount: z.number(),
    })
    .optional(),
  successCriteria: z
    .object({
      minRounds: z.number().positive(),
      convergenceThreshold: z.number(),
    })
    .optional(),
});

export const SelfPlayRoundSchema = z.object({
  round: z.number().positive(),
  scenarioId: z.string(),
  agentOutputs: z.record(z.unknown()),
  scores: z.record(z.number()),
  converged: z.boolean(),
  findings: z.array(EvalFindingSchema),
});

export const SelfPlayResultSchema = z.object({
  id: z.string(),
  config: SelfPlayConfigSchema,
  rounds: z.array(SelfPlayRoundSchema),
  generatedScenarios: z.array(z.string()),
  summary: z.object({
    totalRounds: z.number().nonnegative(),
    successRate: z.number().min(0).max(1),
    avgScores: z.record(z.number()),
    keyFindings: z.array(EvalFindingSchema),
  }),
  startedAt: z.date(),
  completedAt: z.date(),
});

// ============================================================================
// Curriculum Validators
// ============================================================================

export const CurriculumStrategySchema = z.enum(['coverage', 'difficulty', 'error_driven']);

export const CurriculumConfigSchema = z.object({
  strategy: CurriculumStrategySchema,
  targetCoverage: z.record(ScenarioTypeSchema, z.number()).optional(),
  difficultyProgression: z.array(DifficultyLevelSchema).optional(),
  errorThreshold: z.number().optional(),
  maxScenarios: z.number().positive().optional(),
});

export const CurriculumStateSchema = z.object({
  coverage: z.record(ScenarioTypeSchema, z.number()),
  performance: z.record(
    ScenarioTypeSchema,
    z.object({
      passRate: z.number().min(0).max(1),
      avgScore: z.number().min(0).max(1),
    }),
  ),
  gaps: z.array(
    z.object({
      scenarioType: ScenarioTypeSchema,
      severity: z.number(),
      recommendedScenarios: z.number().nonnegative(),
    }),
  ),
  updatedAt: z.date(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate and parse an evaluation scenario
 */
export function validateScenario(data: unknown) {
  return EvalScenarioSchema.parse(data);
}

/**
 * Validate and parse an evaluation configuration
 */
export function validateEvalConfig(data: unknown) {
  return EvalConfigSchema.parse(data);
}

/**
 * Validate and parse an evaluation run
 */
export function validateEvalRun(data: unknown) {
  return EvalRunSchema.parse(data);
}

/**
 * Validate and parse a baseline snapshot
 */
export function validateBaseline(data: unknown) {
  return BaselineSnapshotSchema.parse(data);
}

/**
 * Validate and parse an update proposal
 */
export function validateProposal(data: unknown) {
  return UpdateProposalSchema.parse(data);
}

/**
 * Safe validation that returns result object
 */
export function safeValidate<T>(schema: z.ZodType<T>, data: unknown) {
  return schema.safeParse(data);
}
