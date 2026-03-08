"use strict";
/**
 * Digital Twin Cognition Layer Types
 *
 * Comprehensive type definitions for the next-generation digital twin cognition system
 * that provides self-learning, multi-scale, multi-agent reasoning on top of digital twins.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertSchema = exports.DecisionSchema = exports.CognitionSessionSchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// Zod Schemas for Validation
// =============================================================================
exports.CognitionSessionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    twinId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string(),
    agentId: zod_1.z.string().uuid().optional(),
    state: zod_1.z.enum([
        'IDLE', 'PERCEIVING', 'REASONING', 'DELIBERATING',
        'DECIDING', 'EXECUTING', 'LEARNING', 'REFLECTING'
    ]),
    confidence: zod_1.z.number().min(0).max(1),
    startedAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()),
});
exports.DecisionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().uuid(),
    type: zod_1.z.enum([
        'CONTROL_ADJUSTMENT', 'MAINTENANCE_SCHEDULE', 'ALERT_ESCALATION',
        'CONFIGURATION_CHANGE', 'RESOURCE_ALLOCATION', 'PROCESS_OPTIMIZATION',
        'SAFETY_INTERVENTION'
    ]),
    description: zod_1.z.string(),
    rationale: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    requiresApproval: zod_1.z.boolean(),
    approvalStatus: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    createdAt: zod_1.z.date(),
    executedAt: zod_1.z.date().optional(),
});
exports.AlertSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    twinId: zod_1.z.string().uuid(),
    type: zod_1.z.enum([
        'ANOMALY_DETECTED', 'THRESHOLD_BREACH', 'PREDICTION_ALERT',
        'COMPLIANCE_VIOLATION', 'MAINTENANCE_DUE', 'OPTIMIZATION_OPPORTUNITY',
        'SYSTEM_HEALTH'
    ]),
    severity: zod_1.z.enum(['NEGLIGIBLE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    source: zod_1.z.string(),
    status: zod_1.z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED']),
    createdAt: zod_1.z.date(),
});
