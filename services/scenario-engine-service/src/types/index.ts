/**
 * Scenario Engine Types
 * Core types for what-if analysis and counterfactual modeling
 */

import { z } from 'zod';

// ============================================================================
// Core Enums
// ============================================================================

export const ScenarioStatus = z.enum([
  'draft',
  'active',
  'computing',
  'completed',
  'archived',
  'failed',
]);
export type ScenarioStatus = z.infer<typeof ScenarioStatus>;

export const DeltaOperationType = z.enum([
  'add_node',
  'remove_node',
  'update_node',
  'add_edge',
  'remove_edge',
  'update_edge',
  'adjust_timing',
  'enable_rule',
  'disable_rule',
  'set_parameter',
]);
export type DeltaOperationType = z.infer<typeof DeltaOperationType>;

export const MetricType = z.enum([
  'detection_time',
  'path_length',
  'centrality',
  'risk_score',
  'resource_load',
  'coverage',
  'connectivity',
  'clustering',
  'custom',
]);
export type MetricType = z.infer<typeof MetricType>;

export const ScenarioMode = z.enum([
  'sandbox',
  'simulation',
  'counterfactual',
  'forecast',
]);
export type ScenarioMode = z.infer<typeof ScenarioMode>;

// ============================================================================
// Policy & Governance (Non-Production Labels)
// ============================================================================

export const ScenarioPolicyLabels = z.object({
  environment: z.literal('non-production').default('non-production'),
  tenantId: z.string().min(1),
  caseId: z.string().optional(),
  classification: z.enum(['sandbox', 'test', 'analysis', 'training']).default('sandbox'),
  retentionDays: z.number().int().positive().default(30),
  createdBy: z.string().min(1),
  accessControl: z.array(z.string()).default([]),
});
export type ScenarioPolicyLabels = z.infer<typeof ScenarioPolicyLabels>;

// ============================================================================
// Node & Edge Types (Scenario-Specific)
// ============================================================================

export const ScenarioNodeSchema = z.object({
  id: z.string(),
  labels: z.array(z.string()).default([]),
  properties: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number().default(1),
  deleted: z.boolean().default(false),
  // Scenario-specific fields
  isOriginal: z.boolean().default(true),
  sourceNodeId: z.string().optional(),
  modifiedInScenario: z.boolean().default(false),
});
export type ScenarioNode = z.infer<typeof ScenarioNodeSchema>;

export const ScenarioEdgeSchema = z.object({
  id: z.string(),
  type: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  properties: z.record(z.string(), z.unknown()).default({}),
  weight: z.number().default(1.0),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number().default(1),
  deleted: z.boolean().default(false),
  validFrom: z.number().optional(),
  validTo: z.number().optional(),
  // Scenario-specific fields
  isOriginal: z.boolean().default(true),
  sourceEdgeId: z.string().optional(),
  modifiedInScenario: z.boolean().default(false),
});
export type ScenarioEdge = z.infer<typeof ScenarioEdgeSchema>;

// ============================================================================
// Delta Operations
// ============================================================================

export const DeltaOperationSchema = z.object({
  id: z.string(),
  type: DeltaOperationType,
  targetId: z.string(),
  targetType: z.enum(['node', 'edge', 'rule', 'parameter']),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  timestamp: z.number(),
  description: z.string().optional(),
  reversible: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type DeltaOperation = z.infer<typeof DeltaOperationSchema>;

export const DeltaSetSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  operations: z.array(DeltaOperationSchema),
  createdAt: z.number(),
  description: z.string().optional(),
  applied: z.boolean().default(false),
  appliedAt: z.number().optional(),
  rollbackAvailable: z.boolean().default(true),
});
export type DeltaSet = z.infer<typeof DeltaSetSchema>;

// ============================================================================
// Scenario Parameters
// ============================================================================

export const TimeWindowSchema = z.object({
  start: z.number(),
  end: z.number(),
  resolution: z.enum(['minute', 'hour', 'day', 'week', 'month']).default('hour'),
});
export type TimeWindow = z.infer<typeof TimeWindowSchema>;

export const ScenarioParamsSchema = z.object({
  // Source data references
  sourceCaseId: z.string().optional(),
  sourceGraphId: z.string().optional(),
  sourceNodeIds: z.array(z.string()).optional(),

  // Graph selection
  includeNeighbors: z.boolean().default(true),
  neighborDepth: z.number().int().min(0).max(5).default(2),
  nodeLabels: z.array(z.string()).optional(),
  edgeTypes: z.array(z.string()).optional(),

  // Temporal parameters
  timeWindow: TimeWindowSchema.optional(),
  eventDelayMs: z.number().int().min(0).optional(),

  // Analysis parameters
  detectionRules: z.array(z.string()).default([]),
  enabledRules: z.array(z.string()).default([]),
  disabledRules: z.array(z.string()).default([]),

  // Resource constraints
  resourceBudget: z.number().positive().optional(),
  maxNodes: z.number().int().positive().default(10000),
  maxEdges: z.number().int().positive().default(50000),

  // Custom parameters
  customParams: z.record(z.string(), z.unknown()).default({}),
});
export type ScenarioParams = z.infer<typeof ScenarioParamsSchema>;

