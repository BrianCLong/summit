/**
 * Entity Resolution Service Types
 *
 * Core types for identity clustering, matching, and resolution.
 * Provides a comprehensive type system for cross-source entity resolution.
 */

import { z } from 'zod';

// =============================================================================
// Entity Types Supported by ER
// =============================================================================

export const EntityTypeSchema = z.enum([
  'Person',
  'Organization',
  'Device',
  'Account',
  'Asset',
  'Location',
  'Document',
  'Event',
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

// =============================================================================
// Match Decision Types
// =============================================================================

export const MatchDecisionSchema = z.enum([
  'AUTO_MERGE',
  'CANDIDATE',
  'AUTO_NO_MATCH',
  'MANUAL_MERGE',
  'MANUAL_NO_MATCH',
  'MANUAL_SPLIT',
]);

export type MatchDecision = z.infer<typeof MatchDecisionSchema>;

export const ReviewStatusSchema = z.enum([
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'ESCALATED',
]);

export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const ReviewPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export type ReviewPriority = z.infer<typeof ReviewPrioritySchema>;

// =============================================================================
// Source Record Reference
// =============================================================================

export const SourceRecordRefSchema = z.object({
  sourceId: z.string(),
  sourceSystem: z.string(),
  recordId: z.string(),
  recordType: z.string(),
  ingestedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  hash: z.string().optional(),
});

export type SourceRecordRef = z.infer<typeof SourceRecordRefSchema>;

// =============================================================================
// Feature Evidence
// =============================================================================

export const FeatureTypeSchema = z.enum([
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

export type FeatureType = z.infer<typeof FeatureTypeSchema>;

export const FeatureEvidenceSchema = z.object({
  featureType: FeatureTypeSchema,
  valueA: z.unknown(),
  valueB: z.unknown(),
  similarity: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  matcherUsed: z.string(),
  isDeterministic: z.boolean(),
  explanation: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type FeatureEvidence = z.infer<typeof FeatureEvidenceSchema>;

// =============================================================================
// Match Edge
// =============================================================================

export const MatchEdgeSchema = z.object({
  edgeId: z.string().uuid(),
  nodeAId: z.string().uuid(),
  nodeBId: z.string().uuid(),
  overallScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  features: z.array(FeatureEvidenceSchema),
  decision: MatchDecisionSchema,
  decisionReason: z.string(),
  matcherVersion: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
  reviewNotes: z.string().optional(),
});

export type MatchEdge = z.infer<typeof MatchEdgeSchema>;

// =============================================================================
// Identity Node
// =============================================================================

export const IdentityNodeSchema = z.object({
  nodeId: z.string().uuid(),
  clusterId: z.string().uuid().nullable(),
  entityType: EntityTypeSchema,
  sourceRef: SourceRecordRefSchema,
  attributes: z.record(z.unknown()),
  normalizedAttributes: z.record(z.string()),
  featureVector: z.array(z.number()).optional(),
  confidence: z.number().min(0).max(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
});

export type IdentityNode = z.infer<typeof IdentityNodeSchema>;

// =============================================================================
// Identity Cluster
// =============================================================================

export const ClusterMergeHistorySchema = z.object({
  mergeId: z.string().uuid(),
  fromClusterId: z.string().uuid(),
  toClusterId: z.string().uuid(),
  nodeIds: z.array(z.string().uuid()),
  reason: z.string(),
  decision: MatchDecisionSchema,
  decidedBy: z.string(),
  decidedAt: z.string().datetime(),
  revertible: z.boolean(),
  revertedAt: z.string().datetime().optional(),
  revertedBy: z.string().optional(),
  revertReason: z.string().optional(),
});

export type ClusterMergeHistory = z.infer<typeof ClusterMergeHistorySchema>;

export const CanonicalAttributeSchema = z.object({
  attribute: z.string(),
  value: z.unknown(),
  confidence: z.number().min(0).max(1),
  sourceNodeId: z.string().uuid(),
  conflictingValues: z.array(z.object({
    value: z.unknown(),
    nodeId: z.string().uuid(),
    confidence: z.number().min(0).max(1),
  })).optional(),
  resolutionMethod: z.string(),
});

export type CanonicalAttribute = z.infer<typeof CanonicalAttributeSchema>;

export const IdentityClusterSchema = z.object({
  clusterId: z.string().uuid(),
  tenantId: z.string(),
  entityType: EntityTypeSchema,
  nodeIds: z.array(z.string().uuid()),
  primaryNodeId: z.string().uuid(),
  canonicalAttributes: z.array(CanonicalAttributeSchema),
  edges: z.array(MatchEdgeSchema),
  cohesionScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  mergeHistory: z.array(ClusterMergeHistorySchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  locked: z.boolean().default(false),
  lockedBy: z.string().optional(),
  lockedAt: z.string().datetime().optional(),
  lockedReason: z.string().optional(),
});

export type IdentityCluster = z.infer<typeof IdentityClusterSchema>;

// =============================================================================
// Review Queue Item
// =============================================================================

export const ReviewQueueItemSchema = z.object({
  reviewId: z.string().uuid(),
  tenantId: z.string(),
  entityType: EntityTypeSchema,
  nodeAId: z.string().uuid(),
  nodeBId: z.string().uuid(),
  nodeASnapshot: z.record(z.unknown()),
  nodeBSnapshot: z.record(z.unknown()),
  matchScore: z.number().min(0).max(1),
  features: z.array(FeatureEvidenceSchema),
  status: ReviewStatusSchema,
  priority: ReviewPrioritySchema,
  assignedTo: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  decision: MatchDecisionSchema.optional(),
  decidedBy: z.string().optional(),
  decidedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  conflictingAttributes: z.array(z.string()),
  sharedRelationships: z.number().int().nonnegative(),
});

export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;

// =============================================================================
// Resolution Thresholds
// =============================================================================

export const ResolutionThresholdsSchema = z.object({
  entityType: EntityTypeSchema,
  autoMergeThreshold: z.number().min(0).max(1),
  candidateThreshold: z.number().min(0).max(1),
  autoNoMatchThreshold: z.number().min(0).max(1),
  featureWeights: z.record(FeatureTypeSchema, z.number().min(0).max(1)),
  deterministicFeatures: z.array(FeatureTypeSchema),
  requiredFeatures: z.array(FeatureTypeSchema),
  version: z.string(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
});

export type ResolutionThresholds = z.infer<typeof ResolutionThresholdsSchema>;

// =============================================================================
// Match Request/Response
// =============================================================================

export const ResolveNowRequestSchema = z.object({
  tenantId: z.string(),
  recordRef: SourceRecordRefSchema.optional(),
  attributes: z.record(z.unknown()),
  entityType: EntityTypeSchema,
  options: z.object({
    includeRationale: z.boolean().default(true),
    maxCandidates: z.number().int().positive().default(10),
    thresholdOverride: z.number().min(0).max(1).optional(),
  }).optional(),
});

export type ResolveNowRequest = z.infer<typeof ResolveNowRequestSchema>;

export const ResolveNowResponseSchema = z.object({
  requestId: z.string().uuid(),
  tenantId: z.string(),
  entityType: EntityTypeSchema,
  clusterId: z.string().uuid().nullable(),
  isNewCluster: z.boolean(),
  matchedNodeId: z.string().uuid().nullable(),
  candidates: z.array(z.object({
    nodeId: z.string().uuid(),
    clusterId: z.string().uuid(),
    score: z.number().min(0).max(1),
    decision: MatchDecisionSchema,
    features: z.array(FeatureEvidenceSchema),
  })),
  rationale: z.object({
    summary: z.string(),
    topFeatures: z.array(FeatureEvidenceSchema),
    decisionPath: z.string(),
    matcherVersion: z.string(),
  }).optional(),
  processingTimeMs: z.number(),
  timestamp: z.string().datetime(),
});

export type ResolveNowResponse = z.infer<typeof ResolveNowResponseSchema>;

// =============================================================================
// Batch Processing
// =============================================================================

export const BatchJobStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'PAUSED',
]);

export type BatchJobStatus = z.infer<typeof BatchJobStatusSchema>;

export const BatchJobSchema = z.object({
  jobId: z.string().uuid(),
  tenantId: z.string(),
  entityType: EntityTypeSchema,
  datasetRef: z.string(),
  status: BatchJobStatusSchema,
  totalRecords: z.number().int().nonnegative(),
  processedRecords: z.number().int().nonnegative(),
  mergedRecords: z.number().int().nonnegative(),
  newClusters: z.number().int().nonnegative(),
  reviewRequired: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  errorDetails: z.array(z.object({
    recordId: z.string(),
    error: z.string(),
    timestamp: z.string().datetime(),
  })).optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  estimatedCompletion: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  matcherVersion: z.string(),
  thresholds: ResolutionThresholdsSchema,
});

export type BatchJob = z.infer<typeof BatchJobSchema>;

export const BatchResultSchema = z.object({
  jobId: z.string().uuid(),
  recordId: z.string(),
  nodeId: z.string().uuid(),
  clusterId: z.string().uuid().nullable(),
  decision: MatchDecisionSchema,
  score: z.number().min(0).max(1).nullable(),
  matchedWithNodeId: z.string().uuid().nullable(),
  reviewId: z.string().uuid().nullable(),
  processingTimeMs: z.number(),
  timestamp: z.string().datetime(),
});

export type BatchResult = z.infer<typeof BatchResultSchema>;

// =============================================================================
// Explainability
// =============================================================================

export const MatchExplanationSchema = z.object({
  explanationId: z.string().uuid(),
  nodeAId: z.string().uuid(),
  nodeBId: z.string().uuid(),
  clusterId: z.string().uuid().optional(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  features: z.array(z.object({
    featureType: FeatureTypeSchema,
    description: z.string(),
    valueA: z.string(),
    valueB: z.string(),
    similarity: z.number().min(0).max(1),
    weight: z.number().min(0).max(1),
    contribution: z.number(),
    isDeterministic: z.boolean(),
    humanReadable: z.string(),
  })),
  decisionPath: z.array(z.object({
    step: z.number().int().positive(),
    description: z.string(),
    result: z.string(),
    impact: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
  })),
  alternativeDecisions: z.array(z.object({
    decision: MatchDecisionSchema,
    probability: z.number().min(0).max(1),
    reason: z.string(),
  })),
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    description: z.string(),
  })),
  generatedAt: z.string().datetime(),
  matcherVersion: z.string(),
});

export type MatchExplanation = z.infer<typeof MatchExplanationSchema>;

// =============================================================================
// Events
// =============================================================================

export const EREventTypeSchema = z.enum([
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

export type EREventType = z.infer<typeof EREventTypeSchema>;

export const EREventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: EREventTypeSchema,
  tenantId: z.string(),
  entityType: EntityTypeSchema,
  clusterId: z.string().uuid().optional(),
  nodeIds: z.array(z.string().uuid()).optional(),
  payload: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
});

export type EREvent = z.infer<typeof EREventSchema>;

// =============================================================================
// Metrics
// =============================================================================

export const ERMetricsSchema = z.object({
  entityType: EntityTypeSchema,
  totalClusters: z.number().int().nonnegative(),
  totalNodes: z.number().int().nonnegative(),
  avgClusterSize: z.number(),
  totalMatchDecisions: z.number().int().nonnegative(),
  autoMergeCount: z.number().int().nonnegative(),
  autoNoMatchCount: z.number().int().nonnegative(),
  manualReviewCount: z.number().int().nonnegative(),
  pendingReviews: z.number().int().nonnegative(),
  avgMatchScore: z.number().min(0).max(1),
  avgProcessingTimeMs: z.number(),
  precision: z.number().min(0).max(1).optional(),
  recall: z.number().min(0).max(1).optional(),
  f1Score: z.number().min(0).max(1).optional(),
  matcherVersion: z.string(),
  lastUpdated: z.string().datetime(),
});

export type ERMetrics = z.infer<typeof ERMetricsSchema>;
