"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactFlowMetricsSchema = exports.FactFlowReportSchema = exports.ClaimSchema = exports.TimeRangeSchema = exports.EvidenceItemSchema = void 0;
const zod_1 = require("zod");
exports.EvidenceItemSchema = zod_1.z.object({
    source: zod_1.z.string(),
    url: zod_1.z.string().optional(),
    snippet: zod_1.z.string().optional(),
});
exports.TimeRangeSchema = zod_1.z.object({
    start: zod_1.z.number(),
    end: zod_1.z.number(),
});
exports.ClaimSchema = zod_1.z.object({
    id: zod_1.z.string(),
    text: zod_1.z.string(),
    speaker: zod_1.z.string().optional(),
    time_range: exports.TimeRangeSchema,
    verdict: zod_1.z.enum(["verified", "disputed", "unverified", "needs_review"]),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    evidence: zod_1.z.array(exports.EvidenceItemSchema).optional(),
});
exports.FactFlowReportSchema = zod_1.z.object({
    job_id: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    claims: zod_1.z.array(exports.ClaimSchema),
});
exports.FactFlowMetricsSchema = zod_1.z.object({
    job_id: zod_1.z.string(),
    processing_time_ms: zod_1.z.number(),
    audio_duration_sec: zod_1.z.number(),
    cache_hit: zod_1.z.boolean(),
    claims_count: zod_1.z.number(),
    verified_count: zod_1.z.number(),
    needs_review_count: zod_1.z.number(),
});
