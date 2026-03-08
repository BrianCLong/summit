"use strict";
/**
 * Resilient Workflow Orchestration Types
 * Supports hybrid, denied, and degraded network environments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandReportSchema = exports.WorkflowSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Zod Schemas for Validation
// ============================================================================
exports.WorkflowSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    version: zod_1.z.string(),
    priority: zod_1.z.enum(['critical', 'high', 'normal', 'low']),
    tasks: zod_1.z.array(zod_1.z.any()),
    state: zod_1.z.enum(['pending', 'running', 'paused', 'healing', 'completed', 'failed', 'cancelled']),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    deadline: zod_1.z.date().optional(),
    owner: zod_1.z.string(),
    coalitionPartners: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()),
});
exports.CommandReportSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['status', 'alert', 'completion', 'failure', 'healing']),
    priority: zod_1.z.enum(['flash', 'immediate', 'priority', 'routine']),
    source: zod_1.z.string(),
    destination: zod_1.z.array(zod_1.z.string()),
    timestamp: zod_1.z.date(),
    classification: zod_1.z.enum(['unclass', 'secret', 'topsecret']),
    payload: zod_1.z.object({
        workflowId: zod_1.z.string().optional(),
        taskId: zod_1.z.string().optional(),
        summary: zod_1.z.string(),
        details: zod_1.z.record(zod_1.z.unknown()),
        metrics: zod_1.z.record(zod_1.z.number()).optional(),
        recommendations: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
