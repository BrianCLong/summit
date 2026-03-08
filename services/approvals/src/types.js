"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.NotFoundError = exports.PolicyDenialError = exports.ValidationError = exports.AppError = exports.ListRequestsQuerySchema = exports.CancelRequestSchema = exports.ApprovalDecisionSchema = exports.ApprovalRequestSchema = exports.CreateApprovalRequestSchema = exports.DecisionRecordSchema = exports.PolicyEvaluationSchema = exports.PolicyConditionSchema = exports.ResourceSchema = exports.ActorSchema = exports.DecisionType = exports.ApprovalStatus = void 0;
const zod_1 = require("zod");
// ============================================================================
// Core Enums
// ============================================================================
exports.ApprovalStatus = zod_1.z.enum([
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'expired',
]);
exports.DecisionType = zod_1.z.enum(['approve', 'reject']);
// ============================================================================
// Actor Schema (requestor or approver)
// ============================================================================
exports.ActorSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional(),
    roles: zod_1.z.array(zod_1.z.string()).default([]),
    attributes: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============================================================================
// Resource Schema
// ============================================================================
exports.ResourceSchema = zod_1.z
    .object({
    type: zod_1.z.string().min(1),
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().optional(),
})
    .passthrough(); // Allow additional properties
// ============================================================================
// Policy Evaluation
// ============================================================================
exports.PolicyConditionSchema = zod_1.z.object({
    type: zod_1.z.string(),
    constraint: zod_1.z.string().optional(),
    value: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
exports.PolicyEvaluationSchema = zod_1.z.object({
    policy_version: zod_1.z.string(),
    decision: zod_1.z.enum(['allow', 'deny', 'require_approval']),
    required_approvals: zod_1.z.number().int().min(0).default(0),
    allowed_approver_roles: zod_1.z.array(zod_1.z.string()).default([]),
    conditions: zod_1.z.array(exports.PolicyConditionSchema).default([]),
    violations: zod_1.z.array(zod_1.z.string()).default([]),
    trace_id: zod_1.z.string().optional(),
});
// ============================================================================
// Decision Record
// ============================================================================
exports.DecisionRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    actor: exports.ActorSchema,
    decision: exports.DecisionType,
    reason: zod_1.z.string().optional(),
    conditions: zod_1.z.array(exports.PolicyConditionSchema).default([]),
    timestamp: zod_1.z.string().datetime(),
    receipt_id: zod_1.z.string().optional(),
});
// ============================================================================
// Create Approval Request
// ============================================================================
exports.CreateApprovalRequestSchema = zod_1.z.object({
    resource: exports.ResourceSchema,
    action: zod_1.z.string().min(1),
    requestor: exports.ActorSchema,
    attributes: zod_1.z.record(zod_1.z.unknown()).optional(),
    context: zod_1.z.record(zod_1.z.unknown()).optional(),
    justification: zod_1.z.string().optional(),
    expires_at: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Full Approval Request
// ============================================================================
exports.ApprovalRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    tenant_id: zod_1.z.string().min(1),
    resource: exports.ResourceSchema,
    action: zod_1.z.string(),
    requestor: exports.ActorSchema,
    status: exports.ApprovalStatus,
    attributes: zod_1.z.record(zod_1.z.unknown()).optional(),
    context: zod_1.z.record(zod_1.z.unknown()).optional(),
    justification: zod_1.z.string().optional(),
    policy_evaluation: exports.PolicyEvaluationSchema.optional(),
    decisions: zod_1.z.array(exports.DecisionRecordSchema).default([]),
    receipt_id: zod_1.z.string().optional(),
    idempotency_key: zod_1.z.string().optional(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
    expires_at: zod_1.z.string().datetime().optional(),
    finalized_at: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Decision Submission
// ============================================================================
exports.ApprovalDecisionSchema = zod_1.z.object({
    decision: exports.DecisionType,
    actor: exports.ActorSchema,
    reason: zod_1.z.string().optional(),
    conditions: zod_1.z.array(exports.PolicyConditionSchema).optional(),
});
// ============================================================================
// Cancel Request
// ============================================================================
exports.CancelRequestSchema = zod_1.z.object({
    actor: exports.ActorSchema,
    reason: zod_1.z.string().optional(),
});
// ============================================================================
// List Query Parameters
// ============================================================================
exports.ListRequestsQuerySchema = zod_1.z.object({
    status: zod_1.z
        .union([exports.ApprovalStatus, zod_1.z.array(exports.ApprovalStatus)])
        .optional()
        .transform((v) => (v ? (Array.isArray(v) ? v : [v]) : undefined)),
    actor: zod_1.z.string().optional(),
    resource_type: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    cursor: zod_1.z.string().optional(),
});
// ============================================================================
// Error Types
// ============================================================================
class AppError extends Error {
    code;
    statusCode;
    details;
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    errors;
    constructor(message, errors) {
        super('VALIDATION_ERROR', message, 422, { errors });
        this.errors = errors;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class PolicyDenialError extends AppError {
    policy;
    constructor(message, policy) {
        super('POLICY_DENIED', message, 403, { policy });
        this.policy = policy;
        this.name = 'PolicyDenialError';
    }
}
exports.PolicyDenialError = PolicyDenialError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        super('NOT_FOUND', `${resource} with id '${id}' not found`, 404);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super('CONFLICT', message, 409);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
