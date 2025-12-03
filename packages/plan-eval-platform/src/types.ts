import { z } from 'zod';

// ============================================================================
// TRACE SCHEMA - Canonical format for eval traces
// ============================================================================

export const TraceEventTypeSchema = z.enum([
  'request_start',
  'request_end',
  'tool_call_start',
  'tool_call_end',
  'routing_decision',
  'safety_check',
  'error',
  'metric',
]);

export type TraceEventType = z.infer<typeof TraceEventTypeSchema>;

export const TraceEventSchema = z.object({
  id: z.string(),
  traceId: z.string(),
  parentId: z.string().optional(),
  timestamp: z.string().datetime(),
  type: TraceEventTypeSchema,
  name: z.string(),
  attributes: z.record(z.unknown()).optional(),
  metrics: z
    .object({
      durationMs: z.number().optional(),
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
      costUsd: z.number().optional(),
      latencyMs: z.number().optional(),
    })
    .optional(),
  status: z.enum(['success', 'failure', 'pending']).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
});

export type TraceEvent = z.infer<typeof TraceEventSchema>;

export const TraceSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  runId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  events: z.array(TraceEventSchema),
  summary: z
    .object({
      success: z.boolean(),
      totalDurationMs: z.number(),
      totalTokens: z.number(),
      totalCostUsd: z.number(),
      toolCallCount: z.number(),
      errorCount: z.number(),
      safetyViolations: z.number(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Trace = z.infer<typeof TraceSchema>;

// ============================================================================
// SCENARIO SCHEMA - YAML-based scenario definitions
// ============================================================================

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  costPerCall: z.number().optional(),
  avgLatencyMs: z.number().optional(),
  capabilities: z.array(z.string()).optional(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ScenarioStepSchema = z.object({
  id: z.string(),
  type: z.enum(['prompt', 'tool_call', 'assertion', 'wait']),
  input: z.unknown().optional(),
  expectedOutput: z.unknown().optional(),
  timeout: z.number().optional(),
  allowedTools: z.array(z.string()).optional(),
  constraints: z
    .object({
      maxTokens: z.number().optional(),
      maxCostUsd: z.number().optional(),
      maxLatencyMs: z.number().optional(),
    })
    .optional(),
});

export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

export const SuccessCriteriaSchema = z.object({
  type: z.enum([
    'exact_match',
    'contains',
    'regex',
    'semantic_similarity',
    'custom',
  ]),
  value: z.unknown(),
  threshold: z.number().optional(),
});

export type SuccessCriteria = z.infer<typeof SuccessCriteriaSchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.enum([
    'code_correction',
    'code_explanation',
    'data_analysis',
    'multi_tool_pipeline',
    'agentic_flow',
    'reasoning',
    'safety',
    'other',
  ]),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  tags: z.array(z.string()).optional(),
  tools: z.array(ToolDefinitionSchema),
  steps: z.array(ScenarioStepSchema),
  successCriteria: z.array(SuccessCriteriaSchema),
  constraints: z
    .object({
      maxTotalTokens: z.number().optional(),
      maxTotalCostUsd: z.number().optional(),
      maxTotalLatencyMs: z.number().optional(),
      maxToolCalls: z.number().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

// ============================================================================
// METRICS - Evaluation metrics
// ============================================================================

export interface EvalMetrics {
  // Task metrics
  taskSuccessRate: number;
  taskCompletionTime: number;

  // Cost metrics
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  costPerSuccessfulTask: number;

  // Latency metrics
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  avgLatencyMs: number;

  // Tool usage metrics
  toolCallCount: number;
  toolSuccessRate: number;
  avgToolLatencyMs: number;

  // Safety metrics
  safetyViolationCount: number;
  safetyViolationRate: number;
  jailbreakAttempts: number;
  jailbreakSuccesses: number;

  // Router metrics
  routingDecisionCount: number;
  routingAccuracy: number;
  costSavingsVsBaseline: number;
}

export interface ScenarioResult {
  scenarioId: string;
  runId: string;
  success: boolean;
  metrics: EvalMetrics;
  trace: Trace;
  errors: Array<{
    step: string;
    error: string;
    recoverable: boolean;
  }>;
  assertions: Array<{
    criteria: SuccessCriteria;
    passed: boolean;
    actual: unknown;
  }>;
}

export interface BenchmarkReport {
  id: string;
  name: string;
  timestamp: string;
  config: {
    routerType: string;
    costWeight: number;
    scenarioCount: number;
  };
  aggregateMetrics: EvalMetrics;
  scenarioResults: ScenarioResult[];
  comparisons?: Array<{
    baselineId: string;
    deltaMetrics: Partial<EvalMetrics>;
    improvements: string[];
    regressions: string[];
  }>;
}

// ============================================================================
// ROUTING - Cost-aware router types
// ============================================================================

export type RouterType = 'random' | 'greedy_cost' | 'quality_first' | 'adaptive';

export interface RoutingConfig {
  type: RouterType;
  costWeight: number; // 0-1: 0 = quality only, 1 = cost only
  latencyBudgetMs: number;
  fallbackEnabled: boolean;
  learningRate?: number;
}

export interface ToolCandidate {
  toolId: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
  estimatedQuality: number;
  capabilities: string[];
}

export interface RoutingDecision {
  selectedTool: string;
  score: number;
  reasoning: string[];
  alternatives: Array<{
    toolId: string;
    score: number;
    reason: string;
  }>;
  constraints: {
    withinCostBudget: boolean;
    withinLatencyBudget: boolean;
    meetsQualityThreshold: boolean;
  };
}

// ============================================================================
// SAFETY - Red-team and safety check types
// ============================================================================

export type SafetyCheckType =
  | 'jailbreak_detection'
  | 'pii_detection'
  | 'harmful_content'
  | 'injection_attack'
  | 'data_exfiltration';

export interface SafetyCheckResult {
  type: SafetyCheckType;
  passed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  confidence: number;
  flaggedContent?: string;
}

export interface SafetyConfig {
  enabledChecks: SafetyCheckType[];
  blockOnViolation: boolean;
  logViolations: boolean;
  customPatterns?: Array<{
    name: string;
    pattern: string;
    severity: SafetyCheckResult['severity'];
  }>;
}

// ============================================================================
// COST MODEL - Token and API cost modeling
// ============================================================================

export interface CostModelConfig {
  inputTokenCostPer1k: number;
  outputTokenCostPer1k: number;
  toolCallBaseCost: number;
  toolCosts: Record<string, number>;
  latencyPenaltyPerMs: number;
}

export interface CostEstimate {
  inputTokenCost: number;
  outputTokenCost: number;
  toolCallCost: number;
  latencyPenalty: number;
  totalCost: number;
}

// ============================================================================
// TELEMETRY - Observability and export types
// ============================================================================

export interface TelemetryConfig {
  outputPath: string;
  format: 'jsonl' | 'json' | 'parquet';
  flushIntervalMs: number;
  enableMetrics: boolean;
  enableTracing: boolean;
  prometheusPort?: number;
  otlpEndpoint?: string;
}

export interface TelemetryExport {
  traces: Trace[];
  metrics: EvalMetrics;
  timestamp: string;
  metadata: Record<string, unknown>;
}