// ============================================================================
// Outcome Metrics
// ============================================================================

export const MetricValueSchema = z.object({
  name: z.string(),
  type: MetricType,
  value: z.number(),
  unit: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type MetricValue = z.infer<typeof MetricValueSchema>;

export const MetricDeltaSchema = z.object({
  metricName: z.string(),
  baselineValue: z.number(),
  scenarioValue: z.number(),
  absoluteDelta: z.number(),
  relativeDelta: z.number(),
  percentChange: z.number(),
  significant: z.boolean(),
  direction: z.enum(['increase', 'decrease', 'unchanged']),
});
export type MetricDelta = z.infer<typeof MetricDeltaSchema>;

export const OutcomeMetricsSchema = z.object({
  scenarioId: z.string(),
  computedAt: z.number(),
  computationTimeMs: z.number(),

  // Raw metrics
  metrics: z.array(MetricValueSchema),

  // Baseline comparison
  baselineScenarioId: z.string().optional(),
  deltas: z.array(MetricDeltaSchema).default([]),

  // Graph statistics
  nodeCount: z.number().int().min(0),
  edgeCount: z.number().int().min(0),
  avgDegree: z.number().min(0),
  density: z.number().min(0).max(1),
  connectedComponents: z.number().int().min(0),

  // Centrality metrics (top nodes)
  topNodesByPageRank: z.array(z.object({
    nodeId: z.string(),
    score: z.number(),
  })).default([]),
  topNodesByBetweenness: z.array(z.object({
    nodeId: z.string(),
    score: z.number(),
  })).default([]),

  // Path analysis
  avgPathLength: z.number().optional(),
  diameter: z.number().int().optional(),

  // Risk metrics
  aggregateRiskScore: z.number().min(0).max(100).optional(),
  riskDistribution: z.record(z.string(), z.number()).default({}),

  // Detection metrics
  detectionCoverage: z.number().min(0).max(1).optional(),
  avgDetectionTime: z.number().optional(),

  // Summary
  summary: z.string().optional(),
  warnings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});
export type OutcomeMetrics = z.infer<typeof OutcomeMetricsSchema>;

// ============================================================================
// Scenario Graph
// ============================================================================

export const ScenarioGraphSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),

  // Nodes and edges (delta overlay)
  nodes: z.map(z.string(), ScenarioNodeSchema).default(new Map()),
  edges: z.map(z.string(), ScenarioEdgeSchema).default(new Map()),

  // Source references (for copy-on-write)
  sourceGraphId: z.string().optional(),
  sourceNodeIds: z.set(z.string()).default(new Set()),
  sourceEdgeIds: z.set(z.string()).default(new Set()),

  // Deleted from source (for overlay)
  deletedNodeIds: z.set(z.string()).default(new Set()),
  deletedEdgeIds: z.set(z.string()).default(new Set()),

  // Adjacency (optimized for scenario)
  outgoing: z.map(z.string(), z.set(z.string())).default(new Map()),
  incoming: z.map(z.string(), z.set(z.string())).default(new Map()),

  // Stats
  stats: z.object({
    totalNodes: z.number().int().min(0),
    totalEdges: z.number().int().min(0),
    addedNodes: z.number().int().min(0),
    addedEdges: z.number().int().min(0),
    modifiedNodes: z.number().int().min(0),
    modifiedEdges: z.number().int().min(0),
    deletedNodes: z.number().int().min(0),
    deletedEdges: z.number().int().min(0),
  }),

  createdAt: z.number(),
  updatedAt: z.number(),
});
export type ScenarioGraph = z.infer<typeof ScenarioGraphSchema>;

// ============================================================================
// Main Scenario Type
// ============================================================================

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),

  // Core configuration
  mode: ScenarioMode,
  status: ScenarioStatus,
  params: ScenarioParamsSchema,
  policy: ScenarioPolicyLabels,

  // Graph reference
  graphId: z.string().optional(),

  // Delta history
  deltaSets: z.array(DeltaSetSchema).default([]),
  currentDeltaSetId: z.string().optional(),

  // Metrics
  baselineMetrics: OutcomeMetricsSchema.optional(),
  currentMetrics: OutcomeMetricsSchema.optional(),

  // Assumptions and notes
  assumptions: z.array(z.string()).default([]),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // Versioning
  version: z.number().int().positive().default(1),
  parentScenarioId: z.string().optional(),
  childScenarioIds: z.array(z.string()).default([]),

  // Timestamps
  createdAt: z.number(),
  updatedAt: z.number(),
  computedAt: z.number().optional(),
  expiresAt: z.number().optional(),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

// ============================================================================
// API Request/Response Types
// ============================================================================

