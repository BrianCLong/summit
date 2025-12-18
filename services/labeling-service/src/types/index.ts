/**
 * Type definitions for the labeling service
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export enum LabelStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_ADJUDICATION = 'needs_adjudication',
  ADJUDICATED = 'adjudicated',
}

export enum QueueStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export enum UserRole {
  LABELER = 'labeler',
  REVIEWER = 'reviewer',
  ADJUDICATOR = 'adjudicator',
  ADMIN = 'admin',
}

export enum AuditEventType {
  LABEL_CREATED = 'label_created',
  LABEL_REVIEWED = 'label_reviewed',
  LABEL_APPROVED = 'label_approved',
  LABEL_REJECTED = 'label_rejected',
  ADJUDICATION_REQUESTED = 'adjudication_requested',
  ADJUDICATION_COMPLETED = 'adjudication_completed',
  QUEUE_CREATED = 'queue_created',
  QUEUE_ASSIGNED = 'queue_assigned',
  POLICY_CHECK = 'policy_check',
}

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType = 'entity' | 'relation' | 'document' | 'image' | 'other';

// ============================================================================
// Zod Schemas
// ============================================================================

const anyRecord = () => z.record(z.string(), z.any());

// Label Schemas
export const CreateLabelSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(['entity', 'relation', 'document', 'image', 'other']),
  labelType: z.string(), // e.g., 'sentiment', 'category', 'ner_tag'
  labelValue: z.any(), // Can be string, number, array, or object
  confidence: z.number().min(0).max(1).optional(),
  metadata: anyRecord().optional(),
  sourceEvidence: z.array(z.string()).optional(), // Evidence IDs
  reasoning: z.string().optional(),
});

export const LabelSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  entityType: z.enum(['entity', 'relation', 'document', 'image', 'other']),
  labelType: z.string(),
  labelValue: z.any(),
  confidence: z.number().optional(),
  status: z.nativeEnum(LabelStatus),
  metadata: anyRecord().optional(),
  sourceEvidence: z.array(z.string()),
  reasoning: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
  queueId: z.string().optional(),
});

// Review Schemas
export const CreateReviewSchema = z.object({
  labelId: z.string(),
  approved: z.boolean(),
  feedback: z.string().optional(),
  suggestedValue: z.any().optional(),
  reasoning: z.string().optional(),
});

export const ReviewSchema = z.object({
  id: z.string(),
  labelId: z.string(),
  reviewerId: z.string(),
  approved: z.boolean(),
  feedback: z.string().optional(),
  suggestedValue: z.any().optional(),
  reasoning: z.string().optional(),
  createdAt: z.string().datetime(),
  signature: z.string().optional(),
});

// Queue Schemas
export const CreateQueueSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  entityType: z.enum(['entity', 'relation', 'document', 'image', 'other']).optional(),
  labelType: z.string().optional(),
  assignedTo: z.array(z.string()).optional(), // User IDs
  requiredReviews: z.number().min(1).default(2),
  metadata: anyRecord().optional(),
});

export const QueueSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  entityType: z.enum(['entity', 'relation', 'document', 'image', 'other']).optional(),
  labelType: z.string().optional(),
  assignedTo: z.array(z.string()),
  requiredReviews: z.number(),
  status: z.nativeEnum(QueueStatus),
  metadata: anyRecord().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

// Adjudication Schemas
export const CreateAdjudicationSchema = z.object({
  labelId: z.string(),
  conflictingReviews: z.array(z.string()), // Review IDs
  reason: z.string(),
});

export const AdjudicationSchema = z.object({
  id: z.string(),
  labelId: z.string(),
  conflictingReviews: z.array(z.string()),
  reason: z.string(),
  assignedTo: z.string().optional(),
  resolution: z.any().optional(),
  resolutionReasoning: z.string().optional(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  signature: z.string().optional(),
});

// Audit Trail Schemas
export const AuditEventSchema = z.object({
  id: z.string(),
  eventType: z.nativeEnum(AuditEventType),
  userId: z.string(),
  entityId: z.string().optional(),
  labelId: z.string().optional(),
  reviewId: z.string().optional(),
  adjudicationId: z.string().optional(),
  queueId: z.string().optional(),
  beforeState: anyRecord().optional(),
  afterState: anyRecord().optional(),
  reasoning: z.string().optional(),
  metadata: anyRecord().optional(),
  timestamp: z.string().datetime(),
  signature: z.string(), // Cryptographic signature
  signatureAlgorithm: z.string().default('ed25519'),
  publicKey: z.string().optional(),
});

// Inter-Rater Agreement Schemas
export const InterRaterAgreementSchema = z.object({
  labelType: z.string(),
  entityType: z.enum(['entity', 'relation', 'document', 'image', 'other']).optional(),
  raters: z.array(z.string()),
  sampleSize: z.number(),
  cohensKappa: z.number().optional(),
  fleissKappa: z.number().optional(),
  percentAgreement: z.number(),
  confusionMatrix: anyRecord().optional(),
  calculatedAt: z.string().datetime(),
  metadata: anyRecord().optional(),
});

// Decision Ledger Schemas
export const DecisionLedgerEntrySchema = z.object({
  id: z.string(),
  labelId: z.string(),
  entityId: z.string(),
  entityType: z.enum(['entity', 'relation', 'document', 'image', 'other']),
  finalLabel: z.any(),
  createdBy: z.string(),
  reviewedBy: z.array(z.string()),
  adjudicatedBy: z.string().optional(),
  sourceEvidence: z.array(z.string()),
  reasoning: z.string().optional(),
  auditTrail: z.array(z.string()), // Audit event IDs
  timestamp: z.string().datetime(),
  signature: z.string(),
});

export const DecisionLedgerExportSchema = z.object({
  exportId: z.string(),
  entries: z.array(DecisionLedgerEntrySchema),
  metadata: z.object({
    exportedBy: z.string(),
    exportedAt: z.string().datetime(),
    totalEntries: z.number(),
    filters: anyRecord().optional(),
  }),
  signature: z.string(),
  merkleRoot: z.string(),
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type CreateLabel = z.infer<typeof CreateLabelSchema>;
export type Label = z.infer<typeof LabelSchema>;
export type CreateReview = z.infer<typeof CreateReviewSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type CreateQueue = z.infer<typeof CreateQueueSchema>;
export type Queue = z.infer<typeof QueueSchema>;
export type CreateAdjudication = z.infer<typeof CreateAdjudicationSchema>;
export type Adjudication = z.infer<typeof AdjudicationSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type InterRaterAgreement = z.infer<typeof InterRaterAgreementSchema>;
export type DecisionLedgerEntry = z.infer<typeof DecisionLedgerEntrySchema>;
export type DecisionLedgerExport = z.infer<typeof DecisionLedgerExportSchema>;

// Queue statistics
export interface QueueStats {
  queueId: string;
  totalLabels: number;
  pendingLabels: number;
  approvedLabels: number;
  rejectedLabels: number;
  needsAdjudication: number;
  avgTimeToReview: number; // in seconds
  completionRate: number; // percentage
}

// User statistics
export interface UserStats {
  userId: string;
  totalLabelsCreated: number;
  totalReviews: number;
  approvalRate: number; // percentage
  avgReviewTime: number; // in seconds
  agreementScore: number; // inter-rater agreement score
}
