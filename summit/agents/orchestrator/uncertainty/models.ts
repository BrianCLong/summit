export type UncertaintyState =
  | 'Detected'
  | 'Characterized'
  | 'Mitigated'
  | 'Resolved'
  | 'Escalated'
  | 'Expired';

export type UncertaintyCategory =
  | 'data-quality'
  | 'coordination'
  | 'model-knowledge'
  | 'tool-failure'
  | 'model-disagreement';

export interface UncertaintyScores {
  epistemic_score: number;
  aleatoric_score: number;
  disagreement_index: number;
  evidence_coverage: number;
}

export interface UncertaintyMeta {
  category?: UncertaintyCategory | null;
  created_at: string;
  updated_at: string;
  source_agent?: string | null;
  human_overrides: boolean;
}

export interface UncertaintyRecord {
  id: string;
  appliesTo: string; // Entity ID + type
  state: UncertaintyState;
  scores: UncertaintyScores;
  meta: UncertaintyMeta;
}
