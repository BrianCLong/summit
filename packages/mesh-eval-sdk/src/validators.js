"use strict";
/**
 * Runtime validators for evaluation types using Zod
 *
 * @module mesh-eval-sdk/validators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurriculumStateSchema = exports.CurriculumConfigSchema = exports.CurriculumStrategySchema = exports.SelfPlayResultSchema = exports.SelfPlayRoundSchema = exports.SelfPlayConfigSchema = exports.SelfPlayModeSchema = exports.UpdateProposalSchema = exports.ProposalSupportingDataSchema = exports.ConfigDiffSchema = exports.ProposalStatusSchema = exports.UpdateProposalTypeSchema = exports.BaselineComparisonSchema = exports.ImprovementInfoSchema = exports.RegressionInfoSchema = exports.BaselineSnapshotSchema = exports.ScenarioBaselineSchema = exports.BaselineTrackSchema = exports.EvalRunSchema = exports.EvalSummarySchema = exports.ScenarioResultSchema = exports.EvalFindingSchema = exports.FindingLocationSchema = exports.FindingSeveritySchema = exports.FindingTypeSchema = exports.EvalScoreSchema = exports.ScoringMethodSchema = exports.RiskLevelSchema = exports.PassFailStatusSchema = exports.PolicyEventSchema = exports.ScenarioResultStatusSchema = exports.EvalRunStatusSchema = exports.EvalConfigSchema = exports.ModelConfigSchema = exports.AgentConfigSchema = exports.EvalScenarioSchema = exports.EvaluationRubricSchema = exports.ScoringExampleSchema = exports.RubricDimensionSchema = exports.ScoreLevelSchema = exports.ScoringStrategySchema = exports.AssertionSchema = exports.ExpectedOutputSchema = exports.ConstraintSchema = exports.ScenarioInputSchema = exports.DifficultyLevelSchema = exports.ScenarioTypeSchema = void 0;
exports.validateScenario = validateScenario;
exports.validateEvalConfig = validateEvalConfig;
exports.validateEvalRun = validateEvalRun;
exports.validateBaseline = validateBaseline;
exports.validateProposal = validateProposal;
exports.safeValidate = safeValidate;
const zod_1 = require("zod");
// ============================================================================
// Scenario Validators
// ============================================================================
exports.ScenarioTypeSchema = zod_1.z.enum([
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
exports.DifficultyLevelSchema = zod_1.z.enum(['trivial', 'easy', 'medium', 'hard', 'expert']);
exports.ScenarioInputSchema = zod_1.z.object({
    type: zod_1.z.enum(['text', 'code', 'file', 'structured']),
    content: zod_1.z.union([zod_1.z.string(), zod_1.z.record(zod_1.z.unknown())]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.ConstraintSchema = zod_1.z.object({
    type: zod_1.z.enum(['time_limit', 'cost_limit', 'policy_requirement', 'tool_restriction']),
    value: zod_1.z.unknown(),
    strict: zod_1.z.boolean(),
});
exports.ExpectedOutputSchema = zod_1.z.object({
    type: zod_1.z.enum(['exact_match', 'regex', 'semantic_similarity', 'assertion', 'custom']),
    value: zod_1.z.unknown(),
    tolerance: zod_1.z.number().optional(),
    description: zod_1.z.string().optional(),
});
exports.AssertionSchema = zod_1.z.object({
    type: zod_1.z.enum(['contains', 'not_contains', 'regex_match', 'json_valid', 'custom']),
    value: zod_1.z.unknown(),
    path: zod_1.z.string().optional(),
    weight: zod_1.z.number().optional(),
    errorMessage: zod_1.z.string().optional(),
});
exports.ScoringStrategySchema = zod_1.z.object({
    method: zod_1.z.enum(['rule_based', 'llm_judged', 'policy_based', 'hybrid']),
    rules: zod_1.z
        .object({
        assertions: zod_1.z.array(exports.AssertionSchema),
        aggregation: zod_1.z.enum(['all', 'any', 'weighted_average']).optional(),
    })
        .optional(),
    llmJudge: zod_1.z
        .object({
        model: zod_1.z.string(),
        prompt: zod_1.z.string(),
        dimensions: zod_1.z.array(zod_1.z.string()),
        temperature: zod_1.z.number().optional(),
    })
        .optional(),
    policyScoring: zod_1.z
        .object({
        maxViolations: zod_1.z.number(),
        requiredCompliance: zod_1.z.array(zod_1.z.string()),
    })
        .optional(),
    weights: zod_1.z.record(zod_1.z.number()).optional(),
});
exports.ScoreLevelSchema = zod_1.z.object({
    score: zod_1.z.number(),
    label: zod_1.z.string(),
    description: zod_1.z.string(),
});
exports.RubricDimensionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    weight: zod_1.z.number().min(0).max(1),
    description: zod_1.z.string(),
    levels: zod_1.z.array(exports.ScoreLevelSchema).optional(),
});
exports.ScoringExampleSchema = zod_1.z.object({
    input: zod_1.z.string(),
    output: zod_1.z.string(),
    score: zod_1.z.number(),
    dimensionScores: zod_1.z.record(zod_1.z.number()).optional(),
    rationale: zod_1.z.string(),
});
exports.EvaluationRubricSchema = zod_1.z.object({
    dimensions: zod_1.z.array(exports.RubricDimensionSchema),
    guidance: zod_1.z.string().optional(),
    examples: zod_1.z.array(exports.ScoringExampleSchema).optional(),
});
exports.EvalScenarioSchema = zod_1.z.object({
    id: zod_1.z.string(),
    version: zod_1.z.string(),
    type: exports.ScenarioTypeSchema,
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    inputs: zod_1.z.array(exports.ScenarioInputSchema),
    constraints: zod_1.z.array(exports.ConstraintSchema),
    expectedOutputs: zod_1.z.array(exports.ExpectedOutputSchema).optional(),
    scoringStrategy: exports.ScoringStrategySchema,
    rubric: exports.EvaluationRubricSchema.optional(),
    difficulty: exports.DifficultyLevelSchema,
    estimatedCost: zod_1.z.number().nonnegative(),
    estimatedDuration: zod_1.z.number().nonnegative(),
    createdAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    updatedAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============================================================================
// Configuration Validators
// ============================================================================
exports.AgentConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    model: zod_1.z.string().optional(),
    parameters: zod_1.z.record(zod_1.z.unknown()).optional(),
    tools: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ModelConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    provider: zod_1.z.enum(['anthropic', 'openai', 'google', 'custom']),
    name: zod_1.z.string(),
    parameters: zod_1.z
        .object({
        temperature: zod_1.z.number().optional(),
        maxTokens: zod_1.z.number().optional(),
        topP: zod_1.z.number().optional(),
    })
        .passthrough()
        .optional(),
});
exports.EvalConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    scenarios: zod_1.z.array(zod_1.z.string()),
    agents: zod_1.z.array(exports.AgentConfigSchema),
    models: zod_1.z.array(exports.ModelConfigSchema),
    routingPolicy: zod_1.z.string().optional(),
    tools: zod_1.z.array(zod_1.z.string()).optional(),
    iterations: zod_1.z.number().positive().optional(),
    parallelism: zod_1.z.number().positive().optional(),
    timeout: zod_1.z.number().positive().optional(),
    outputPath: zod_1.z.string().optional(),
    reportFormat: zod_1.z.enum(['json', 'markdown', 'html', 'all']).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============================================================================
// Execution & Results Validators
// ============================================================================
exports.EvalRunStatusSchema = zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
exports.ScenarioResultStatusSchema = zod_1.z.enum(['pass', 'fail', 'skip', 'error']);
exports.PolicyEventSchema = zod_1.z.object({
    timestamp: zod_1.z.date(),
    policyId: zod_1.z.string(),
    action: zod_1.z.enum(['allow', 'deny', 'redact', 'escalate', 'log']),
    reason: zod_1.z.string(),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    context: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.PassFailStatusSchema = zod_1.z.enum(['pass', 'fail', 'partial', 'uncertain']);
exports.RiskLevelSchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.ScoringMethodSchema = zod_1.z.enum(['rule_based', 'llm_judged', 'policy_based', 'hybrid']);
exports.EvalScoreSchema = zod_1.z.object({
    overall: zod_1.z.number().min(0).max(1),
    dimensions: zod_1.z.record(zod_1.z.number().min(0).max(1).optional()),
    passFailStatus: exports.PassFailStatusSchema,
    riskLevel: exports.RiskLevelSchema.optional(),
    rationale: zod_1.z.string(),
    strengths: zod_1.z.array(zod_1.z.string()),
    weaknesses: zod_1.z.array(zod_1.z.string()),
    scoringMethod: exports.ScoringMethodSchema,
    judgeModel: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
exports.FindingTypeSchema = zod_1.z.enum([
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
exports.FindingSeveritySchema = zod_1.z.enum(['info', 'warning', 'error', 'critical']);
exports.FindingLocationSchema = zod_1.z.object({
    agent: zod_1.z.string().optional(),
    step: zod_1.z.number().optional(),
    toolCall: zod_1.z.string().optional(),
    line: zod_1.z.number().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.EvalFindingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    scenarioId: zod_1.z.string(),
    runId: zod_1.z.string(),
    type: exports.FindingTypeSchema,
    severity: exports.FindingSeveritySchema,
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    location: exports.FindingLocationSchema.optional(),
    recommendation: zod_1.z.string().optional(),
    relatedFindings: zod_1.z.array(zod_1.z.string()).optional(),
    createdAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.ScenarioResultSchema = zod_1.z.object({
    scenarioId: zod_1.z.string(),
    status: exports.ScenarioResultStatusSchema,
    score: exports.EvalScoreSchema,
    findings: zod_1.z.array(exports.EvalFindingSchema),
    executionTime: zod_1.z.number().nonnegative(),
    cost: zod_1.z.number().nonnegative(),
    agentOutputs: zod_1.z.array(zod_1.z.unknown()),
    policyEvents: zod_1.z.array(exports.PolicyEventSchema),
    provenanceTrace: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.EvalSummarySchema = zod_1.z.object({
    totalScenarios: zod_1.z.number().nonnegative(),
    passed: zod_1.z.number().nonnegative(),
    failed: zod_1.z.number().nonnegative(),
    skipped: zod_1.z.number().nonnegative(),
    errors: zod_1.z.number().nonnegative(),
    passRate: zod_1.z.number().min(0).max(1),
    avgScore: zod_1.z.number().min(0).max(1),
    totalExecutionTime: zod_1.z.number().nonnegative(),
    totalCost: zod_1.z.number().nonnegative(),
    safetyViolations: zod_1.z.number().nonnegative(),
    policyDenials: zod_1.z.number().nonnegative(),
    dimensionAverages: zod_1.z.record(zod_1.z.number()),
});
exports.EvalRunSchema = zod_1.z.object({
    id: zod_1.z.string(),
    configId: zod_1.z.string(),
    startedAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional(),
    status: exports.EvalRunStatusSchema,
    scenarios: zod_1.z.array(exports.ScenarioResultSchema),
    summary: exports.EvalSummarySchema,
    gitCommit: zod_1.z.string().optional(),
    branch: zod_1.z.string().optional(),
    environment: zod_1.z.string(),
    triggeredBy: zod_1.z.string(),
    artifactUrls: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============================================================================
// Baseline Validators
// ============================================================================
exports.BaselineTrackSchema = zod_1.z.enum(['release', 'branch', 'experimental']);
exports.ScenarioBaselineSchema = zod_1.z.object({
    scenarioId: zod_1.z.string(),
    passRate: zod_1.z.number().min(0).max(1),
    avgScore: zod_1.z.number().min(0).max(1),
    p95Latency: zod_1.z.number().nonnegative(),
    avgCost: zod_1.z.number().nonnegative(),
    dimensionBaselines: zod_1.z.record(zod_1.z.number()).optional(),
});
exports.BaselineSnapshotSchema = zod_1.z.object({
    id: zod_1.z.string(),
    version: zod_1.z.string(),
    track: exports.BaselineTrackSchema,
    metrics: zod_1.z.record(zod_1.z.number()),
    scenarioBaselines: zod_1.z.map(zod_1.z.string(), exports.ScenarioBaselineSchema),
    gitCommit: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    notes: zod_1.z.string().optional(),
});
exports.RegressionInfoSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    metric: zod_1.z.string(),
    baseline: zod_1.z.number(),
    current: zod_1.z.number(),
    delta: zod_1.z.number().negative(),
    severity: exports.FindingSeveritySchema,
});
exports.ImprovementInfoSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    metric: zod_1.z.string(),
    baseline: zod_1.z.number(),
    current: zod_1.z.number(),
    delta: zod_1.z.number().positive(),
});
exports.BaselineComparisonSchema = zod_1.z.object({
    current: zod_1.z.string(),
    reference: zod_1.z.string(),
    overallDelta: zod_1.z.number(),
    dimensionDeltas: zod_1.z.record(zod_1.z.number()),
    regressions: zod_1.z.array(exports.RegressionInfoSchema),
    improvements: zod_1.z.array(exports.ImprovementInfoSchema),
});
// ============================================================================
// Update Proposal Validators
// ============================================================================
exports.UpdateProposalTypeSchema = zod_1.z.enum(['routing', 'policy', 'agent_config']);
exports.ProposalStatusSchema = zod_1.z.enum(['pending', 'approved', 'rejected', 'implemented']);
exports.ConfigDiffSchema = zod_1.z.object({
    changed: zod_1.z.record(zod_1.z.object({ old: zod_1.z.unknown(), new: zod_1.z.unknown() })),
    added: zod_1.z.record(zod_1.z.unknown()).optional(),
    removed: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.ProposalSupportingDataSchema = zod_1.z.object({
    evalRunIds: zod_1.z.array(zod_1.z.string()),
    metrics: zod_1.z.record(zod_1.z.number()),
    regressionTests: zod_1.z.array(zod_1.z.string()),
    expectedImprovements: zod_1.z.record(zod_1.z.number()).optional(),
});
exports.UpdateProposalSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.UpdateProposalTypeSchema,
    summary: zod_1.z.string(),
    diff: exports.ConfigDiffSchema,
    rationale: zod_1.z.string(),
    supportingData: exports.ProposalSupportingDataSchema,
    status: exports.ProposalStatusSchema,
    requestedAt: zod_1.z.date(),
    requestedBy: zod_1.z.string(),
    reviewedBy: zod_1.z.string().optional(),
    reviewedAt: zod_1.z.date().optional(),
    reviewNotes: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============================================================================
// Self-Play Validators
// ============================================================================
exports.SelfPlayModeSchema = zod_1.z.enum(['adversarial', 'collaborative', 'exploratory']);
exports.SelfPlayConfigSchema = zod_1.z.object({
    mode: exports.SelfPlayModeSchema,
    rounds: zod_1.z.number().positive(),
    agents: zod_1.z.record(zod_1.z.string().optional()),
    baseScenarioId: zod_1.z.string().optional(),
    variationStrategy: zod_1.z
        .object({
        perturbation: zod_1.z.enum(['input', 'constraint', 'difficulty']),
        amount: zod_1.z.number(),
    })
        .optional(),
    successCriteria: zod_1.z
        .object({
        minRounds: zod_1.z.number().positive(),
        convergenceThreshold: zod_1.z.number(),
    })
        .optional(),
});
exports.SelfPlayRoundSchema = zod_1.z.object({
    round: zod_1.z.number().positive(),
    scenarioId: zod_1.z.string(),
    agentOutputs: zod_1.z.record(zod_1.z.unknown()),
    scores: zod_1.z.record(zod_1.z.number()),
    converged: zod_1.z.boolean(),
    findings: zod_1.z.array(exports.EvalFindingSchema),
});
exports.SelfPlayResultSchema = zod_1.z.object({
    id: zod_1.z.string(),
    config: exports.SelfPlayConfigSchema,
    rounds: zod_1.z.array(exports.SelfPlayRoundSchema),
    generatedScenarios: zod_1.z.array(zod_1.z.string()),
    summary: zod_1.z.object({
        totalRounds: zod_1.z.number().nonnegative(),
        successRate: zod_1.z.number().min(0).max(1),
        avgScores: zod_1.z.record(zod_1.z.number()),
        keyFindings: zod_1.z.array(exports.EvalFindingSchema),
    }),
    startedAt: zod_1.z.date(),
    completedAt: zod_1.z.date(),
});
// ============================================================================
// Curriculum Validators
// ============================================================================
exports.CurriculumStrategySchema = zod_1.z.enum(['coverage', 'difficulty', 'error_driven']);
exports.CurriculumConfigSchema = zod_1.z.object({
    strategy: exports.CurriculumStrategySchema,
    targetCoverage: zod_1.z.record(exports.ScenarioTypeSchema, zod_1.z.number()).optional(),
    difficultyProgression: zod_1.z.array(exports.DifficultyLevelSchema).optional(),
    errorThreshold: zod_1.z.number().optional(),
    maxScenarios: zod_1.z.number().positive().optional(),
});
exports.CurriculumStateSchema = zod_1.z.object({
    coverage: zod_1.z.record(exports.ScenarioTypeSchema, zod_1.z.number()),
    performance: zod_1.z.record(exports.ScenarioTypeSchema, zod_1.z.object({
        passRate: zod_1.z.number().min(0).max(1),
        avgScore: zod_1.z.number().min(0).max(1),
    })),
    gaps: zod_1.z.array(zod_1.z.object({
        scenarioType: exports.ScenarioTypeSchema,
        severity: zod_1.z.number(),
        recommendedScenarios: zod_1.z.number().nonnegative(),
    })),
    updatedAt: zod_1.z.date(),
});
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Validate and parse an evaluation scenario
 */
function validateScenario(data) {
    return exports.EvalScenarioSchema.parse(data);
}
/**
 * Validate and parse an evaluation configuration
 */
function validateEvalConfig(data) {
    return exports.EvalConfigSchema.parse(data);
}
/**
 * Validate and parse an evaluation run
 */
function validateEvalRun(data) {
    return exports.EvalRunSchema.parse(data);
}
/**
 * Validate and parse a baseline snapshot
 */
function validateBaseline(data) {
    return exports.BaselineSnapshotSchema.parse(data);
}
/**
 * Validate and parse an update proposal
 */
function validateProposal(data) {
    return exports.UpdateProposalSchema.parse(data);
}
/**
 * Safe validation that returns result object
 */
function safeValidate(schema, data) {
    return schema.safeParse(data);
}
