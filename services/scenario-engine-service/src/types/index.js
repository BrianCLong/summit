"use strict";
/**
 * Scenario Engine Types
 * Core types for what-if analysis and counterfactual modeling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioLimitError = exports.ProductionDataGuardError = exports.InvalidDeltaError = exports.ScenarioNotFoundError = exports.ScenarioEngineError = exports.ScenarioComparisonSchema = exports.ComputeMetricsRequestSchema = exports.WhatIfOperationSchema = exports.ApplyDeltaRequestSchema = exports.CreateScenarioRequestSchema = exports.ScenarioSchema = exports.ScenarioGraphSchema = exports.OutcomeMetricsSchema = exports.MetricDeltaSchema = exports.MetricValueSchema = exports.ScenarioParamsSchema = exports.TimeWindowSchema = exports.DeltaSetSchema = exports.DeltaOperationSchema = exports.ScenarioEdgeSchema = exports.ScenarioNodeSchema = exports.ScenarioPolicyLabels = exports.ScenarioMode = exports.MetricType = exports.DeltaOperationType = exports.ScenarioStatus = void 0;
exports.generateId = generateId;
exports.isScenarioExpired = isScenarioExpired;
exports.calculateRetentionExpiry = calculateRetentionExpiry;
const zod_1 = require("zod");
// ============================================================================
// Core Enums
// ============================================================================
exports.ScenarioStatus = zod_1.z.enum([
    'draft',
    'active',
    'computing',
    'completed',
    'archived',
    'failed',
]);
exports.DeltaOperationType = zod_1.z.enum([
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
exports.MetricType = zod_1.z.enum([
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
exports.ScenarioMode = zod_1.z.enum([
    'sandbox',
    'simulation',
    'counterfactual',
    'forecast',
]);
// ============================================================================
// Policy & Governance (Non-Production Labels)
// ============================================================================
exports.ScenarioPolicyLabels = zod_1.z.object({
    environment: zod_1.z.literal('non-production').default('non-production'),
    tenantId: zod_1.z.string().min(1),
    caseId: zod_1.z.string().optional(),
    classification: zod_1.z.enum(['sandbox', 'test', 'analysis', 'training']).default('sandbox'),
    retentionDays: zod_1.z.number().int().positive().default(30),
    createdBy: zod_1.z.string().min(1),
    accessControl: zod_1.z.array(zod_1.z.string()).default([]),
});
// ============================================================================
// Node & Edge Types (Scenario-Specific)
// ============================================================================
exports.ScenarioNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    labels: zod_1.z.array(zod_1.z.string()).default([]),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
    version: zod_1.z.number().default(1),
    deleted: zod_1.z.boolean().default(false),
    // Scenario-specific fields
    isOriginal: zod_1.z.boolean().default(true),
    sourceNodeId: zod_1.z.string().optional(),
    modifiedInScenario: zod_1.z.boolean().default(false),
});
exports.ScenarioEdgeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    weight: zod_1.z.number().default(1.0),
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
    version: zod_1.z.number().default(1),
    deleted: zod_1.z.boolean().default(false),
    validFrom: zod_1.z.number().optional(),
    validTo: zod_1.z.number().optional(),
    // Scenario-specific fields
    isOriginal: zod_1.z.boolean().default(true),
    sourceEdgeId: zod_1.z.string().optional(),
    modifiedInScenario: zod_1.z.boolean().default(false),
});
// ============================================================================
// Delta Operations
// ============================================================================
exports.DeltaOperationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.DeltaOperationType,
    targetId: zod_1.z.string(),
    targetType: zod_1.z.enum(['node', 'edge', 'rule', 'parameter']),
    before: zod_1.z.unknown().optional(),
    after: zod_1.z.unknown().optional(),
    timestamp: zod_1.z.number(),
    description: zod_1.z.string().optional(),
    reversible: zod_1.z.boolean().default(true),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
exports.DeltaSetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    scenarioId: zod_1.z.string(),
    operations: zod_1.z.array(exports.DeltaOperationSchema),
    createdAt: zod_1.z.number(),
    description: zod_1.z.string().optional(),
    applied: zod_1.z.boolean().default(false),
    appliedAt: zod_1.z.number().optional(),
    rollbackAvailable: zod_1.z.boolean().default(true),
});
// ============================================================================
// Scenario Parameters
// ============================================================================
exports.TimeWindowSchema = zod_1.z.object({
    start: zod_1.z.number(),
    end: zod_1.z.number(),
    resolution: zod_1.z.enum(['minute', 'hour', 'day', 'week', 'month']).default('hour'),
});
exports.ScenarioParamsSchema = zod_1.z.object({
    // Source data references
    sourceCaseId: zod_1.z.string().optional(),
    sourceGraphId: zod_1.z.string().optional(),
    sourceNodeIds: zod_1.z.array(zod_1.z.string()).optional(),
    // Graph selection
    includeNeighbors: zod_1.z.boolean().default(true),
    neighborDepth: zod_1.z.number().int().min(0).max(5).default(2),
    nodeLabels: zod_1.z.array(zod_1.z.string()).optional(),
    edgeTypes: zod_1.z.array(zod_1.z.string()).optional(),
    // Temporal parameters
    timeWindow: exports.TimeWindowSchema.optional(),
    eventDelayMs: zod_1.z.number().int().min(0).optional(),
    // Analysis parameters
    detectionRules: zod_1.z.array(zod_1.z.string()).default([]),
    enabledRules: zod_1.z.array(zod_1.z.string()).default([]),
    disabledRules: zod_1.z.array(zod_1.z.string()).default([]),
    // Resource constraints
    resourceBudget: zod_1.z.number().positive().optional(),
    maxNodes: zod_1.z.number().int().positive().default(10000),
    maxEdges: zod_1.z.number().int().positive().default(50000),
    // Custom parameters
    customParams: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
// ============================================================================
// Outcome Metrics
// ============================================================================
exports.MetricValueSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: exports.MetricType,
    value: zod_1.z.number(),
    unit: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).default(1),
    timestamp: zod_1.z.number(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
exports.MetricDeltaSchema = zod_1.z.object({
    metricName: zod_1.z.string(),
    baselineValue: zod_1.z.number(),
    scenarioValue: zod_1.z.number(),
    absoluteDelta: zod_1.z.number(),
    relativeDelta: zod_1.z.number(),
    percentChange: zod_1.z.number(),
    significant: zod_1.z.boolean(),
    direction: zod_1.z.enum(['increase', 'decrease', 'unchanged']),
});
exports.OutcomeMetricsSchema = zod_1.z.object({
    scenarioId: zod_1.z.string(),
    computedAt: zod_1.z.number(),
    computationTimeMs: zod_1.z.number(),
    // Raw metrics
    metrics: zod_1.z.array(exports.MetricValueSchema),
    // Baseline comparison
    baselineScenarioId: zod_1.z.string().optional(),
    deltas: zod_1.z.array(exports.MetricDeltaSchema).default([]),
    // Graph statistics
    nodeCount: zod_1.z.number().int().min(0),
    edgeCount: zod_1.z.number().int().min(0),
    avgDegree: zod_1.z.number().min(0),
    density: zod_1.z.number().min(0).max(1),
    connectedComponents: zod_1.z.number().int().min(0),
    // Centrality metrics (top nodes)
    topNodesByPageRank: zod_1.z.array(zod_1.z.object({
        nodeId: zod_1.z.string(),
        score: zod_1.z.number(),
    })).default([]),
    topNodesByBetweenness: zod_1.z.array(zod_1.z.object({
        nodeId: zod_1.z.string(),
        score: zod_1.z.number(),
    })).default([]),
    // Path analysis
    avgPathLength: zod_1.z.number().optional(),
    diameter: zod_1.z.number().int().optional(),
    // Risk metrics
    aggregateRiskScore: zod_1.z.number().min(0).max(100).optional(),
    riskDistribution: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).default({}),
    // Detection metrics
    detectionCoverage: zod_1.z.number().min(0).max(1).optional(),
    avgDetectionTime: zod_1.z.number().optional(),
    // Summary
    summary: zod_1.z.string().optional(),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    recommendations: zod_1.z.array(zod_1.z.string()).default([]),
});
// ============================================================================
// Scenario Graph
// ============================================================================
exports.ScenarioGraphSchema = zod_1.z.object({
    id: zod_1.z.string(),
    scenarioId: zod_1.z.string(),
    // Nodes and edges (delta overlay)
    nodes: zod_1.z.map(zod_1.z.string(), exports.ScenarioNodeSchema).default(new Map()),
    edges: zod_1.z.map(zod_1.z.string(), exports.ScenarioEdgeSchema).default(new Map()),
    // Source references (for copy-on-write)
    sourceGraphId: zod_1.z.string().optional(),
    sourceNodeIds: zod_1.z.set(zod_1.z.string()).default(new Set()),
    sourceEdgeIds: zod_1.z.set(zod_1.z.string()).default(new Set()),
    // Deleted from source (for overlay)
    deletedNodeIds: zod_1.z.set(zod_1.z.string()).default(new Set()),
    deletedEdgeIds: zod_1.z.set(zod_1.z.string()).default(new Set()),
    // Adjacency (optimized for scenario)
    outgoing: zod_1.z.map(zod_1.z.string(), zod_1.z.set(zod_1.z.string())).default(new Map()),
    incoming: zod_1.z.map(zod_1.z.string(), zod_1.z.set(zod_1.z.string())).default(new Map()),
    // Stats
    stats: zod_1.z.object({
        totalNodes: zod_1.z.number().int().min(0),
        totalEdges: zod_1.z.number().int().min(0),
        addedNodes: zod_1.z.number().int().min(0),
        addedEdges: zod_1.z.number().int().min(0),
        modifiedNodes: zod_1.z.number().int().min(0),
        modifiedEdges: zod_1.z.number().int().min(0),
        deletedNodes: zod_1.z.number().int().min(0),
        deletedEdges: zod_1.z.number().int().min(0),
    }),
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
});
// ============================================================================
// Main Scenario Type
// ============================================================================
exports.ScenarioSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(5000).optional(),
    // Core configuration
    mode: exports.ScenarioMode,
    status: exports.ScenarioStatus,
    params: exports.ScenarioParamsSchema,
    policy: exports.ScenarioPolicyLabels,
    // Graph reference
    graphId: zod_1.z.string().optional(),
    // Delta history
    deltaSets: zod_1.z.array(exports.DeltaSetSchema).default([]),
    currentDeltaSetId: zod_1.z.string().optional(),
    // Metrics
    baselineMetrics: exports.OutcomeMetricsSchema.optional(),
    currentMetrics: exports.OutcomeMetricsSchema.optional(),
    // Assumptions and notes
    assumptions: zod_1.z.array(zod_1.z.string()).default([]),
    notes: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    // Versioning
    version: zod_1.z.number().int().positive().default(1),
    parentScenarioId: zod_1.z.string().optional(),
    childScenarioIds: zod_1.z.array(zod_1.z.string()).default([]),
    // Timestamps
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
    computedAt: zod_1.z.number().optional(),
    expiresAt: zod_1.z.number().optional(),
});
// ============================================================================
// API Request/Response Types
// ============================================================================
exports.CreateScenarioRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(5000).optional(),
    mode: exports.ScenarioMode.default('sandbox'),
    params: exports.ScenarioParamsSchema,
    tenantId: zod_1.z.string().min(1),
    createdBy: zod_1.z.string().min(1),
    assumptions: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ApplyDeltaRequestSchema = zod_1.z.object({
    scenarioId: zod_1.z.string(),
    operations: zod_1.z.array(zod_1.z.object({
        type: exports.DeltaOperationType,
        targetId: zod_1.z.string().optional(),
        targetType: zod_1.z.enum(['node', 'edge', 'rule', 'parameter']),
        data: zod_1.z.unknown(),
        description: zod_1.z.string().optional(),
    })),
    description: zod_1.z.string().optional(),
});
exports.WhatIfOperationSchema = zod_1.z.object({
    // Node operations
    addNode: zod_1.z.object({
        labels: zod_1.z.array(zod_1.z.string()),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        connectTo: zod_1.z.array(zod_1.z.object({
            nodeId: zod_1.z.string(),
            edgeType: zod_1.z.string(),
            direction: zod_1.z.enum(['outgoing', 'incoming', 'both']),
            properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        })).optional(),
    }).optional(),
    removeNode: zod_1.z.object({
        nodeId: zod_1.z.string(),
        cascade: zod_1.z.boolean().default(true),
    }).optional(),
    updateNode: zod_1.z.object({
        nodeId: zod_1.z.string(),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        merge: zod_1.z.boolean().default(true),
    }).optional(),
    // Edge operations
    addEdge: zod_1.z.object({
        sourceId: zod_1.z.string(),
        targetId: zod_1.z.string(),
        type: zod_1.z.string(),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        weight: zod_1.z.number().optional(),
    }).optional(),
    removeEdge: zod_1.z.object({
        edgeId: zod_1.z.string(),
    }).optional(),
    updateEdge: zod_1.z.object({
        edgeId: zod_1.z.string(),
        properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        weight: zod_1.z.number().optional(),
    }).optional(),
    // Timing operations
    adjustTiming: zod_1.z.object({
        targetId: zod_1.z.string(),
        targetType: zod_1.z.enum(['node', 'edge']),
        delayMs: zod_1.z.number().int(),
        field: zod_1.z.string().default('timestamp'),
    }).optional(),
    // Rule operations
    enableRule: zod_1.z.object({
        ruleId: zod_1.z.string(),
        parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    }).optional(),
    disableRule: zod_1.z.object({
        ruleId: zod_1.z.string(),
    }).optional(),
    // Parameter operations
    setParameter: zod_1.z.object({
        key: zod_1.z.string(),
        value: zod_1.z.unknown(),
    }).optional(),
});
exports.ComputeMetricsRequestSchema = zod_1.z.object({
    scenarioId: zod_1.z.string(),
    baselineScenarioId: zod_1.z.string().optional(),
    metrics: zod_1.z.array(exports.MetricType).optional(),
    includeTopK: zod_1.z.number().int().positive().default(10),
    computeDeltas: zod_1.z.boolean().default(true),
});
exports.ScenarioComparisonSchema = zod_1.z.object({
    scenario1Id: zod_1.z.string(),
    scenario2Id: zod_1.z.string(),
    scenario1Metrics: exports.OutcomeMetricsSchema,
    scenario2Metrics: exports.OutcomeMetricsSchema,
    deltas: zod_1.z.array(exports.MetricDeltaSchema),
    structuralDifferences: zod_1.z.object({
        nodesOnlyIn1: zod_1.z.array(zod_1.z.string()),
        nodesOnlyIn2: zod_1.z.array(zod_1.z.string()),
        edgesOnlyIn1: zod_1.z.array(zod_1.z.string()),
        edgesOnlyIn2: zod_1.z.array(zod_1.z.string()),
        modifiedNodes: zod_1.z.array(zod_1.z.string()),
        modifiedEdges: zod_1.z.array(zod_1.z.string()),
    }),
    summary: zod_1.z.string(),
    computedAt: zod_1.z.number(),
});
// ============================================================================
// Error Types
// ============================================================================
class ScenarioEngineError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'ScenarioEngineError';
        this.code = code;
        this.details = details;
    }
}
exports.ScenarioEngineError = ScenarioEngineError;
class ScenarioNotFoundError extends ScenarioEngineError {
    constructor(scenarioId) {
        super(`Scenario not found: ${scenarioId}`, 'SCENARIO_NOT_FOUND', { scenarioId });
        this.name = 'ScenarioNotFoundError';
    }
}
exports.ScenarioNotFoundError = ScenarioNotFoundError;
class InvalidDeltaError extends ScenarioEngineError {
    constructor(message, details) {
        super(message, 'INVALID_DELTA', details);
        this.name = 'InvalidDeltaError';
    }
}
exports.InvalidDeltaError = InvalidDeltaError;
class ProductionDataGuardError extends ScenarioEngineError {
    constructor(message) {
        super(message, 'PRODUCTION_DATA_GUARD', { environment: 'non-production' });
        this.name = 'ProductionDataGuardError';
    }
}
exports.ProductionDataGuardError = ProductionDataGuardError;
class ScenarioLimitError extends ScenarioEngineError {
    constructor(limit, current, max) {
        super(`Scenario limit exceeded: ${limit} (${current}/${max})`, 'SCENARIO_LIMIT_EXCEEDED', { limit, current, max });
        this.name = 'ScenarioLimitError';
    }
}
exports.ScenarioLimitError = ScenarioLimitError;
// ============================================================================
// Utility Functions
// ============================================================================
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
function isScenarioExpired(scenario) {
    if (!scenario.expiresAt)
        return false;
    return Date.now() > scenario.expiresAt;
}
function calculateRetentionExpiry(retentionDays) {
    return Date.now() + retentionDays * 24 * 60 * 60 * 1000;
}
