"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioSchema = exports.SuccessCriteriaSchema = exports.ScenarioStepSchema = exports.ToolDefinitionSchema = exports.TraceSchema = exports.TraceEventSchema = exports.TraceEventTypeSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// TRACE SCHEMA - Canonical format for eval traces
// ============================================================================
exports.TraceEventTypeSchema = zod_1.z.enum([
    'request_start',
    'request_end',
    'tool_call_start',
    'tool_call_end',
    'routing_decision',
    'safety_check',
    'error',
    'metric',
]);
exports.TraceEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    traceId: zod_1.z.string(),
    parentId: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime(),
    type: exports.TraceEventTypeSchema,
    name: zod_1.z.string(),
    attributes: zod_1.z.record(zod_1.z.unknown()).optional(),
    metrics: zod_1.z
        .object({
        durationMs: zod_1.z.number().optional(),
        inputTokens: zod_1.z.number().optional(),
        outputTokens: zod_1.z.number().optional(),
        totalTokens: zod_1.z.number().optional(),
        costUsd: zod_1.z.number().optional(),
        latencyMs: zod_1.z.number().optional(),
    })
        .optional(),
    status: zod_1.z.enum(['success', 'failure', 'pending']).optional(),
    error: zod_1.z
        .object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        stack: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.TraceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    scenarioId: zod_1.z.string(),
    runId: zod_1.z.string(),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime().optional(),
    events: zod_1.z.array(exports.TraceEventSchema),
    summary: zod_1.z
        .object({
        success: zod_1.z.boolean(),
        totalDurationMs: zod_1.z.number(),
        totalTokens: zod_1.z.number(),
        totalCostUsd: zod_1.z.number(),
        toolCallCount: zod_1.z.number(),
        errorCount: zod_1.z.number(),
        safetyViolations: zod_1.z.number(),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============================================================================
// SCENARIO SCHEMA - YAML-based scenario definitions
// ============================================================================
exports.ToolDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    costPerCall: zod_1.z.number().optional(),
    avgLatencyMs: zod_1.z.number().optional(),
    capabilities: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ScenarioStepSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['prompt', 'tool_call', 'assertion', 'wait']),
    input: zod_1.z.unknown().optional(),
    expectedOutput: zod_1.z.unknown().optional(),
    timeout: zod_1.z.number().optional(),
    allowedTools: zod_1.z.array(zod_1.z.string()).optional(),
    constraints: zod_1.z
        .object({
        maxTokens: zod_1.z.number().optional(),
        maxCostUsd: zod_1.z.number().optional(),
        maxLatencyMs: zod_1.z.number().optional(),
    })
        .optional(),
});
exports.SuccessCriteriaSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'exact_match',
        'contains',
        'regex',
        'semantic_similarity',
        'custom',
    ]),
    value: zod_1.z.unknown(),
    threshold: zod_1.z.number().optional(),
});
exports.ScenarioSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.enum([
        'code_correction',
        'code_explanation',
        'data_analysis',
        'multi_tool_pipeline',
        'agentic_flow',
        'reasoning',
        'safety',
        'other',
    ]),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    tools: zod_1.z.array(exports.ToolDefinitionSchema),
    steps: zod_1.z.array(exports.ScenarioStepSchema),
    successCriteria: zod_1.z.array(exports.SuccessCriteriaSchema),
    constraints: zod_1.z
        .object({
        maxTotalTokens: zod_1.z.number().optional(),
        maxTotalCostUsd: zod_1.z.number().optional(),
        maxTotalLatencyMs: zod_1.z.number().optional(),
        maxToolCalls: zod_1.z.number().optional(),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
