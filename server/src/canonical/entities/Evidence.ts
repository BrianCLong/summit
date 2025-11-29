/**
 * Canonical Entity: Evidence
 *
 * Represents evidence blobs/artifacts in the IntelGraph system
 * with provenance tracking and policy labels.
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';
import { PolicyLabel } from './Decision';

export interface EvidenceSource {
  /** Source system identifier */
  system: string;

  /** Source entity ID */
  entityId?: string;

  /** Collection timestamp */
  collectedAt: Date;

  /** Collection method */
  method?: string;

  /** Provenance metadata */
  provenance?: Record<string, any>;

  /** Source reliability (0-1) */
  reliability?: number;
}

export interface EvidenceHash {
  /** Hash algorithm */
  algorithm: 'sha256' | 'sha512' | 'blake2b';

  /** Hash value */
  value: string;

  /** When hash was computed */
  computedAt: Date;
}

export interface EvidenceBlob {
  /** Blob identifier */
  id?: string;

  /** Content type/MIME type */
  contentType: string;

  /** Storage URL or path */
  storageUrl?: string;

  /** Inline content (for small blobs) */
  content?: string | Buffer;

  /** Size in bytes */
  size?: number;

  /** Hash for integrity verification */
  hash?: EvidenceHash;
}

export interface CanonicalEvidence extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Evidence';

  /** Evidence title/name */
  title: string;

  /** Description of the evidence */
  description?: string;

  /** Evidence type */
  evidenceType:
    | 'document'
    | 'image'
    | 'video'
    | 'audio'
    | 'log'
    | 'artifact'
    | 'sbom'
    | 'attestation'
    | 'other';

  /** Evidence source(s) */
  sources: EvidenceSource[];

  /** Evidence blob(s) */
  blobs: EvidenceBlob[];

  /** Policy labels for compliance */
  policyLabels: PolicyLabel;

  /** Context linking */
  context?: {
    caseId?: string;
    investigationId?: string;
    reportId?: string;
    maestroRunId?: string;
    releaseId?: string;
  };

  /** Related entities */
  relatedEntities?: {
    entityId?: string;
    entityType?: string;
    relationship?: string;
  }[];

  /** Related claims this evidence supports */
  relatedClaims?: {
    claimId: string;
    weight?: number; // 0-1, how strongly it supports
  }[];

  /** Related decisions this evidence supports */
  relatedDecisions?: {
    decisionId: string;
    weight?: number; // 0-1, how strongly it supports
  }[];

  /** Verification status */
  verification?: {
    status: 'verified' | 'unverified' | 'tampered' | 'expired';
    verifiedBy?: {
      entityId?: string;
      name: string;
    };
    verifiedAt?: Date;
    method?: string;
  };

  /** Retention information */
  retention?: {
    tier: string;
    expiresAt?: Date;
    archivalPolicy?: string;
  };

  /** Tags for categorization */
  tags?: string[];

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Evidence entity
 */
export function createEvidence(
  data: Omit<CanonicalEvidence, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalEvidence {
  return {
    ...baseFields,
    ...data,
    entityType: 'Evidence',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
