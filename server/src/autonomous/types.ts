
export enum ReviewDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

export enum ChangeType {
  CODE = 'CODE',
  CONFIG = 'CONFIG',
  DOCS = 'DOCS',
  INFRA = 'INFRA',
}

export interface ChangeFile {
  path: string;
  additions: number;
  deletions: number;
}

export interface ChangeRequest {
  id: string;
  authorId: string;
  tenantId: string;
  type: ChangeType;
  title: string;
  description: string;
  files: ChangeFile[];
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ReviewResult {
  decision: ReviewDecision;
  rationale: string;
  confidence: number;
  riskScore: number;
  policyUsed: string;
  conditions?: Record<string, any>;
  timestamp: Date;
}
