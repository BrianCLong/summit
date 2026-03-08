"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyStatus = exports.EnterprisePolicySchema = exports.CapabilityRuleSchema = exports.ApprovalConditionSchema = exports.BudgetSchema = exports.ScopeSchema = exports.ResourceTypeSchema = exports.CapabilitySchema = void 0;
const zod_1 = require("zod");
// -- Primitive Schemas --
exports.CapabilitySchema = zod_1.z.enum([
    'READ',
    'WRITE',
    'PLAN',
    'EXECUTE',
    'ADMIN',
    'APPROVE',
]);
exports.ResourceTypeSchema = zod_1.z.enum([
    'MAESTRO_RUN',
    'AGENT',
    'KNOWLEDGE_GRAPH',
    'VECTOR_DB',
    'FILE_STORAGE',
    'BILLING',
    'USER',
    'TENANT',
]);
// -- Domain Schemas --
exports.ScopeSchema = zod_1.z.object({
    tenantId: zod_1.z.string().optional(),
    teamId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    resourceType: exports.ResourceTypeSchema.optional(),
    resourceId: zod_1.z.string().optional(),
});
exports.BudgetSchema = zod_1.z.object({
    maxMonthlySpendUSD: zod_1.z.number().min(0).optional(),
    maxDailySpendUSD: zod_1.z.number().min(0).optional(),
    maxTokensPerRequest: zod_1.z.number().min(0).optional(),
    maxConcurrentRuns: zod_1.z.number().min(0).optional(),
    allowedModels: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ApprovalConditionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    triggerEvent: zod_1.z.enum(['SPEND_THRESHOLD', 'SENSITIVE_ACTION', 'POLICY_CHANGE', 'HIGH_RISK_TOOL']),
    thresholdValue: zod_1.z.number().optional(), // e.g., $50 or Risk Score > 0.8
    requiredApproverRoles: zod_1.z.array(zod_1.z.string()), // e.g., ["ADMIN", "FINANCE"]
    autoExpireHours: zod_1.z.number().default(24),
});
exports.CapabilityRuleSchema = zod_1.z.object({
    resourceType: exports.ResourceTypeSchema,
    allowedActions: zod_1.z.array(exports.CapabilitySchema),
    conditions: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(), // e.g. { "classification": "CONFIDENTIAL" }
});
// -- The Master Policy Schema --
exports.EnterprisePolicySchema = zod_1.z.object({
    metadata: zod_1.z.object({
        name: zod_1.z.string().min(3),
        description: zod_1.z.string().optional(),
        version: zod_1.z.string().default('1.0.0'), // User-visible semantic version
        author: zod_1.z.string().email(),
    }),
    scope: exports.ScopeSchema,
    budgets: exports.BudgetSchema.optional(),
    approvals: zod_1.z.array(exports.ApprovalConditionSchema).default([]),
    capabilities: zod_1.z.array(exports.CapabilityRuleSchema).default([]),
    enforcementMode: zod_1.z.enum(['STRICT', 'REPORT_ONLY', 'DRY_RUN']).default('STRICT'),
});
// -- DB Entities --
var PolicyStatus;
(function (PolicyStatus) {
    PolicyStatus["DRAFT"] = "DRAFT";
    PolicyStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    PolicyStatus["ACTIVE"] = "ACTIVE";
    PolicyStatus["ARCHIVED"] = "ARCHIVED";
    PolicyStatus["REJECTED"] = "REJECTED";
})(PolicyStatus || (exports.PolicyStatus = PolicyStatus = {}));
