"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryEventSchema = exports.LearningContextSchema = exports.UserFeedbackSchema = exports.ConfidenceReportSchema = exports.ConfidenceFactorSchema = exports.DeduplicationResultSchema = exports.FusionResultSchema = exports.FusionStrategySchema = exports.DataProfileSchema = exports.ColumnProfileSchema = exports.DataQualityDimensionSchema = exports.DiscoveredSourceSchema = exports.DataSourceStatusSchema = exports.DataSourceTypeSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Data Source Discovery Types
// ============================================================================
exports.DataSourceTypeSchema = zod_1.z.enum([
    'database',
    'api',
    'file',
    'stream',
    's3',
    'kafka',
    'webhook',
    'scraper',
]);
exports.DataSourceStatusSchema = zod_1.z.enum([
    'discovered',
    'profiling',
    'ready',
    'ingesting',
    'error',
    'stale',
]);
exports.DiscoveredSourceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    type: exports.DataSourceTypeSchema,
    connectionUri: zod_1.z.string(),
    status: exports.DataSourceStatusSchema,
    discoveredAt: zod_1.z.date(),
    lastScannedAt: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    confidenceScore: zod_1.z.number().min(0).max(1),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    autoIngestEnabled: zod_1.z.boolean().default(false),
});
// ============================================================================
// Data Profiling Types
// ============================================================================
exports.DataQualityDimensionSchema = zod_1.z.enum([
    'completeness',
    'accuracy',
    'consistency',
    'timeliness',
    'validity',
    'uniqueness',
]);
exports.ColumnProfileSchema = zod_1.z.object({
    name: zod_1.z.string(),
    dataType: zod_1.z.string(),
    nullable: zod_1.z.boolean(),
    uniqueCount: zod_1.z.number(),
    nullCount: zod_1.z.number(),
    sampleValues: zod_1.z.array(zod_1.z.unknown()),
    patterns: zod_1.z.array(zod_1.z.string()).optional(),
    semanticType: zod_1.z.string().optional(), // email, phone, ssn, address, etc.
    piiDetected: zod_1.z.boolean().default(false),
    qualityScores: zod_1.z.record(exports.DataQualityDimensionSchema, zod_1.z.number()),
});
exports.DataProfileSchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid(),
    tableName: zod_1.z.string().optional(),
    rowCount: zod_1.z.number(),
    columnCount: zod_1.z.number(),
    columns: zod_1.z.array(exports.ColumnProfileSchema),
    relationships: zod_1.z.array(zod_1.z.object({
        sourceColumn: zod_1.z.string(),
        targetTable: zod_1.z.string(),
        targetColumn: zod_1.z.string(),
        relationshipType: zod_1.z.enum(['foreign_key', 'inferred', 'semantic']),
        confidence: zod_1.z.number(),
    })),
    overallQuality: zod_1.z.number().min(0).max(1),
    profiledAt: zod_1.z.date(),
});
// ============================================================================
// Fusion Types
// ============================================================================
exports.FusionStrategySchema = zod_1.z.enum([
    'exact_match',
    'fuzzy_match',
    'semantic_similarity',
    'rule_based',
    'ml_based',
]);
exports.FusionResultSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceRecords: zod_1.z.array(zod_1.z.object({
        sourceId: zod_1.z.string().uuid(),
        recordId: zod_1.z.string(),
        data: zod_1.z.record(zod_1.z.unknown()),
    })),
    fusedRecord: zod_1.z.record(zod_1.z.unknown()),
    confidenceScore: zod_1.z.number().min(0).max(1),
    strategyUsed: exports.FusionStrategySchema,
    conflictsResolved: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        values: zod_1.z.array(zod_1.z.unknown()),
        resolvedValue: zod_1.z.unknown(),
        resolutionMethod: zod_1.z.string(),
    })),
    lineage: zod_1.z.object({
        createdAt: zod_1.z.date(),
        sources: zod_1.z.array(zod_1.z.string()),
        transformations: zod_1.z.array(zod_1.z.string()),
    }),
});
exports.DeduplicationResultSchema = zod_1.z.object({
    clusterId: zod_1.z.string().uuid(),
    records: zod_1.z.array(zod_1.z.object({
        sourceId: zod_1.z.string(),
        recordId: zod_1.z.string(),
        similarityScore: zod_1.z.number(),
    })),
    canonicalRecord: zod_1.z.record(zod_1.z.unknown()),
    duplicatesRemoved: zod_1.z.number(),
});
// ============================================================================
// Confidence Scoring Types
// ============================================================================
exports.ConfidenceFactorSchema = zod_1.z.object({
    factor: zod_1.z.string(),
    weight: zod_1.z.number(),
    score: zod_1.z.number(),
    explanation: zod_1.z.string(),
});
exports.ConfidenceReportSchema = zod_1.z.object({
    overallScore: zod_1.z.number().min(0).max(1),
    factors: zod_1.z.array(exports.ConfidenceFactorSchema),
    recommendations: zod_1.z.array(zod_1.z.string()),
    verifiableReferences: zod_1.z.array(zod_1.z.object({
        sourceId: zod_1.z.string(),
        sourceType: zod_1.z.string(),
        uri: zod_1.z.string(),
        timestamp: zod_1.z.date(),
    })),
});
// ============================================================================
// Context Persistence Types
// ============================================================================
exports.UserFeedbackSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string(),
    targetType: zod_1.z.enum(['fusion', 'source', 'profile', 'dedup']),
    targetId: zod_1.z.string(),
    feedbackType: zod_1.z.enum(['correct', 'incorrect', 'partial', 'suggestion']),
    correction: zod_1.z.record(zod_1.z.unknown()).optional(),
    comment: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
});
exports.LearningContextSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    fusionRules: zod_1.z.array(zod_1.z.object({
        pattern: zod_1.z.string(),
        action: zod_1.z.string(),
        confidence: zod_1.z.number(),
        learnedFrom: zod_1.z.array(zod_1.z.string()), // feedback IDs
    })),
    corrections: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        wrongValue: zod_1.z.unknown(),
        correctValue: zod_1.z.unknown(),
        occurrences: zod_1.z.number(),
    })),
    userPreferences: zod_1.z.record(zod_1.z.unknown()),
});
// ============================================================================
// Event Types
// ============================================================================
exports.DiscoveryEventSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'source_discovered',
        'source_profiled',
        'fusion_completed',
        'dedup_completed',
        'error_occurred',
        'feedback_received',
    ]),
    payload: zod_1.z.unknown(),
    timestamp: zod_1.z.date(),
    correlationId: zod_1.z.string().uuid(),
});
