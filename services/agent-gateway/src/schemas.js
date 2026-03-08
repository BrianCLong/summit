"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRequestSchema = exports.AgentActionSchema = exports.OperationModeSchema = exports.ActionTypeSchema = void 0;
exports.validateAgentRequest = validateAgentRequest;
/**
 * Request/Response Schema Validation
 * Part of AGENT-1 Gateway Schema Validation
 */
const zod_1 = require("zod");
// ============================================================================
// Action Types
// ============================================================================
exports.ActionTypeSchema = zod_1.z.enum([
    'read',
    'write',
    'delete',
    'execute',
    'query',
    'pipeline:trigger',
    'config:modify',
    'user:impersonate',
    'export',
    'import',
]);
exports.OperationModeSchema = zod_1.z.enum([
    'SIMULATION',
    'DRY_RUN',
    'ENFORCED',
]);
// ============================================================================
// Agent Request Schema
// ============================================================================
exports.AgentActionSchema = zod_1.z.object({
    type: exports.ActionTypeSchema,
    target: zod_1.z.string().optional(),
    payload: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.AgentRequestSchema = zod_1.z.object({
    agentId: zod_1.z.string().optional(),
    operationMode: exports.OperationModeSchema.optional(),
    tenantId: zod_1.z.string().min(1, 'tenantId is required'),
    projectId: zod_1.z.string().optional(),
    action: exports.AgentActionSchema,
    correlationId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
function validateAgentRequest(input) {
    const result = exports.AgentRequestSchema.safeParse(input);
    if (result.success) {
        return {
            success: true,
            data: result.data,
        };
    }
    return {
        success: false,
        errors: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        })),
    };
}
