"use strict";
/**
 * Document Lifecycle Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailableTransitionsSchema = exports.LifecycleHistoryEntrySchema = exports.ApprovalDecisionSchema = exports.ApprovalRequestSchema = exports.TransitionResultSchema = exports.TransitionRequestSchema = exports.LifecycleDefinitionSchema = exports.LifecycleTransitionSchema = exports.LifecycleStateSchema = void 0;
const zod_1 = require("zod");
const document_js_1 = require("./document.js");
// Lifecycle State Schema
exports.LifecycleStateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    description: zod_1.z.string(),
    is_initial: zod_1.z.boolean().default(false),
    is_terminal: zod_1.z.boolean().default(false),
});
// Lifecycle Transition Schema
exports.LifecycleTransitionSchema = zod_1.z.object({
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    requires_approval: zod_1.z.boolean().default(false),
    approvers: zod_1.z.array(zod_1.z.string()).optional(),
    notes: zod_1.z.string().optional(),
    conditions: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.enum(['equals', 'not_equals', 'contains', 'exists', 'not_exists']),
        value: zod_1.z.any().optional(),
    })).optional(),
});
// Lifecycle Definition Schema
exports.LifecycleDefinitionSchema = zod_1.z.object({
    type: document_js_1.LifecycleTypeSchema,
    description: zod_1.z.string(),
    states: zod_1.z.array(exports.LifecycleStateSchema),
    default_state: zod_1.z.string(),
    transitions: zod_1.z.array(exports.LifecycleTransitionSchema),
});
// Transition Request Schema
exports.TransitionRequestSchema = zod_1.z.object({
    document_id: zod_1.z.string().uuid(),
    target_state: zod_1.z.string(),
    comment: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
// Transition Result Schema
exports.TransitionResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    document_id: zod_1.z.string().uuid(),
    previous_state: zod_1.z.string(),
    new_state: zod_1.z.string(),
    transition_id: zod_1.z.string().uuid().optional(),
    errors: zod_1.z.array(zod_1.z.string()),
    warnings: zod_1.z.array(zod_1.z.string()),
    requires_approval: zod_1.z.boolean(),
    approval_request_id: zod_1.z.string().uuid().optional(),
});
// Approval Request Schema
exports.ApprovalRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    transition_from: zod_1.z.string(),
    transition_to: zod_1.z.string(),
    requested_by: zod_1.z.string(),
    requested_at: zod_1.z.string().datetime(),
    approvers: zod_1.z.array(zod_1.z.string()),
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'expired', 'cancelled']),
    comment: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
// Approval Decision Schema
exports.ApprovalDecisionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    approval_request_id: zod_1.z.string().uuid(),
    approver_id: zod_1.z.string(),
    decision: zod_1.z.enum(['approved', 'rejected']),
    comment: zod_1.z.string().optional(),
    decided_at: zod_1.z.string().datetime(),
});
// Lifecycle History Entry Schema
exports.LifecycleHistoryEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    previous_state: zod_1.z.string().nullable(),
    new_state: zod_1.z.string(),
    transition_type: zod_1.z.enum(['manual', 'automatic', 'approval']),
    triggered_by: zod_1.z.string(),
    triggered_at: zod_1.z.string().datetime(),
    approval_request_id: zod_1.z.string().uuid().optional(),
    comment: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
// Available Transitions Response Schema
exports.AvailableTransitionsSchema = zod_1.z.object({
    document_id: zod_1.z.string().uuid(),
    current_state: zod_1.z.string(),
    available_transitions: zod_1.z.array(zod_1.z.object({
        target_state: zod_1.z.string(),
        requires_approval: zod_1.z.boolean(),
        approvers: zod_1.z.array(zod_1.z.string()).optional(),
        notes: zod_1.z.string().optional(),
    })),
});
