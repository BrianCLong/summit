"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCORING_CONFIG = exports.ExplainPairResponseSchema = exports.FeatureContributionSchema = exports.ExplainPairRequestSchema = exports.SplitRequestSchema = exports.MergeRequestSchema = exports.CandidateRequestSchema = exports.EntityRecordSchema = void 0;
const zod_1 = require("zod");
// Entity record schema
exports.EntityRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    name: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()).optional(),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    tenantId: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    // Geographic/temporal signals
    locations: zod_1.z.array(zod_1.z.object({
        lat: zod_1.z.number(),
        lon: zod_1.z.number(),
        timestamp: zod_1.z.string().optional(),
    })).optional(),
    timestamps: zod_1.z.array(zod_1.z.string()).optional(),
    // Device/account signals
    deviceIds: zod_1.z.array(zod_1.z.string()).optional(),
    accountIds: zod_1.z.array(zod_1.z.string()).optional(),
    ipAddresses: zod_1.z.array(zod_1.z.string()).optional(),
});
// Candidate request/response
exports.CandidateRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    entity: exports.EntityRecordSchema,
    population: zod_1.z.array(exports.EntityRecordSchema),
    topK: zod_1.z.number().int().positive().optional(),
    threshold: zod_1.z.number().min(0).max(1).optional(),
    method: zod_1.z.enum(['deterministic', 'probabilistic', 'hybrid']).optional(),
    policyTags: zod_1.z.array(zod_1.z.string()).optional(),
});
// Merge operations
exports.MergeRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    entityIds: zod_1.z.array(zod_1.z.string()).min(2),
    primaryId: zod_1.z.string().optional(),
    actor: zod_1.z.string(),
    reason: zod_1.z.string(),
    policyTags: zod_1.z.array(zod_1.z.string()).optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
// Split operations
exports.SplitRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    entityId: zod_1.z.string(),
    splitGroups: zod_1.z.array(zod_1.z.object({
        attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        deviceIds: zod_1.z.array(zod_1.z.string()).optional(),
        accountIds: zod_1.z.array(zod_1.z.string()).optional(),
    })).min(2),
    actor: zod_1.z.string(),
    reason: zod_1.z.string(),
});
exports.ExplainPairRequestSchema = zod_1.z.object({
    entityA: exports.EntityRecordSchema,
    entityB: exports.EntityRecordSchema,
    method: zod_1.z.enum(['deterministic', 'probabilistic', 'hybrid']).optional(),
    threshold: zod_1.z.number().min(0).max(1).optional(),
});
exports.FeatureContributionSchema = zod_1.z.object({
    feature: zod_1.z.string(),
    value: zod_1.z.union([zod_1.z.number(), zod_1.z.boolean()]),
    weight: zod_1.z.number(),
    contribution: zod_1.z.number(),
    normalizedContribution: zod_1.z.number(),
});
exports.ExplainPairResponseSchema = zod_1.z.object({
    score: zod_1.z.number(),
    confidence: zod_1.z.number(),
    method: zod_1.z.string(),
    threshold: zod_1.z.number(),
    features: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.number(), zod_1.z.boolean()])),
    rationale: zod_1.z.array(zod_1.z.string()),
    featureWeights: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
    featureContributions: zod_1.z.array(exports.FeatureContributionSchema),
});
// Default scoring configuration
exports.DEFAULT_SCORING_CONFIG = {
    weights: {
        nameSimilarity: 0.25,
        typeMatch: 0.15,
        propertyOverlap: 0.10,
        semanticSimilarity: 0.15,
        geographicProximity: 0.10,
        temporalCoOccurrence: 0.10,
        deviceIdMatch: 0.10,
        accountIdMatch: 0.05,
    },
    threshold: 0.7,
    method: 'hybrid',
};
