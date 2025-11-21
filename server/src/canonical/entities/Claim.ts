/**
 * Canonical Entity: Claim
 *
 * Represents assertions, allegations, or statements that may be verified
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface ClaimSubject {
  /** Subject entity ID */
  entityId?: string;

  /** Subject entity type */
  entityType?: string;

  /** Subject name */
  name: string;
}

export interface ClaimSource {
  /** Source entity ID */
  entityId?: string;

  /** Source entity type */
  entityType?: 'Person' | 'Organization' | 'Document';

  /** Source name */
  name: string;

  /** Source credibility rating */
  credibility?: 'high' | 'medium' | 'low' | 'unknown';

  /** When the claim was made */
  claimedAt: Date;
}

export interface ClaimVerification {
  /** Verification status */
  status: 'verified' | 'unverified' | 'disputed' | 'refuted' | 'pending';

  /** Confidence level (0-1) */
  confidence?: number;

  /** Who verified */
  verifiedBy?: {
    entityId?: string;
    name: string;
  };

  /** When verified */
  verifiedAt?: Date;

  /** Verification method */
  method?: string;

  /** Supporting evidence */
  evidence?: {
    documentId?: string;
    description: string;
    weight: number; // 0-1
  }[];

  /** Contradicting evidence */
  contradictions?: {
    documentId?: string;
    description: string;
    weight: number; // 0-1
  }[];
}

export interface CanonicalClaim extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Claim';

  /** Claim type */
  claimType:
    | 'identity'
    | 'relationship'
    | 'ownership'
    | 'location'
    | 'event'
    | 'financial'
    | 'legal'
    | 'other';

  /** The claim statement */
  statement: string;

  /** Structured claim content */
  claimContent?: {
    predicate: string;
    subject: any;
    object: any;
  };

  /** Claim subject(s) */
  subjects: ClaimSubject[];

  /** Claim source(s) */
  sources: ClaimSource[];

  /** Verification details */
  verification?: ClaimVerification;

  /** When the claimed fact supposedly occurred */
  occurredAt?: Date;

  /** Related claims */
  relatedClaims?: {
    claimId?: string;
    relationship: 'supports' | 'contradicts' | 'related' | 'supersedes';
    description?: string;
  }[];

  /** Impact assessment */
  impact?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
    affectedEntities?: {
      entityId?: string;
      entityType?: string;
      name: string;
    }[];
  };

  /** Claim context */
  context?: {
    caseId?: string;
    investigationId?: string;
    reportId?: string;
  };

  /** Risk indicators */
  riskFlags?: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
  }[];

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Claim entity
 */
export function createClaim(
  data: Omit<CanonicalClaim, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalClaim {
  return {
    ...baseFields,
    ...data,
    entityType: 'Claim',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
