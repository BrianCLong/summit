import { z } from 'zod';

// ============================================================================
// Data Source Discovery Types
// ============================================================================

export const DataSourceTypeSchema = z.enum([
  'database',
  'api',
  'file',
  'stream',
  's3',
  'kafka',
  'webhook',
  'scraper',
]);
export type DataSourceType = z.infer<typeof DataSourceTypeSchema>;

export const DataSourceStatusSchema = z.enum([
  'discovered',
  'profiling',
  'ready',
  'ingesting',
  'error',
  'stale',
]);
export type DataSourceStatus = z.infer<typeof DataSourceStatusSchema>;

export const DiscoveredSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: DataSourceTypeSchema,
  connectionUri: z.string(),
  status: DataSourceStatusSchema,
  discoveredAt: z.date(),
  lastScannedAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
  confidenceScore: z.number().min(0).max(1),
  tags: z.array(z.string()).default([]),
  autoIngestEnabled: z.boolean().default(false),
});
export type DiscoveredSource = z.infer<typeof DiscoveredSourceSchema>;

// ============================================================================
// Data Profiling Types
// ============================================================================

export const DataQualityDimensionSchema = z.enum([
  'completeness',
  'accuracy',
  'consistency',
  'timeliness',
  'validity',
  'uniqueness',
]);
export type DataQualityDimension = z.infer<typeof DataQualityDimensionSchema>;

export const ColumnProfileSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  nullable: z.boolean(),
  uniqueCount: z.number(),
  nullCount: z.number(),
  sampleValues: z.array(z.unknown()),
  patterns: z.array(z.string()).optional(),
  semanticType: z.string().optional(), // email, phone, ssn, address, etc.
  piiDetected: z.boolean().default(false),
  qualityScores: z.record(DataQualityDimensionSchema, z.number()),
});
export type ColumnProfile = z.infer<typeof ColumnProfileSchema>;

export const DataProfileSchema = z.object({
  sourceId: z.string().uuid(),
  tableName: z.string().optional(),
  rowCount: z.number(),
  columnCount: z.number(),
  columns: z.array(ColumnProfileSchema),
  relationships: z.array(z.object({
    sourceColumn: z.string(),
    targetTable: z.string(),
    targetColumn: z.string(),
    relationshipType: z.enum(['foreign_key', 'inferred', 'semantic']),
    confidence: z.number(),
  })),
  overallQuality: z.number().min(0).max(1),
  profiledAt: z.date(),
});
export type DataProfile = z.infer<typeof DataProfileSchema>;

// ============================================================================
// Fusion Types
// ============================================================================

export const FusionStrategySchema = z.enum([
  'exact_match',
  'fuzzy_match',
  'semantic_similarity',
  'rule_based',
  'ml_based',
]);
export type FusionStrategy = z.infer<typeof FusionStrategySchema>;

export const FusionResultSchema = z.object({
  id: z.string().uuid(),
  sourceRecords: z.array(z.object({
    sourceId: z.string().uuid(),
    recordId: z.string(),
    data: z.record(z.unknown()),
  })),
  fusedRecord: z.record(z.unknown()),
  confidenceScore: z.number().min(0).max(1),
  strategyUsed: FusionStrategySchema,
  conflictsResolved: z.array(z.object({
    field: z.string(),
    values: z.array(z.unknown()),
    resolvedValue: z.unknown(),
    resolutionMethod: z.string(),
  })),
  lineage: z.object({
    createdAt: z.date(),
    sources: z.array(z.string()),
    transformations: z.array(z.string()),
  }),
});
export type FusionResult = z.infer<typeof FusionResultSchema>;

export const DeduplicationResultSchema = z.object({
  clusterId: z.string().uuid(),
  records: z.array(z.object({
    sourceId: z.string(),
    recordId: z.string(),
    similarityScore: z.number(),
  })),
  canonicalRecord: z.record(z.unknown()),
  duplicatesRemoved: z.number(),
});
export type DeduplicationResult = z.infer<typeof DeduplicationResultSchema>;

// ============================================================================
// Confidence Scoring Types
// ============================================================================

export const ConfidenceFactorSchema = z.object({
  factor: z.string(),
  weight: z.number(),
  score: z.number(),
  explanation: z.string(),
});
export type ConfidenceFactor = z.infer<typeof ConfidenceFactorSchema>;

export const ConfidenceReportSchema = z.object({
  overallScore: z.number().min(0).max(1),
  factors: z.array(ConfidenceFactorSchema),
  recommendations: z.array(z.string()),
  verifiableReferences: z.array(z.object({
    sourceId: z.string(),
    sourceType: z.string(),
    uri: z.string(),
    timestamp: z.date(),
  })),
});
export type ConfidenceReport = z.infer<typeof ConfidenceReportSchema>;

// ============================================================================
// Context Persistence Types
// ============================================================================

export const UserFeedbackSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  targetType: z.enum(['fusion', 'source', 'profile', 'dedup']),
  targetId: z.string(),
  feedbackType: z.enum(['correct', 'incorrect', 'partial', 'suggestion']),
  correction: z.record(z.unknown()).optional(),
  comment: z.string().optional(),
  createdAt: z.date(),
});
export type UserFeedback = z.infer<typeof UserFeedbackSchema>;

export const LearningContextSchema = z.object({
  sourceId: z.string(),
  fusionRules: z.array(z.object({
    pattern: z.string(),
    action: z.string(),
    confidence: z.number(),
    learnedFrom: z.array(z.string()), // feedback IDs
  })),
  corrections: z.array(z.object({
    field: z.string(),
    wrongValue: z.unknown(),
    correctValue: z.unknown(),
    occurrences: z.number(),
  })),
  userPreferences: z.record(z.unknown()),
});
export type LearningContext = z.infer<typeof LearningContextSchema>;

// ============================================================================
// Event Types
// ============================================================================

export const DiscoveryEventSchema = z.object({
  type: z.enum([
    'source_discovered',
    'source_profiled',
    'fusion_completed',
    'dedup_completed',
    'error_occurred',
    'feedback_received',
  ]),
  payload: z.unknown(),
  timestamp: z.date(),
  correlationId: z.string().uuid(),
});
export type DiscoveryEvent = z.infer<typeof DiscoveryEventSchema>;
