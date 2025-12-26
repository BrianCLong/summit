/**
 * Canonical Entity: Evidence
 *
 * Represents material or information used to support a claim or finding
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata, PolicyLabels } from '../types';

export interface EvidenceSource {
  /** Source entity ID */
  entityId?: string;

  /** Source entity type */
  entityType?: 'Person' | 'Organization' | 'System' | 'Device';

  /** Source name */
  name: string;

  /** Chain of custody */
  custodians?: string[];

  /** Collection method */
  method?: string;

  /** Collection date */
  collectedAt: Date;
}

export interface CanonicalEvidence extends BaseCanonicalEntity, CanonicalEntityMetadata {
  // entityType: 'Evidence';

  /** Evidence type */
  evidenceType:
    | 'document'
    | 'image'
    | 'video'
    | 'audio'
    | 'physical'
    | 'digital_forensic'
    | 'testimonial'
    | 'analytical'
    | 'other';

  /** Title or name */
  title: string;

  /** Description */
  description?: string;

  /** Storage location or URL */
  location?: string;
  url?: string;

  /** File metadata (if digital) */
  fileMetadata?: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    hash: string;
    format?: string;
  };

  /** Authenticity verification */
  authenticity?: {
    status: 'verified' | 'unverified' | 'disputed' | 'forged';
    verifiedBy?: string;
    verifiedAt?: Date;
    method?: string;
    notes?: string;
  };

  /** Source(s) */
  sources: EvidenceSource[];

  /** Relevance to investigation */
  relevance?: {
    score: number; // 0-1
    description?: string;
    relatedTopics?: string[];
  };

  /** Classification (e.g., secret, confidential) */
  classification?: string | any;

  /** Chain of custody logs */
  chainOfCustody?: {
    action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'disposed';
    actor: string;
    timestamp: Date;
    notes?: string;
    location?: string;
  }[];

  /** Forensic analysis results */
  analysis?: {
    analyzedBy: string;
    analyzedAt: Date;
    findings: string;
    reportId?: string;
  }[];

  /** Tags */
  tags?: string[];

  /** Policy labels for compliance */
  // policyLabels?: PolicyLabels; // Inherited

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Evidence entity
 */
export function createEvidence(
  data: Omit<CanonicalEvidence, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion' | 'kind'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId' | 'kind'>,
  provenanceId: string,
): CanonicalEvidence {
  return {
    ...baseFields,
    ...data,
    kind: 'Evidence',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
