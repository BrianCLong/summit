"use strict";
/**
 * Workflow Contract v1
 * Maestro Conductor workflow execution API contracts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelWorkflowResponseV1 = exports.CancelWorkflowRequestV1 = exports.GetPersonNetworkWorkflowStatusResponseV1 = exports.GetWorkflowStatusResponseV1 = exports.WorkflowStepV1 = exports.GetWorkflowStatusRequestV1 = exports.StartWorkflowResponseV1 = exports.StartPersonNetworkWorkflowRequestV1 = exports.StartWorkflowRequestV1 = exports.PersonNetworkWorkflowOutputV1 = exports.PersonNetworkWorkflowInputV1 = exports.WorkflowStatusV1 = void 0;
const zod_1 = require("zod");
const entities_js_1 = require("./entities.js");
const queries_js_1 = require("./queries.js");
/**
 * Workflow execution status
 */
exports.WorkflowStatusV1 = zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout']);
/**
 * Person Network Analysis Workflow Input
 */
exports.PersonNetworkWorkflowInputV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    personId: zod_1.z.string().uuid().describe('Person entity ID to analyze'),
    analysisDepth: zod_1.z
        .number()
        .int()
        .min(1)
        .max(3)
        .default(2)
        .describe('Network analysis depth (1-3 hops)'),
    includeAnalysis: zod_1.z.boolean().default(true).describe('Whether to generate AI analysis/summary'),
    options: zod_1.z
        .object({
        maxNetworkSize: zod_1.z.number().int().positive().max(1000).optional().describe('Maximum network size to analyze'),
        relationshipTypes: zod_1.z
            .array(zod_1.z.enum(['colleague', 'family', 'business', 'friend', 'mentor', 'advisor', 'partner', 'unknown']))
            .optional()
            .describe('Filter by relationship types'),
    })
        .optional(),
});
/**
 * Person Network Analysis Workflow Output
 */
exports.PersonNetworkWorkflowOutputV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    person: entities_js_1.PersonEntityV1.describe('Root person entity'),
    networkSize: zod_1.z.number().int().nonnegative().describe('Total size of network'),
    summary: zod_1.z.string().describe('AI-generated or templated summary of the network'),
    associations: zod_1.z.array(queries_js_1.PersonAssociationV1).describe('Person associations in the network'),
    insights: zod_1.z
        .object({
        clusterCount: zod_1.z.number().int().nonnegative().optional().describe('Number of network clusters'),
        strongConnections: zod_1.z.number().int().nonnegative().optional().describe('Count of strong connections (>0.7)'),
        weakConnections: zod_1.z.number().int().nonnegative().optional().describe('Count of weak connections (<0.3)'),
        dominantRelationshipType: zod_1.z.string().optional().describe('Most common relationship type'),
    })
        .optional(),
    metadata: zod_1.z.object({
        analyzedAt: zod_1.z.string().datetime().describe('When the analysis was performed'),
        processingTimeMs: zod_1.z.number().nonnegative().describe('Processing time in milliseconds'),
    }),
});
/**
 * Start Workflow Request (generic)
 */
exports.StartWorkflowRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    workflow: zod_1.z.string().min(1).describe('Workflow name/identifier'),
    namespace: zod_1.z.string().default('default').describe('Workflow namespace'),
    inputs: zod_1.z.record(zod_1.z.unknown()).describe('Workflow input parameters'),
    metadata: zod_1.z
        .object({
        correlationId: zod_1.z.string().uuid().optional().describe('Correlation ID for tracing'),
        initiatedBy: zod_1.z.string().optional().describe('User or service that initiated the workflow'),
        priority: zod_1.z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    })
        .optional(),
});
/**
 * Start Person Network Workflow Request
 */
exports.StartPersonNetworkWorkflowRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    workflow: zod_1.z.literal('person-network-analysis').describe('Workflow identifier'),
    namespace: zod_1.z.string().default('integration').describe('Workflow namespace'),
    inputs: exports.PersonNetworkWorkflowInputV1.describe('Workflow inputs'),
    metadata: zod_1.z
        .object({
        correlationId: zod_1.z.string().uuid().optional().describe('Correlation ID for tracing'),
        initiatedBy: zod_1.z.string().optional().describe('User or service that initiated the workflow'),
        priority: zod_1.z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    })
        .optional(),
});
/**
 * Start Workflow Response
 */
exports.StartWorkflowResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    runId: zod_1.z.string().uuid().describe('Workflow run ID for tracking'),
    status: exports.WorkflowStatusV1.describe('Initial workflow status'),
    startedAt: zod_1.z.string().datetime().describe('When the workflow started'),
});
/**
 * Get Workflow Status Request
 */
exports.GetWorkflowStatusRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    runId: zod_1.z.string().uuid().describe('Workflow run ID'),
});
/**
 * Workflow step execution detail
 */
exports.WorkflowStepV1 = zod_1.z.object({
    id: zod_1.z.string().describe('Step ID'),
    name: zod_1.z.string().describe('Step name'),
    status: zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'skipped']).describe('Step status'),
    startedAt: zod_1.z.string().datetime().optional().describe('When the step started'),
    completedAt: zod_1.z.string().datetime().optional().describe('When the step completed'),
    error: zod_1.z.string().optional().describe('Error message if step failed'),
});
/**
 * Get Workflow Status Response (generic)
 */
exports.GetWorkflowStatusResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    runId: zod_1.z.string().uuid().describe('Workflow run ID'),
    workflow: zod_1.z.string().describe('Workflow name'),
    namespace: zod_1.z.string().describe('Workflow namespace'),
    status: exports.WorkflowStatusV1.describe('Current workflow status'),
    startedAt: zod_1.z.string().datetime().describe('When the workflow started'),
    completedAt: zod_1.z.string().datetime().optional().describe('When the workflow completed'),
    outputs: zod_1.z.record(zod_1.z.unknown()).optional().describe('Workflow outputs (if completed)'),
    error: zod_1.z.string().optional().describe('Error message if workflow failed'),
    steps: zod_1.z.array(exports.WorkflowStepV1).optional().describe('Step execution details'),
    metadata: zod_1.z
        .object({
        totalSteps: zod_1.z.number().int().nonnegative().optional().describe('Total number of steps'),
        completedSteps: zod_1.z.number().int().nonnegative().optional().describe('Number of completed steps'),
        processingTimeMs: zod_1.z.number().nonnegative().optional().describe('Total processing time'),
    })
        .optional(),
});
/**
 * Get Person Network Workflow Status Response
 */
exports.GetPersonNetworkWorkflowStatusResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    runId: zod_1.z.string().uuid().describe('Workflow run ID'),
    workflow: zod_1.z.literal('person-network-analysis').describe('Workflow name'),
    namespace: zod_1.z.string().describe('Workflow namespace'),
    status: exports.WorkflowStatusV1.describe('Current workflow status'),
    startedAt: zod_1.z.string().datetime().describe('When the workflow started'),
    completedAt: zod_1.z.string().datetime().optional().describe('When the workflow completed'),
    result: exports.PersonNetworkWorkflowOutputV1.optional().describe('Workflow result (if completed)'),
    error: zod_1.z.string().optional().describe('Error message if workflow failed'),
    steps: zod_1.z.array(exports.WorkflowStepV1).optional().describe('Step execution details'),
});
/**
 * Cancel Workflow Request
 */
exports.CancelWorkflowRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    runId: zod_1.z.string().uuid().describe('Workflow run ID to cancel'),
    reason: zod_1.z.string().optional().describe('Reason for cancellation'),
});
/**
 * Cancel Workflow Response
 */
exports.CancelWorkflowResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    runId: zod_1.z.string().uuid().describe('Workflow run ID'),
    status: exports.WorkflowStatusV1.describe('Updated workflow status'),
    cancelledAt: zod_1.z.string().datetime().describe('When the workflow was cancelled'),
});
