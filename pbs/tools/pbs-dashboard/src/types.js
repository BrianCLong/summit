"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportSchema = exports.ruleImpactSchema = exports.summarySchema = void 0;
const zod_1 = require("zod");
exports.summarySchema = zod_1.z.object({
    total_decisions: zod_1.z.number(),
    original_block_rate: zod_1.z.number(),
    new_block_rate: zod_1.z.number(),
    block_rate_delta: zod_1.z.number(),
    original_average_latency_ms: zod_1.z.number(),
    new_average_latency_ms: zod_1.z.number(),
    average_latency_delta_ms: zod_1.z.number(),
    false_negative_canary_catchers: zod_1.z.number(),
});
exports.ruleImpactSchema = zod_1.z.object({
    rule_id: zod_1.z.string(),
    matches: zod_1.z.number(),
    block_escalations: zod_1.z.number(),
    relaxations: zod_1.z.number(),
    resulting_action: zod_1.z.string(),
    average_latency_ms: zod_1.z.number(),
});
exports.reportSchema = zod_1.z.object({
    schema_version: zod_1.z.string(),
    engine_version: zod_1.z.string(),
    deterministic_run_id: zod_1.z.string(),
    policy: zod_1.z.object({
        name: zod_1.z.string(),
        version: zod_1.z.string(),
        digest: zod_1.z.string(),
    }),
    inputs: zod_1.z.object({
        history_digest: zod_1.z.string(),
        total_decisions: zod_1.z.number(),
        source: zod_1.z.string(),
    }),
    summary: exports.summarySchema,
    rule_impacts: zod_1.z.array(exports.ruleImpactSchema),
    signatures: zod_1.z
        .array(zod_1.z.object({
        key_id: zod_1.z.string(),
        algorithm: zod_1.z.string(),
        digest: zod_1.z.string(),
        signature: zod_1.z.string(),
    }))
        .optional(),
});
