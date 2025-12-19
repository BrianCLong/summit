/**
 * Entity Resolution Service - Domain Models
 *
 * Stack: TypeScript (detected from repo structure)
 * Location: services/entity-resolution/src/domain/
 *
 * This module defines schema-agnostic entity records for resolution.
 */

/**
 * Generic entity record interface - schema-agnostic to support
 * entities from various source systems
 */
export interface EntityRecord {
  /** Internal unique identifier */
  id: string;

  /** Entity type classification (e.g., "Person", "Organization", "Account") */
  entityType: string;

  /** Flexible attributes map to support any schema */
  attributes: Record<string, any>;

  /** Optional: Source system lineage */
  sourceSystem?: string;

  /** Optional: External source ID */
  sourceId?: string;

  /** ISO timestamp of record creation */
  createdAt?: string;

  /** ISO timestamp of last update */
  updatedAt?: string;
}

/**
 * Normalized feature vector for pairwise entity comparison
 * All scores are normalized to 0-1 range
 */
export interface FeatureVector {
  /** Name similarity score (0-1) */
  nameSimilarity?: number;

  /** Email similarity score (0-1) */
  emailSimilarity?: number;

  /** Organization/employer similarity score (0-1) */
  orgSimilarity?: number;

  /** Geographic proximity in kilometers (null if not applicable) */
  geoProximityKm?: number | null;

  /** Temporal overlap score for time periods (0-1) */
  temporalOverlapScore?: number;

  /** Count of shared identifiers (phone, SSN, etc.) */
  sharedIdentifiersCount?: number;

  /** Extensibility: custom features */
  customFeatures?: Record<string, number>;
}

/**
 * Match outcome classification
 */
export type MatchOutcome = 'MERGE' | 'REVIEW' | 'NO_MATCH';

/**
 * Feature contribution to the overall match score
 * Provides explainability for each feature
 */
export interface FeatureContribution {
  /** Feature name */
  feature: string;

  /** Feature value (raw) */
  value: number | null;

  /** Weight assigned to this feature */
  weight: number;

  /** Signed contribution to final score (value * weight) */
  contribution: number;

  /** Human-readable explanation */
  rationale: string;
}

/**
 * Match decision with full explainability
 */
export interface MatchDecision {
  /** ID of first record */
  recordIdA: string;

  /** ID of second record */
  recordIdB: string;

  /** Overall match score (0-1) */
  matchScore: number;

  /** Recommended action */
  outcome: MatchOutcome;

  /** Explainability data */
  explanation: {
    /** One-line summary of decision */
    summary: string;

    /** Detailed feature contributions */
    featureContributions: FeatureContribution[];
  };

  /** ISO timestamp of decision */
  decidedAt: string;

  /** Actor who made decision: 'er-engine' or user ID */
  decidedBy: string;

  /** Optional: Decision ID for audit trail */
  id?: string;
}

/**
 * Merge operation outcome
 */
export type MergeOutcome = 'APPLIED' | 'REJECTED' | 'PENDING';

/**
 * Merge operation record for audit trail
 */
export interface MergeOperation {
  /** Unique merge operation ID */
  mergeId: string;

  /** ID of the surviving (primary) record */
  primaryId: string;

  /** ID of the record merged into primary */
  secondaryId: string;

  /** Merge operation status */
  outcome: MergeOutcome;

  /** Actor who triggered the merge: user ID or 'auto' */
  triggeredBy: string;

  /** ISO timestamp of merge */
  triggeredAt: string;

  /** Reason for merge */
  reason: string;

  /** Optional: Reference to MatchDecision that led to this merge */
  decisionContext?: MatchDecision;

  /** Pre-merge snapshot of secondary record (for split/undo) */
  preMergeSnapshot?: {
    secondaryRecord: EntityRecord;
    primaryRecord: EntityRecord;
  };
}

/**
 * Merged entity result
 */
export interface MergedEntity {
  /** ID of the merged entity (primary ID) */
  id: string;

  /** Entity type */
  entityType: string;

  /** Merged attributes */
  attributes: Record<string, any>;

  /** IDs of all records that were merged */
  mergedFrom: string[];

  /** Merge operation ID for tracking */
  mergeOperationId: string;
}
