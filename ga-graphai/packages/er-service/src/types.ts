export interface EntityRecord {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, unknown>;
  tenantId: string;
  confidence?: number;
}

export interface CandidateScore {
  entityId: string;
  score: number;
  features: {
    nameSimilarity: number;
    typeMatch: boolean;
    propertyOverlap: number;
    semanticSimilarity: number;
    phoneticSimilarity: number;
    editDistance: number;
  };
  rationale: string[];
  contributions: FeatureContribution[];
  seed: string;
}

export interface CandidateResponse {
  requestId: string;
  candidates: CandidateScore[];
}

export interface CandidateRequest {
  tenantId: string;
  entity: EntityRecord;
  population: EntityRecord[];
  topK?: number;
  policyTags?: string[];
  seed?: string;
}

export interface MergeRequest {
  tenantId: string;
  primaryId: string;
  duplicateId: string;
  actor: string;
  reason: string;
  policyTags: string[];
}

export interface MergeRecord {
  mergeId: string;
  tenantId: string;
  primaryId: string;
  duplicateId: string;
  actor: string;
  reason: string;
  policyTags: string[];
  mergedAt: string;
  reversible: boolean;
}

export interface ExplainResponse {
  mergeId: string;
  features: CandidateScore['features'];
  contributions: FeatureContribution[];
  rationale: string[];
  policyTags: string[];
  createdAt: string;
  score: number;
  seed: string;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  actor: string;
  event: 'merge' | 'revert';
  target: string;
  reason: string;
  createdAt: string;
}

export interface FeatureContribution {
  feature: keyof CandidateScore['features'];
  weight: number;
  value: number;
  contribution: number;
  rank: number;
}

export interface AdjudicationDecisionInput {
  tenantId: string;
  actor: string;
  action: 'merge' | 'split';
  reason: string;
  targetId: string;
  payload?: Record<string, unknown>;
}

export interface AdjudicationDecision extends AdjudicationDecisionInput {
  id: string;
  status: 'queued' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface AdjudicationQuery {
  tenantId?: string;
  status?: AdjudicationDecision['status'];
  action?: AdjudicationDecision['action'];
}
