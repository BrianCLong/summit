"use strict";
/**
 * Type definitions for Policy-Aware Cache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidationEventSchema = exports.ProofBundleSchema = exports.CacheKeyComponentsSchema = exports.PolicyVersionSchema = exports.DataSnapshotSchema = exports.UserABACAttributesSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Zod Schemas for Validation
// ============================================================================
exports.UserABACAttributesSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    roles: zod_1.z.array(zod_1.z.string()),
    clearanceLevel: zod_1.z.string().optional(),
    organizationId: zod_1.z.string().optional(),
    compartments: zod_1.z.array(zod_1.z.string()).optional(),
    customAttributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.DataSnapshotSchema = zod_1.z.object({
    snapshotId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    dataHash: zod_1.z.string(),
    sources: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
exports.PolicyVersionSchema = zod_1.z.object({
    version: zod_1.z.string(),
    digest: zod_1.z.string(),
    effectiveDate: zod_1.z.string().datetime(),
    bundleRevision: zod_1.z.string().optional(),
});
exports.CacheKeyComponentsSchema = zod_1.z.object({
    queryHash: zod_1.z.string(),
    paramsHash: zod_1.z.string(),
    policyVersion: exports.PolicyVersionSchema,
    userAttributes: exports.UserABACAttributesSchema,
    dataSnapshot: exports.DataSnapshotSchema,
});
exports.ProofBundleSchema = zod_1.z.object({
    cacheKey: zod_1.z.string(),
    queryHash: zod_1.z.string(),
    paramsHash: zod_1.z.string(),
    policyDigest: zod_1.z.string(),
    policyVersion: zod_1.z.string(),
    userSnapshot: zod_1.z.object({
        userId: zod_1.z.string(),
        rolesHash: zod_1.z.string(),
        attributesHash: zod_1.z.string(),
    }),
    dataSnapshot: exports.DataSnapshotSchema,
    cachedAt: zod_1.z.string().datetime(),
    retrievedAt: zod_1.z.string().datetime(),
    ttl: zod_1.z.number(),
    signature: zod_1.z.string(),
    provenance: zod_1.z
        .object({
        computedBy: zod_1.z.string(),
        computedAt: zod_1.z.string().datetime(),
        inputSources: zod_1.z.array(zod_1.z.string()),
    })
        .optional(),
});
exports.InvalidationEventSchema = zod_1.z.object({
    type: zod_1.z.enum(['policy_change', 'data_change', 'manual', 'ttl_expired']),
    timestamp: zod_1.z.string().datetime(),
    reason: zod_1.z.string(),
    keyPatterns: zod_1.z.array(zod_1.z.string()),
    initiatedBy: zod_1.z.string(),
    changes: zod_1.z
        .object({
        old: zod_1.z.any(),
        new: zod_1.z.any(),
    })
        .optional(),
});
