export type ClaimStatus = 'hypothesized' | 'corroborated' | 'refuted' | 'deprecated';

export interface EpistemicClaim {
  claim_id: string;
  subject_ref: string;
  statement: string;
  status: ClaimStatus;
  confidence: number;
  epistemic_uncertainty: number;
  aleatoric_uncertainty: number;
  support_score?: number;
  conflict_score?: number;
  domain: string;
}

export interface Evidence {
  evidence_id: string;
  source_type: string;
  source_handle: string;
  snippet_hash: string;
  observed_at: string;
  reliability_score: number;
}

export interface ProvenanceStep {
  step_id: string;
  operation_type: string;
  model_id: string;
  model_version: string;
  pipeline_stage?: string;
  timestamp?: string; // Only for stamp.json logic if strictly isolated
  decision?: string;
  rationale?: string;
}
