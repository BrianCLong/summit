"use strict";
/**
 * Entity Resolution Service Types
 *
 * Core types for identity clustering, matching, and resolution.
 * Provides a comprehensive type system for cross-source entity resolution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERMetricsSchema = exports.EREventSchema = exports.EREventTypeSchema = exports.MatchExplanationSchema = exports.BatchResultSchema = exports.BatchJobSchema = exports.BatchJobStatusSchema = exports.ResolveNowResponseSchema = exports.ResolveNowRequestSchema = exports.ResolutionThresholdsSchema = exports.ReviewQueueItemSchema = exports.IdentityClusterSchema = exports.CanonicalAttributeSchema = exports.ClusterMergeHistorySchema = exports.IdentityNodeSchema = exports.MatchEdgeSchema = exports.FeatureEvidenceSchema = exports.FeatureTypeSchema = exports.SourceRecordRefSchema = exports.ReviewPrioritySchema = exports.ReviewStatusSchema = exports.MatchDecisionSchema = exports.EntityTypeSchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// Entity Types Supported by ER
// =============================================================================
exports.EntityTypeSchema = zod_1.z.enum([
    'Person',
    'Organization',
    'Device',
    'Account',
    'Asset',
    'Location',
    'Document',
    'Event',
]);
// =============================================================================
// Match Decision Types
// =============================================================================
exports.MatchDecisionSchema = zod_1.z.enum([
    'AUTO_MERGE',
    'CANDIDATE',
    'AUTO_NO_MATCH',
    'MANUAL_MERGE',
    'MANUAL_NO_MATCH',
    'MANUAL_SPLIT',
]);
exports.ReviewStatusSchema = zod_1.z.enum([
    'PENDING',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'ESCALATED',
]);
exports.ReviewPrioritySchema = zod_1.z.enum([
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
]);
// =============================================================================
// Source Record Reference
// =============================================================================
exports.SourceRecordRefSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    sourceSystem: zod_1.z.string(),
    recordId: zod_1.z.string(),
    recordType: zod_1.z.string(),
    ingestedAt: zod_1.z.string().datetime(),
    confidence: zod_1.z.number().min(0).max(1),
    hash: zod_1.z.string().optional(),
});
// =============================================================================
// Feature Evidence
// =============================================================================
exports.FeatureTypeSchema = zod_1.z.enum([
    // Deterministic features
    'NATIONAL_ID',
    'PASSPORT_NUMBER',
    'TAX_ID',
    'SSN',
    'DRIVER_LICENSE',
    'EMAIL',
    'PHONE',
    'DEVICE_ID',
    'IP_ADDRESS',
    'ACCOUNT_NUMBER',
    'LEI',
    'DUNS',
    'REGISTRATION_NUMBER',
    // Probabilistic features
    'NAME',
    'FULL_NAME',
    'FIRST_NAME',
    'LAST_NAME',
    'DATE_OF_BIRTH',
    'ADDRESS',
    'CITY',
    'COUNTRY',
    'ORGANIZATION_NAME',
    'JOB_TITLE',
    'GENDER',
    'NATIONALITY',
    'BIOMETRIC_FACE',
    'BIOMETRIC_FINGERPRINT',
    'BIOMETRIC_VOICE',
    // Behavioral features
    'TEMPORAL_PATTERN',
    'LOCATION_PATTERN',
    'NETWORK_OVERLAP',
    'COMMUNICATION_PATTERN',
    'TRANSACTION_PATTERN',
]);
exports.FeatureEvidenceSchema = zod_1.z.object({
    featureType: exports.FeatureTypeSchema,
    valueA: zod_1.z.unknown(),
    valueB: zod_1.z.unknown(),
    similarity: zod_1.z.number().min(0).max(1),
    weight: zod_1.z.number().min(0).max(1),
    matcherUsed: zod_1.z.string(),
    isDeterministic: zod_1.z.boolean(),
    explanation: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// =============================================================================
// Match Edge
// =============================================================================
exports.MatchEdgeSchema = zod_1.z.object({
    edgeId: zod_1.z.string().uuid(),
    nodeAId: zod_1.z.string().uuid(),
    nodeBId: zod_1.z.string().uuid(),
    overallScore: zod_1.z.number().min(0).max(1),
    confidence: zod_1.z.number().min(0).max(1),
    features: zod_1.z.array(exports.FeatureEvidenceSchema),
    decision: exports.MatchDecisionSchema,
    decisionReason: zod_1.z.string(),
    matcherVersion: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime().optional(),
    reviewedBy: zod_1.z.string().optional(),
    reviewedAt: zod_1.z.string().datetime().optional(),
    reviewNotes: zod_1.z.string().optional(),
});
// =============================================================================
// Identity Node
// =============================================================================
exports.IdentityNodeSchema = zod_1.z.object({
    nodeId: zod_1.z.string().uuid(),
    clusterId: zod_1.z.string().uuid().nullable(),
    entityType: exports.EntityTypeSchema,
    sourceRef: exports.SourceRecordRefSchema,
    attributes: zod_1.z.record(zod_1.z.unknown()),
    normalizedAttributes: zod_1.z.record(zod_1.z.string()),
    featureVector: zod_1.z.array(zod_1.z.number()).optional(),
    confidence: zod_1.z.number().min(0).max(1),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    version: zod_1.z.number().int().positive(),
});
// =============================================================================
// Identity Cluster
// =============================================================================
exports.ClusterMergeHistorySchema = zod_1.z.object({
    mergeId: zod_1.z.string().uuid(),
    fromClusterId: zod_1.z.string().uuid(),
    toClusterId: zod_1.z.string().uuid(),
    nodeIds: zod_1.z.array(zod_1.z.string().uuid()),
    reason: zod_1.z.string(),
    decision: exports.MatchDecisionSchema,
    decidedBy: zod_1.z.string(),
    decidedAt: zod_1.z.string().datetime(),
    revertible: zod_1.z.boolean(),
    revertedAt: zod_1.z.string().datetime().optional(),
    revertedBy: zod_1.z.string().optional(),
    revertReason: zod_1.z.string().optional(),
});
exports.CanonicalAttributeSchema = zod_1.z.object({
    attribute: zod_1.z.string(),
    value: zod_1.z.unknown(),
    confidence: zod_1.z.number().min(0).max(1),
    sourceNodeId: zod_1.z.string().uuid(),
    conflictingValues: zod_1.z.array(zod_1.z.object({
        value: zod_1.z.unknown(),
        nodeId: zod_1.z.string().uuid(),
        confidence: zod_1.z.number().min(0).max(1),
    })).optional(),
    resolutionMethod: zod_1.z.string(),
});
exports.IdentityClusterSchema = zod_1.z.object({
    clusterId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string(),
    entityType: exports.EntityTypeSchema,
    nodeIds: zod_1.z.array(zod_1.z.string().uuid()),
    primaryNodeId: zod_1.z.string().uuid(),
    canonicalAttributes: zod_1.z.array(exports.CanonicalAttributeSchema),
    edges: zod_1.z.array(exports.MatchEdgeSchema),
    cohesionScore: zod_1.z.number().min(0).max(1),
    confidence: zod_1.z.number().min(0).max(1),
    mergeHistory: zod_1.z.array(exports.ClusterMergeHistorySchema),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    version: zod_1.z.number().int().positive(),
    locked: zod_1.z.boolean().default(false),
    lockedBy: zod_1.z.string().optional(),
    lockedAt: zod_1.z.string().datetime().optional(),
    lockedReason: zod_1.z.string().optional(),
});
// =============================================================================
// Review Queue Item
// =============================================================================
exports.ReviewQueueItemSchema = zod_1.z.object({
    reviewId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string(),
    entityType: exports.EntityTypeSchema,
    nodeAId: zod_1.z.string().uuid(),
    nodeBId: zod_1.z.string().uuid(),
    nodeASnapshot: zod_1.z.record(zod_1.z.unknown()),
    nodeBSnapshot: zod_1.z.record(zod_1.z.unknown()),
    matchScore: zod_1.z.number().min(0).max(1),
    features: zod_1.z.array(exports.FeatureEvidenceSchema),
    status: exports.ReviewStatusSchema,
    priority: exports.ReviewPrioritySchema,
    assignedTo: zod_1.z.string().optional(),
    dueAt: zod_1.z.string().datetime().optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    decision: exports.MatchDecisionSchema.optional(),
    decidedBy: zod_1.z.string().optional(),
    decidedAt: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional(),
    conflictingAttributes: zod_1.z.array(zod_1.z.string()),
    sharedRelationships: zod_1.z.number().int().nonnegative(),
});
// =============================================================================
// Resolution Thresholds
// =============================================================================
exports.ResolutionThresholdsSchema = zod_1.z.object({
    entityType: exports.EntityTypeSchema,
    autoMergeThreshold: zod_1.z.number().min(0).max(1),
    candidateThreshold: zod_1.z.number().min(0).max(1),
    autoNoMatchThreshold: zod_1.z.number().min(0).max(1),
    featureWeights: zod_1.z.record(exports.FeatureTypeSchema, zod_1.z.number().min(0).max(1)),
    deterministicFeatures: zod_1.z.array(exports.FeatureTypeSchema),
    requiredFeatures: zod_1.z.array(exports.FeatureTypeSchema),
    version: zod_1.z.string(),
    effectiveFrom: zod_1.z.string().datetime(),
    effectiveTo: zod_1.z.string().datetime().optional(),
});
// =============================================================================
// Match Request/Response
// =============================================================================
exports.ResolveNowRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    recordRef: exports.SourceRecordRefSchema.optional(),
    attributes: zod_1.z.record(zod_1.z.unknown()),
    entityType: exports.EntityTypeSchema,
    options: zod_1.z.object({
        includeRationale: zod_1.z.boolean().default(true),
        maxCandidates: zod_1.z.number().int().positive().default(10),
        thresholdOverride: zod_1.z.number().min(0).max(1).optional(),
    }).optional(),
});
exports.ResolveNowResponseSchema = zod_1.z.object({
    requestId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string(),
    entityType: exports.EntityTypeSchema,
    clusterId: zod_1.z.string().uuid().nullable(),
    isNewCluster: zod_1.z.boolean(),
    matchedNodeId: zod_1.z.string().uuid().nullable(),
    candidates: zod_1.z.array(zod_1.z.object({
        nodeId: zod_1.z.string().uuid(),
        clusterId: zod_1.z.string().uuid(),
        score: zod_1.z.number().min(0).max(1),
        decision: exports.MatchDecisionSchema,
        features: zod_1.z.array(exports.FeatureEvidenceSchema),
    })),
    rationale: zod_1.z.object({
        summary: zod_1.z.string(),
        topFeatures: zod_1.z.array(exports.FeatureEvidenceSchema),
        decisionPath: zod_1.z.string(),
        matcherVersion: zod_1.z.string(),
    }).optional(),
    processingTimeMs: zod_1.z.number(),
    timestamp: zod_1.z.string().datetime(),
});
// =============================================================================
// Batch Processing
// =============================================================================
exports.BatchJobStatusSchema = zod_1.z.enum([
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'PAUSED',
]);
exports.BatchJobSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string(),
    entityType: exports.EntityTypeSchema,
    datasetRef: zod_1.z.string(),
    status: exports.BatchJobStatusSchema,
    totalRecords: zod_1.z.number().int().nonnegative(),
    processedRecords: zod_1.z.number().int().nonnegative(),
    mergedRecords: zod_1.z.number().int().nonnegative(),
    newClusters: zod_1.z.number().int().nonnegative(),
    reviewRequired: zod_1.z.number().int().nonnegative(),
    errors: zod_1.z.number().int().nonnegative(),
    errorDetails: zod_1.z.array(zod_1.z.object({
        recordId: zod_1.z.string(),
        error: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
    })).optional(),
    startedAt: zod_1.z.string().datetime().optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    estimatedCompletion: zod_1.z.string().datetime().optional(),
    createdAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.string(),
    matcherVersion: zod_1.z.string(),
    thresholds: exports.ResolutionThresholdsSchema,
});
exports.BatchResultSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    recordId: zod_1.z.string(),
    nodeId: zod_1.z.string().uuid(),
    clusterId: zod_1.z.string().uuid().nullable(),
    decision: exports.MatchDecisionSchema,
    score: zod_1.z.number().min(0).max(1).nullable(),
    matchedWithNodeId: zod_1.z.string().uuid().nullable(),
    reviewId: zod_1.z.string().uuid().nullable(),
    processingTimeMs: zod_1.z.number(),
    timestamp: zod_1.z.string().datetime(),
});
// =============================================================================
// Explainability
// =============================================================================
exports.MatchExplanationSchema = zod_1.z.object({
    explanationId: zod_1.z.string().uuid(),
    nodeAId: zod_1.z.string().uuid(),
    nodeBId: zod_1.z.string().uuid(),
    clusterId: zod_1.z.string().uuid().optional(),
    summary: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    features: zod_1.z.array(zod_1.z.object({
        featureType: exports.FeatureTypeSchema,
        description: zod_1.z.string(),
        valueA: zod_1.z.string(),
        valueB: zod_1.z.string(),
        similarity: zod_1.z.number().min(0).max(1),
        weight: zod_1.z.number().min(0).max(1),
        contribution: zod_1.z.number(),
        isDeterministic: zod_1.z.boolean(),
        humanReadable: zod_1.z.string(),
    })),
    decisionPath: zod_1.z.array(zod_1.z.object({
        step: zod_1.z.number().int().positive(),
        description: zod_1.z.string(),
        result: zod_1.z.string(),
        impact: zod_1.z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
    })),
    alternativeDecisions: zod_1.z.array(zod_1.z.object({
        decision: exports.MatchDecisionSchema,
        probability: zod_1.z.number().min(0).max(1),
        reason: zod_1.z.string(),
    })),
    riskFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
        description: zod_1.z.string(),
    })),
    generatedAt: zod_1.z.string().datetime(),
    matcherVersion: zod_1.z.string(),
});
// =============================================================================
// Events
// =============================================================================
exports.EREventTypeSchema = zod_1.z.enum([
    'CLUSTER_CREATED',
    'CLUSTER_MERGED',
    'CLUSTER_SPLIT',
    'NODE_ADDED',
    'NODE_REMOVED',
    'MATCH_DECISION',
    'REVIEW_REQUIRED',
    'REVIEW_COMPLETED',
    'BATCH_STARTED',
    'BATCH_COMPLETED',
    'BATCH_FAILED',
    'THRESHOLDS_UPDATED',
]);
exports.EREventSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    eventType: exports.EREventTypeSchema,
    tenantId: zod_1.z.string(),
    entityType: exports.EntityTypeSchema,
    clusterId: zod_1.z.string().uuid().optional(),
    nodeIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    payload: zod_1.z.record(zod_1.z.unknown()),
    timestamp: zod_1.z.string().datetime(),
    source: zod_1.z.string(),
    correlationId: zod_1.z.string().uuid().optional(),
});
// =============================================================================
// Metrics
// =============================================================================
exports.ERMetricsSchema = zod_1.z.object({
    entityType: exports.EntityTypeSchema,
    totalClusters: zod_1.z.number().int().nonnegative(),
    totalNodes: zod_1.z.number().int().nonnegative(),
    avgClusterSize: zod_1.z.number(),
    totalMatchDecisions: zod_1.z.number().int().nonnegative(),
    autoMergeCount: zod_1.z.number().int().nonnegative(),
    autoNoMatchCount: zod_1.z.number().int().nonnegative(),
    manualReviewCount: zod_1.z.number().int().nonnegative(),
    pendingReviews: zod_1.z.number().int().nonnegative(),
    avgMatchScore: zod_1.z.number().min(0).max(1),
    avgProcessingTimeMs: zod_1.z.number(),
    precision: zod_1.z.number().min(0).max(1).optional(),
    recall: zod_1.z.number().min(0).max(1).optional(),
    f1Score: zod_1.z.number().min(0).max(1).optional(),
    matcherVersion: zod_1.z.string(),
    lastUpdated: zod_1.z.string().datetime(),
});
