/**
 * Canonical Entity: Case
 *
 * Represents investigations, legal cases, or analytical case files
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CaseParticipant {
  /** Participant entity ID */
  entityId?: string;

  /** Participant entity type */
  entityType?: 'Person' | 'Organization';

  /** Participant name */
  name: string;

  /** Role in the case */
  role: string;

  /** From date */
  from?: Date;

  /** To date */
  to?: Date;
}

export interface CaseTimeline {
  /** Event ID */
  eventId?: string;

  /** Event date */
  date: Date;

  /** Event type */
  eventType: string;

  /** Event description */
  description: string;

  /** Related entities */
  relatedEntities?: {
    entityId?: string;
    entityType?: string;
    name: string;
  }[];
}

export interface CasePriority {
  /** Priority level */
  level: 'low' | 'medium' | 'high' | 'urgent' | 'critical';

  /** Reason for priority */
  reason?: string;

  /** Set by */
  setBy?: string;

  /** Set at */
  setAt?: Date;
}

export interface CanonicalCase extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Case';

  /** Case type */
  caseType:
    | 'investigation'
    | 'criminal'
    | 'civil'
    | 'regulatory'
    | 'compliance'
    | 'intelligence'
    | 'fraud'
    | 'other';

  /** Case number/identifier */
  caseNumber: string;

  /** Case title */
  title: string;

  /** Case description */
  description?: string;

  /** Case status */
  status:
    | 'open'
    | 'active'
    | 'pending'
    | 'closed'
    | 'archived'
    | 'suspended'
    | 'transferred';

  /** Priority */
  priority?: CasePriority;

  /** Case opened date */
  openedDate: Date;

  /** Case closed date */
  closedDate?: Date;

  /** Assigned to */
  assignedTo?: {
    userId?: string;
    name: string;
    role?: string;
  }[];

  /** Case participants */
  participants?: CaseParticipant[];

  /** Related entities */
  relatedEntities?: {
    entityId?: string;
    entityType?: string;
    name: string;
    relationship: string;
  }[];

  /** Related documents */
  relatedDocuments?: {
    documentId?: string;
    title: string;
    documentType?: string;
  }[];

  /** Related events */
  relatedEvents?: {
    eventId?: string;
    name: string;
    eventType?: string;
  }[];

  /** Related claims */
  relatedClaims?: {
    claimId?: string;
    statement: string;
  }[];

  /** Case timeline */
  timeline?: CaseTimeline[];

  /** Jurisdiction */
  jurisdiction?: {
    type: string;
    authority: string;
    region?: string;
  };

  /** Outcome */
  outcome?: {
    status: string;
    date?: Date;
    description?: string;
    findings?: string[];
    recommendations?: string[];
  };

  /** Tags for categorization */
  tags?: string[];

  /** Risk assessment */
  riskAssessment?: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    assessedAt: Date;
    assessedBy?: string;
  };

  /** Case metrics */
  metrics?: {
    entitiesCount?: number;
    documentsCount?: number;
    eventsCount?: number;
    claimsCount?: number;
    hoursInvested?: number;
  };

  /** Parent case (if this is a sub-case) */
  parentCase?: {
    caseId?: string;
    caseNumber: string;
    title: string;
  };

  /** Sub-cases */
  subCases?: {
    caseId?: string;
    caseNumber: string;
    title: string;
  }[];

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Case entity
 */
export function createCase(
  data: Omit<CanonicalCase, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalCase {
  return {
    ...baseFields,
    ...data,
    entityType: 'Case',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
