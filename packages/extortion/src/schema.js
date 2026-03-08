"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PressureScoreSchema = exports.ExtortionNoteAnalysisSchema = exports.ExposureFindingSchema = exports.LeakSiteRecordSchema = exports.TacticSchema = void 0;
const zod_1 = require("zod");
exports.TacticSchema = zod_1.z.enum([
    'SURVEILLANCE_CLAIM',
    'TIME_PRESSURE',
    'LEGAL_LIABILITY_FRAMING',
    'PUBLIC_SHAMING',
    'DATA_DISCLOSURE_THREAT',
    'DOWNTIME_EMPHASIS',
]);
exports.LeakSiteRecordSchema = zod_1.z.object({
    evidence_id: zod_1.z.string(),
    victim_name: zod_1.z.string(),
    country: zod_1.z.string().optional(),
    sector: zod_1.z.string().optional(),
    source: zod_1.z.string(),
    first_seen_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataset_tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.ExposureFindingSchema = zod_1.z.object({
    evidence_id: zod_1.z.string(),
    finding_type: zod_1.z.string(),
    description: zod_1.z.string(),
    severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    affected_asset: zod_1.z.string(),
});
exports.ExtortionNoteAnalysisSchema = zod_1.z.object({
    evidence_id: zod_1.z.string(),
    tactics: zod_1.z.array(exports.TacticSchema),
    confidence: zod_1.z.number().min(0).max(1),
    summary: zod_1.z.string(),
});
exports.PressureScoreSchema = zod_1.z.object({
    overall_score: zod_1.z.number().min(0).max(100),
    vectors: zod_1.z.object({
        legal_regulatory: zod_1.z.number().min(0).max(10),
        reputation: zod_1.z.number().min(0).max(10),
        operational: zod_1.z.number().min(0).max(10),
        coercion: zod_1.z.number().min(0).max(10),
    }),
    explain: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
});
