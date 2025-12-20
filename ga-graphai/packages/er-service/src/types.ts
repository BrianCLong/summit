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
  rationale: string[];
  policyTags: string[];
  createdAt: string;
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
