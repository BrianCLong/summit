"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceEventSchema = exports.PlanIRSchema = exports.PlanStepSchema = void 0;
const zod_1 = require("zod");
exports.PlanStepSchema = zod_1.z.object({
    step_id: zod_1.z.string(),
    name: zod_1.z.string(),
    tool_name: zod_1.z.string().optional(),
    args_schema_ref: zod_1.z.string().optional(),
    preconditions: zod_1.z.array(zod_1.z.string()),
    postconditions: zod_1.z.array(zod_1.z.string()),
    permissions: zod_1.z.array(zod_1.z.string()),
    cost_bounds: zod_1.z
        .object({
        max_cost_usd: zod_1.z.number().nonnegative().optional(),
        max_tokens: zod_1.z.number().int().nonnegative().optional(),
    })
        .optional(),
    retry_policy: zod_1.z
        .object({
        max_retries: zod_1.z.number().int().nonnegative().optional(),
        backoff_ms: zod_1.z.number().int().nonnegative().optional(),
    })
        .optional(),
});
exports.PlanIRSchema = zod_1.z.object({
    plan_id: zod_1.z.string(),
    run_id: zod_1.z.string(),
    goal: zod_1.z.string(),
    steps: zod_1.z.array(exports.PlanStepSchema),
});
exports.TraceEventSchema = zod_1.z.object({
    type: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    run_id: zod_1.z.string(),
    plan_id: zod_1.z.string().optional(),
    chain_id: zod_1.z.string().optional(),
    step_id: zod_1.z.string().optional(),
    tool_name: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.unknown()).optional(),
});
