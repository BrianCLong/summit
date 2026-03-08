"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalSchema = exports.StartRunSchema = exports.WorkflowDefinitionSchema = void 0;
// @ts-nocheck
const zod_1 = require("zod");
// --- Zod Schemas ---
exports.WorkflowDefinitionSchema = zod_1.z.object({
    version: zod_1.z.string(),
    env: zod_1.z.string(),
    retentionClass: zod_1.z.string(),
    costCenter: zod_1.z.string(),
    inputSchema: zod_1.z.string(), // JSON string
    outputSchema: zod_1.z.string().optional(), // JSON string
    body: zod_1.z.string(),
});
exports.StartRunSchema = zod_1.z.object({
    workflowId: zod_1.z.string(),
    input: zod_1.z.string(), // JSON string
    env: zod_1.z.string().optional(),
    reasoningBudget: zod_1.z
        .object({
        thinkMode: zod_1.z.enum(['off', 'normal', 'heavy']).optional(),
        thinkingBudget: zod_1.z.number().int().nonnegative().optional(),
        maxTokens: zod_1.z.number().int().nonnegative().optional(),
        toolBudget: zod_1.z.number().int().nonnegative().optional(),
        timeBudgetMs: zod_1.z.number().int().nonnegative().optional(),
        redactionPolicy: zod_1.z.enum(['none', 'summary_only']).optional(),
    })
        .optional(),
});
exports.ApprovalSchema = zod_1.z.object({
    decision: zod_1.z.enum(['APPROVE', 'REJECT']),
    rationale: zod_1.z.string(),
    stepId: zod_1.z.string().optional(),
});
