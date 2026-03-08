"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationReportSchema = exports.EvaluationRequestSchema = exports.EvaluationCriteriaSchema = exports.EvaluationCapabilitySchema = exports.ProhibitedActionType = exports.EvaluationCapabilityType = void 0;
const zod_1 = require("zod");
// Epic 1: Evaluation Capability Taxonomy
var EvaluationCapabilityType;
(function (EvaluationCapabilityType) {
    EvaluationCapabilityType["TEST_GENERATION"] = "TEST_GENERATION";
    EvaluationCapabilityType["STATIC_ANALYSIS"] = "STATIC_ANALYSIS";
    EvaluationCapabilityType["INVARIANT_CHECK"] = "INVARIANT_CHECK";
    EvaluationCapabilityType["SCENARIO_VALIDATION"] = "SCENARIO_VALIDATION";
})(EvaluationCapabilityType || (exports.EvaluationCapabilityType = EvaluationCapabilityType = {}));
var ProhibitedActionType;
(function (ProhibitedActionType) {
    ProhibitedActionType["SELF_APPROVAL"] = "SELF_APPROVAL";
    ProhibitedActionType["SUPPRESSION"] = "SUPPRESSION";
    ProhibitedActionType["CRITERIA_MODIFICATION"] = "CRITERIA_MODIFICATION";
    ProhibitedActionType["MERGE_GATING"] = "MERGE_GATING";
    ProhibitedActionType["CI_MODIFICATION"] = "CI_MODIFICATION";
})(ProhibitedActionType || (exports.ProhibitedActionType = ProhibitedActionType = {}));
exports.EvaluationCapabilitySchema = zod_1.z.object({
    type: zod_1.z.nativeEnum(EvaluationCapabilityType),
    version: zod_1.z.string(),
    description: zod_1.z.string(),
    allowedActions: zod_1.z.array(zod_1.z.string()),
    prohibitedActions: zod_1.z.array(zod_1.z.nativeEnum(ProhibitedActionType)),
});
// Epic 3: Evaluation Criteria Transparency
exports.EvaluationCriteriaSchema = zod_1.z.object({
    id: zod_1.z.string(),
    description: zod_1.z.string(),
    // Reference to invariants or contracts
    reference: zod_1.z.string().optional(),
    // Expected logic or condition
    logic: zod_1.z.string(),
    // Must be static, not dynamic/hidden
    isStatic: zod_1.z.literal(true),
});
exports.EvaluationRequestSchema = zod_1.z.object({
    traceId: zod_1.z.string(),
    agentId: zod_1.z.string(),
    capability: zod_1.z.nativeEnum(EvaluationCapabilityType),
    // The artifact being evaluated (code, output, etc.)
    target: zod_1.z.any(),
    criteria: zod_1.z.array(exports.EvaluationCriteriaSchema),
    // Constraints for the harness
    constraints: zod_1.z.object({
        timeoutMs: zod_1.z.number().max(30000), // Max 30s
        maxSteps: zod_1.z.number().max(100),
        memoryLimitMb: zod_1.z.number().max(512),
    }),
});
// Epic 4: Reporting
exports.EvaluationReportSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    agentId: zod_1.z.string(),
    capability: zod_1.z.nativeEnum(EvaluationCapabilityType),
    capabilityVersion: zod_1.z.string(),
    criteriaResults: zod_1.z.array(zod_1.z.object({
        criteriaId: zod_1.z.string(),
        passed: zod_1.z.boolean(),
        reason: zod_1.z.string(),
        context: zod_1.z.any().optional(),
    })),
    // Advisory only flag
    isAdvisory: zod_1.z.literal(true),
    limitations: zod_1.z.array(zod_1.z.string()),
    executionStats: zod_1.z.object({
        durationMs: zod_1.z.number(),
        memoryUsageMb: zod_1.z.number(),
        stepsTaken: zod_1.z.number(),
    }),
});
