/**
 * HUMINT Debrief Workflow Types
 *
 * Types and schemas for managing source debriefing sessions.
 */

import { z } from 'zod';
import type {
  DebriefType,
  DebriefStatus,
  InformationRating,
  ClassificationLevel,
} from './constants.js';
import type { PolicyLabels, BaseEntity, ProvenanceInfo } from './types.js';
import {
  DebriefTypeSchema,
  DebriefStatusSchema,
  InformationRatingSchema,
  PolicyLabelsSchema,
} from './schemas.js';

// ============================================================================
// Debrief Types
// ============================================================================

/**
 * Location information for debrief
 */
export interface DebriefLocation {
  type: 'SAFE_HOUSE' | 'NEUTRAL' | 'VEHICLE' | 'VIRTUAL' | 'OTHER';
  identifier: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  securityVerified: boolean;
  notes?: string;
}

/**
 * Intelligence item extracted from debrief
 */
export interface IntelligenceItem {
  id: string;
  topic: string;
  content: string;
  informationRating: InformationRating;
  classification: ClassificationLevel;
  requiresCorroboration: boolean;
  corroboratedBy: string[];
  linkedEntities: {
    entityId: string;
    entityType: string;
    relationship: string;
  }[];
  actionability: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' | 'BACKGROUND';
  perishability?: Date;
  disseminationRestrictions: string[];
}

/**
 * Tasking follow-up from debrief
 */
export interface DebriefTasking {
  id: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  deadline?: Date;
  assignedTo?: string;
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
}

/**
 * Security assessment from debrief
 */
export interface SecurityAssessment {
  sourceCompromiseRisk: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  operationalSecurityIssues: string[];
  counterintelligenceIndicators: string[];
  recommendedMitigations: string[];
  evaluatorNotes: string;
}

/**
 * Debrief Session - Main entity for debriefing workflows
 */
export interface DebriefSession extends BaseEntity {
  /** Reference to the source being debriefed */
  sourceId: string;

  /** Source cryptonym for display */
  sourceCryptonym: string;

  /** Handler conducting the debrief */
  handlerId: string;

  /** Type of debrief session */
  debriefType: DebriefType;

  /** Current workflow status */
  status: DebriefStatus;

  /** Scheduled date/time */
  scheduledAt: Date;

  /** Actual start time */
  startedAt?: Date;

  /** Actual end time */
  endedAt?: Date;

  /** Duration in minutes */
  durationMinutes?: number;

  /** Location of the debrief */
  location: DebriefLocation;

  /** Pre-debrief objectives */
  objectives: string[];

  /** Topics covered during debrief */
  topicsCovered: string[];

  /** Raw notes from the session */
  rawNotes: string;

  /** Processed/structured notes */
  processedNotes: string;

  /** Extracted intelligence items */
  intelligenceItems: IntelligenceItem[];

  /** Follow-up taskings generated */
  taskings: DebriefTasking[];

  /** Security assessment */
  securityAssessment?: SecurityAssessment;

  /** Source demeanor observations */
  sourceDemeanor: string;

  /** Source credibility observations */
  credibilityObservations: string;

  /** Payments made during session */
  payments: {
    amount: number;
    currency: string;
    method: string;
    receiptId?: string;
  }[];

  /** Attachments (encrypted references) */
  attachments: {
    id: string;
    type: 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'IMAGE';
    encryptedRef: string;
    size: number;
    checksum: string;
  }[];

  /** Reviewer who approved the debrief */
  reviewerId?: string;

  /** Review notes */
  reviewNotes?: string;

  /** Review timestamp */
  reviewedAt?: Date;

  /** Dissemination tracking */
  dissemination: {
    reportId: string;
    disseminatedAt: Date;
    recipients: string[];
    channel: string;
  }[];

  /** Security classification */
  policyLabels: PolicyLabels;

  /** Provenance chain */
  provenance: ProvenanceInfo[];

  /** Link to previous related debrief */
  previousDebriefId?: string;

  /** Link to next related debrief */
  nextDebriefId?: string;
}

/**
 * Debrief workflow state transition
 */
export interface DebriefStateTransition {
  fromStatus: DebriefStatus;
  toStatus: DebriefStatus;
  timestamp: Date;
  actorId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Debrief report summary for dissemination
 */
export interface DebriefReport {
  id: string;
  debriefId: string;
  sourceId: string;
  sourceCryptonym: string;
  reportDate: Date;
  classification: ClassificationLevel;
  executiveSummary: string;
  keyFindings: string[];
  intelligenceItems: IntelligenceItem[];
  actionableItems: string[];
  recommendedFollowUp: string[];
  reliability: {
    sourceRating: string;
    informationRating: string;
    compositeScore: number;
  };
  policyLabels: PolicyLabels;
  generatedAt: Date;
  generatedBy: string;
}

// ============================================================================
// Debrief Workflow Schemas
// ============================================================================

export const DebriefLocationSchema = z.object({
  type: z.enum(['SAFE_HOUSE', 'NEUTRAL', 'VEHICLE', 'VIRTUAL', 'OTHER']),
  identifier: z.string().min(1),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  securityVerified: z.boolean(),
  notes: z.string().optional(),
});

export const IntelligenceItemSchema = z.object({
  id: z.string().uuid(),
  topic: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  informationRating: InformationRatingSchema,
  classification: z.enum([
    'UNCLASSIFIED',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TOP_SECRET_SCI',
  ]),
  requiresCorroboration: z.boolean(),
  corroboratedBy: z.array(z.string().uuid()),
  linkedEntities: z.array(
    z.object({
      entityId: z.string().uuid(),
      entityType: z.string(),
      relationship: z.string(),
    }),
  ),
  actionability: z.enum(['IMMEDIATE', 'SHORT_TERM', 'LONG_TERM', 'BACKGROUND']),
  perishability: z.coerce.date().optional(),
  disseminationRestrictions: z.array(z.string()),
});

export const DebriefTaskingSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(2000),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  deadline: z.coerce.date().optional(),
  assignedTo: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED']),
});

