export interface EvidenceDescriptor {
  id: string;
  description?: string;
  source?: string;
}

export interface AuthorityContext {
  actor: string;
  role: string;
  scope?: string;
}

export interface DecisionProposal {
  id?: string;
  summary: string;
  evidence: EvidenceDescriptor[];
  confidence: number;
  authority: AuthorityContext;
  createdAt?: Date;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface FactRecord {
  id: string;
  source: string;
  attribution: string;
  receivedAt: Date;
  expiresAt?: Date;
  revoked?: boolean;
  volatility?: 'low' | 'medium' | 'high';
}

export interface RefusalRecordProps {
  reason: string;
  decisionId?: string;
  evidenceIds?: string[];
  actor: string;
  doctrineRefs?: string[];
  containment?: string;
  createdAt?: Date;
}
