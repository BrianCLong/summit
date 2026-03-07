export interface EntityRecord {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, unknown>;
  tenantId: string;
  confidence?: number;
  source?: string;
  sources?: SourceAttribution[];
}

export interface SourceAttribution {
  source: string;
  reliability?: number;
  lastSeenAt?: string;
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
    ruleScore: number;
    mlScore?: number;
    finalScore: number;
  };
  rationale: string[];
  explanation?: PredictionExplanation;
  decision?: ScoreDecision;
}

export interface CandidateResponse {
  requestId: string;
  candidates: CandidateScore[];
  thresholds: ScoreThresholds;
  model: ScoringModel;
}

export interface CandidateRequest {
  tenantId: string;
  entity: EntityRecord;
  population: EntityRecord[];
  topK?: number;
  policyTags?: string[];
  thresholds?: ScoreThresholds;
  scoring?: ScoringOptions;
}

export interface ScoreThresholds {
  autoMerge: number;
  review: number;
}

export type ScoreDecision = "auto-merge" | "review" | "reject";

export interface ScoringModel {
  id: string;
  version: string;
  hash: string;
}

export interface ScoringOptions {
  mlEnabled?: boolean;
  mlBlend?: number;
  model?: ScoringModel;
}

export interface PredictionExplanation {
  decision: ScoreDecision;
  contributions: Record<string, number>;
  rationale: string[];
}

export interface MergeRequest {
  tenantId: string;
  primaryId: string;
  duplicateId: string;
  actor: string;
  reason: string;
  policyTags: string[];
  model?: ScoringModel;
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
  score: number;
  decision: ScoreDecision;
  modelHash: string;
}

export interface DeduplicationRequest {
  tenantId: string;
  population: EntityRecord[];
  thresholds?: ScoreThresholds;
  scoring?: ScoringOptions;
}

export interface ResolutionCluster {
  clusterId: string;
  primary: EntityRecord;
  duplicates: CandidateScore[];
  model: ScoringModel;
  rationale: string[];
  createdAt: string;
}

export interface ExplainResponse {
  mergeId: string;
  features: CandidateScore["features"];
  rationale: string[];
  policyTags: string[];
  createdAt: string;
  modelHash: string;
}

export interface TemporalEvent {
  entityId: string;
  timestamp: string;
  type: string;
  value?: number;
  context?: Record<string, unknown>;
}

export interface TemporalPattern {
  entityId: string;
  trend: "spike" | "increasing" | "stable";
  support: number;
  windowDays: number;
  confidence: number;
  evidence: string[];
}

export interface ExtractedEntity {
  record: EntityRecord;
  offsets: { start: number; end: number; label: string }[];
}

export interface ExtractionOptions {
  tenantId: string;
  defaultType?: string;
  source?: string;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  actor: string;
  event: "merge" | "revert";
  target: string;
  reason: string;
  createdAt: string;
  modelHash?: string;
  decision?: ScoreDecision;
  score?: number;
}

export interface MergePreviewRequest {
  tenantId: string;
  primary: EntityRecord;
  duplicate: EntityRecord;
  population: EntityRecord[];
  thresholds?: ScoreThresholds;
  scoring?: ScoringOptions;
  actor: string;
}

export interface MergePreview {
  previewId: string;
  score: CandidateScore;
  decision: ScoreDecision;
  impact: {
    attributesChanged: number;
    sharedAttributes: number;
    totalPopulation: number;
  };
  sandboxId: string;
  createdAt: string;
}