export const CreateScenarioRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  mode: ScenarioMode.default('sandbox'),
  params: ScenarioParamsSchema,
  tenantId: z.string().min(1),
  createdBy: z.string().min(1),
  assumptions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateScenarioRequest = z.infer<typeof CreateScenarioRequestSchema>;

export const ApplyDeltaRequestSchema = z.object({
  scenarioId: z.string(),
  operations: z.array(z.object({
    type: DeltaOperationType,
    targetId: z.string().optional(),
    targetType: z.enum(['node', 'edge', 'rule', 'parameter']),
    data: z.unknown(),
    description: z.string().optional(),
  })),
  description: z.string().optional(),
});
export type ApplyDeltaRequest = z.infer<typeof ApplyDeltaRequestSchema>;

export const WhatIfOperationSchema = z.object({
  // Node operations
  addNode: z.object({
    labels: z.array(z.string()),
    properties: z.record(z.string(), z.unknown()),
    connectTo: z.array(z.object({
      nodeId: z.string(),
      edgeType: z.string(),
      direction: z.enum(['outgoing', 'incoming', 'both']),
      properties: z.record(z.string(), z.unknown()).optional(),
    })).optional(),
  }).optional(),

  removeNode: z.object({
    nodeId: z.string(),
    cascade: z.boolean().default(true),
  }).optional(),

  updateNode: z.object({
    nodeId: z.string(),
    properties: z.record(z.string(), z.unknown()),
    merge: z.boolean().default(true),
  }).optional(),

  // Edge operations
  addEdge: z.object({
    sourceId: z.string(),
    targetId: z.string(),
    type: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    weight: z.number().optional(),
  }).optional(),

  removeEdge: z.object({
    edgeId: z.string(),
  }).optional(),

  updateEdge: z.object({
    edgeId: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    weight: z.number().optional(),
  }).optional(),

  // Timing operations
  adjustTiming: z.object({
    targetId: z.string(),
    targetType: z.enum(['node', 'edge']),
    delayMs: z.number().int(),
    field: z.string().default('timestamp'),
  }).optional(),

  // Rule operations
  enableRule: z.object({
    ruleId: z.string(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  }).optional(),

  disableRule: z.object({
    ruleId: z.string(),
  }).optional(),

  // Parameter operations
  setParameter: z.object({
    key: z.string(),
    value: z.unknown(),
  }).optional(),
});
export type WhatIfOperation = z.infer<typeof WhatIfOperationSchema>;

export const ComputeMetricsRequestSchema = z.object({
  scenarioId: z.string(),
  baselineScenarioId: z.string().optional(),
  metrics: z.array(MetricType).optional(),
  includeTopK: z.number().int().positive().default(10),
  computeDeltas: z.boolean().default(true),
});
export type ComputeMetricsRequest = z.infer<typeof ComputeMetricsRequestSchema>;

export const ScenarioComparisonSchema = z.object({
  scenario1Id: z.string(),
  scenario2Id: z.string(),
  scenario1Metrics: OutcomeMetricsSchema,
  scenario2Metrics: OutcomeMetricsSchema,
  deltas: z.array(MetricDeltaSchema),
  structuralDifferences: z.object({
    nodesOnlyIn1: z.array(z.string()),
    nodesOnlyIn2: z.array(z.string()),
    edgesOnlyIn1: z.array(z.string()),
    edgesOnlyIn2: z.array(z.string()),
    modifiedNodes: z.array(z.string()),
    modifiedEdges: z.array(z.string()),
  }),
  summary: z.string(),
  computedAt: z.number(),
});
export type ScenarioComparison = z.infer<typeof ScenarioComparisonSchema>;

// ============================================================================
// Error Types
// ============================================================================

export class ScenarioEngineError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ScenarioEngineError';
    this.code = code;
    this.details = details;
  }
}

export class ScenarioNotFoundError extends ScenarioEngineError {
  constructor(scenarioId: string) {
    super(`Scenario not found: ${scenarioId}`, 'SCENARIO_NOT_FOUND', { scenarioId });
    this.name = 'ScenarioNotFoundError';
  }
}

export class InvalidDeltaError extends ScenarioEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_DELTA', details);
    this.name = 'InvalidDeltaError';
  }
}

export class ProductionDataGuardError extends ScenarioEngineError {
  constructor(message: string) {
    super(message, 'PRODUCTION_DATA_GUARD', { environment: 'non-production' });
    this.name = 'ProductionDataGuardError';
  }
}

export class ScenarioLimitError extends ScenarioEngineError {
  constructor(limit: string, current: number, max: number) {
    super(
      `Scenario limit exceeded: ${limit} (${current}/${max})`,
      'SCENARIO_LIMIT_EXCEEDED',
      { limit, current, max }
    );
    this.name = 'ScenarioLimitError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function isScenarioExpired(scenario: Scenario): boolean {
  if (!scenario.expiresAt) return false;
  return Date.now() > scenario.expiresAt;
}

export function calculateRetentionExpiry(retentionDays: number): number {
  return Date.now() + retentionDays * 24 * 60 * 60 * 1000;
}
