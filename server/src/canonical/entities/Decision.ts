/**
 * Canonical Entity: Decision
 *
 * Represents decision nodes in the IntelGraph system for tracking
 * decisions made with evidence and policy context.
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface PolicyLabel {
  /** Origin classification */
  origin?: string;

  /** Sensitivity level */
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';

  /** Legal basis for processing */
  legalBasis?: string;

  /** Data residency requirement */
  residency?: string;

  /** Retention tier */
  retentionTier?: string;

  /** Additional policy metadata */
  metadata?: Record<string, any>;
}

export interface DecisionContext {
  /** Related case or investigation ID */
  caseId?: string;

  /** Investigation ID */
  investigationId?: string;

  /** Report ID */
  reportId?: string;

  /** Maestro run ID */
  maestroRunId?: string;

  /** Additional context */
  metadata?: Record<string, any>;
}

export interface DecisionOption {
  /** Option identifier */
  id: string;

  /** Option description */
  description: string;

  /** Pros */
  pros?: string[];

  /** Cons */
  cons?: string[];

  /** Risk assessment */
  risks?: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];

  /** Cost estimate */
  cost?: any;
}

export interface CanonicalDecision extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Decision';

  /** Decision title/summary */
  title: string;

  /** Detailed decision description */
  description?: string;

  /** Decision context */
  context: DecisionContext;

  /** Options considered */
  options?: DecisionOption[];

  /** Selected option ID */
  selectedOption?: string;

  /** Decision rationale */
  rationale?: string;

  /** Is this decision reversible? */
  reversible: boolean;

  /** Decision status */
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'reversed';

  /** Who made the decision */
  decidedBy?: {
    entityId?: string;
    name: string;
    role?: string;
  };

  /** When the decision was made */
  decidedAt?: Date;

  /** Who approved the decision */
  approvedBy?: {
    entityId?: string;
    name: string;
    role?: string;
  }[];

  /** When approved */
  approvedAt?: Date;

  /** Evidence supporting this decision */
  evidence?: {
    evidenceId: string;
    description?: string;
    weight?: number; // 0-1
  }[];

  /** Related claims */
  claims?: {
    claimId: string;
    relationship?: 'supports' | 'requires' | 'contradicts';
    description?: string;
  }[];

  /** Policy labels for compliance */
  policyLabels: PolicyLabel;

  /** Risk assessment */
  risks?: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigation?: string;
  }[];

  /** Owners responsible for implementation */
  owners?: {
    entityId?: string;
    name: string;
    role?: string;
  }[];

  /** Checks/gates before implementation */
  checks?: {
    id: string;
    description: string;
    status: 'pending' | 'passed' | 'failed';
    checkedAt?: Date;
    checkedBy?: string;
  }[];

  /** Tags for categorization */
  tags?: string[];

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Decision entity
 */
export function createDecision(
  data: Omit<CanonicalDecision, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalDecision {
  return {
    ...baseFields,
    ...data,
    entityType: 'Decision',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
