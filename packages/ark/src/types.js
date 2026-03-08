"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimLinkSchema = exports.EvidenceSchema = exports.EventSchema = exports.RunSchema = exports.BudgetSchema = exports.ToolSchema = exports.EventType = exports.RunStatus = exports.RiskClass = void 0;
const zod_1 = require("zod");
// --- Enums ---
var RiskClass;
(function (RiskClass) {
    RiskClass["LOW"] = "low";
    RiskClass["MEDIUM"] = "medium";
    RiskClass["HIGH"] = "high";
    RiskClass["CRITICAL"] = "critical";
})(RiskClass || (exports.RiskClass = RiskClass = {}));
var RunStatus;
(function (RunStatus) {
    RunStatus["PENDING"] = "pending";
    RunStatus["RUNNING"] = "running";
    RunStatus["PAUSED"] = "paused";
    RunStatus["COMPLETED"] = "completed";
    RunStatus["FAILED"] = "failed";
    RunStatus["CANCELLED"] = "cancelled";
})(RunStatus || (exports.RunStatus = RunStatus = {}));
var EventType;
(function (EventType) {
    EventType["RUN_STARTED"] = "RunStarted";
    EventType["RUN_ENDED"] = "RunEnded";
    EventType["MODEL_CALL_REQUESTED"] = "ModelCallRequested";
    EventType["MODEL_CALL_COMPLETED"] = "ModelCallCompleted";
    EventType["PLAN_PROPOSED"] = "PlanProposed";
    EventType["PLAN_ACCEPTED"] = "PlanAccepted";
    EventType["PLAN_REVISED"] = "PlanRevised";
    EventType["TOOL_CALL_REQUESTED"] = "ToolCallRequested";
    EventType["TOOL_CALL_COMPLETED"] = "ToolCallCompleted";
    EventType["TOOL_CALL_FAILED"] = "ToolCallFailed";
    EventType["RETRIEVAL_QUERY"] = "RetrievalQuery";
    EventType["RETRIEVAL_RESULT"] = "RetrievalResult";
    EventType["ASSERTION_RAISED"] = "AssertionRaised";
    EventType["ASSERTION_CHECKED"] = "AssertionChecked";
    EventType["POLICY_DECISION"] = "PolicyDecision";
    EventType["COST_UPDATE"] = "CostUpdate";
    EventType["HUMAN_FEEDBACK_RECEIVED"] = "HumanFeedbackReceived";
    EventType["AUTO_GRADE_COMPUTED"] = "AutoGradeComputed";
})(EventType || (exports.EventType = EventType = {}));
// --- Zod Schemas & Types ---
// 1. Tool
exports.ToolSchema = zod_1.z.object({
    tool_id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    schema_in: zod_1.z.record(zod_1.z.any()), // JSON Schema
    schema_out: zod_1.z.record(zod_1.z.any()), // JSON Schema
    scopes_required: zod_1.z.array(zod_1.z.string()),
    risk_class: zod_1.z.nativeEnum(RiskClass),
    limits: zod_1.z.object({
        timeout_ms: zod_1.z.number().optional(),
        max_retries: zod_1.z.number().optional(),
        cost_per_call: zod_1.z.number().optional(),
    }).optional(),
});
// 2. Run
exports.BudgetSchema = zod_1.z.object({
    max_cost: zod_1.z.number().optional(),
    max_time_ms: zod_1.z.number().optional(),
    max_steps: zod_1.z.number().optional(),
});
exports.RunSchema = zod_1.z.object({
    run_id: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    project_id: zod_1.z.string(),
    policy_profile: zod_1.z.string(),
    created_at: zod_1.z.date(), // Hydration handled by store
    status: zod_1.z.nativeEnum(RunStatus),
    budgets: exports.BudgetSchema.optional(),
});
// 3. Event
exports.EventSchema = zod_1.z.object({
    event_id: zod_1.z.string(),
    run_id: zod_1.z.string(),
    ts: zod_1.z.date(),
    type: zod_1.z.nativeEnum(EventType),
    payload: zod_1.z.record(zod_1.z.any()),
    hash: zod_1.z.string().optional(), // Content hash for ledger integrity
    parent_event_id: zod_1.z.string().optional(), // For causality tracking
});
// 4. Evidence
exports.EvidenceSchema = zod_1.z.object({
    evidence_id: zod_1.z.string(),
    source: zod_1.z.string(),
    retrieved_at: zod_1.z.date(),
    content_hash: zod_1.z.string(),
    snippet: zod_1.z.string(),
    uri: zod_1.z.string().optional(),
    policy_tags: zod_1.z.array(zod_1.z.string()).optional(),
});
// 5. Claim Link (Provenance)
exports.ClaimLinkSchema = zod_1.z.object({
    claim_id: zod_1.z.string(),
    output_id: zod_1.z.string(), // ID of the tool output or model generation
    evidence_ids: zod_1.z.array(zod_1.z.string()),
    confidence: zod_1.z.number().min(0).max(1),
    notes: zod_1.z.string().optional(),
});