export const SecurityAssessmentSchema = z.object({
  sourceCompromiseRisk: z.enum([
    'NONE',
    'LOW',
    'MODERATE',
    'HIGH',
    'CRITICAL',
  ]),
  operationalSecurityIssues: z.array(z.string()),
  counterintelligenceIndicators: z.array(z.string()),
  recommendedMitigations: z.array(z.string()),
  evaluatorNotes: z.string(),
});

export const PaymentRecordSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  method: z.string().min(1),
  receiptId: z.string().optional(),
});

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['AUDIO', 'VIDEO', 'DOCUMENT', 'IMAGE']),
  encryptedRef: z.string().min(1),
  size: z.number().int().positive(),
  checksum: z.string().min(1),
});

/**
 * Schema for creating a new debrief session
 */
export const CreateDebriefSchema = z.object({
  sourceId: z.string().uuid(),
  debriefType: DebriefTypeSchema,
  scheduledAt: z.coerce.date(),
  location: DebriefLocationSchema,
  objectives: z.array(z.string().min(1)).min(1),
  policyLabels: PolicyLabelsSchema,
  previousDebriefId: z.string().uuid().optional(),
});

/**
 * Schema for starting a debrief session
 */
export const StartDebriefSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.coerce.date().default(() => new Date()),
  actualLocation: DebriefLocationSchema.optional(),
});

/**
 * Schema for updating an in-progress debrief
 */
export const UpdateDebriefSchema = z.object({
  id: z.string().uuid(),
  topicsCovered: z.array(z.string()).optional(),
  rawNotes: z.string().optional(),
  sourceDemeanor: z.string().optional(),
  credibilityObservations: z.string().optional(),
  payments: z.array(PaymentRecordSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

/**
 * Schema for completing a debrief session
 */
export const CompleteDebriefSchema = z.object({
  id: z.string().uuid(),
  endedAt: z.coerce.date(),
  processedNotes: z.string().min(1),
  intelligenceItems: z.array(IntelligenceItemSchema),
  taskings: z.array(DebriefTaskingSchema),
  securityAssessment: SecurityAssessmentSchema,
});

/**
 * Schema for reviewing/approving a debrief
 */
export const ReviewDebriefSchema = z.object({
  id: z.string().uuid(),
  approved: z.boolean(),
  reviewNotes: z.string().min(1),
  modifications: z
    .object({
      intelligenceItems: z.array(IntelligenceItemSchema).optional(),
      taskings: z.array(DebriefTaskingSchema).optional(),
    })
    .optional(),
});

/**
 * Schema for debrief search criteria
 */
export const DebriefSearchCriteriaSchema = z.object({
  sourceId: z.string().uuid().optional(),
  handlerId: z.string().uuid().optional(),
  debriefTypes: z.array(DebriefTypeSchema).optional(),
  statuses: z.array(DebriefStatusSchema).optional(),
  scheduledAfter: z.coerce.date().optional(),
  scheduledBefore: z.coerce.date().optional(),
  hasIntelligence: z.boolean().optional(),
  hasActionableIntel: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

// ============================================================================
// Workflow State Machine
// ============================================================================

/**
 * Valid state transitions for debrief workflow
 */
export const DEBRIEF_STATE_TRANSITIONS: Record<DebriefStatus, DebriefStatus[]> =
  {
    PLANNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['PENDING_REVIEW', 'CANCELLED'],
    PENDING_REVIEW: ['APPROVED', 'IN_PROGRESS', 'ACTION_REQUIRED'],
    APPROVED: ['DISSEMINATED'],
    DISSEMINATED: [],
    CANCELLED: [],
    ACTION_REQUIRED: ['IN_PROGRESS', 'CANCELLED'],
  };

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  from: DebriefStatus,
  to: DebriefStatus,
): boolean {
  const validTargets = DEBRIEF_STATE_TRANSITIONS[from];
  return validTargets?.includes(to) ?? false;
}

/**
 * Get allowed next states for a given status
 */
export function getAllowedTransitions(status: DebriefStatus): DebriefStatus[] {
  return DEBRIEF_STATE_TRANSITIONS[status] ?? [];
}

// Export inferred types
export type CreateDebriefInput = z.infer<typeof CreateDebriefSchema>;
export type StartDebriefInput = z.infer<typeof StartDebriefSchema>;
export type UpdateDebriefInput = z.infer<typeof UpdateDebriefSchema>;
export type CompleteDebriefInput = z.infer<typeof CompleteDebriefSchema>;
export type ReviewDebriefInput = z.infer<typeof ReviewDebriefSchema>;
export type DebriefSearchInput = z.infer<typeof DebriefSearchCriteriaSchema>;
