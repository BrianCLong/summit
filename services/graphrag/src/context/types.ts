export interface HighlightRequest {
  query: string;
  context?: string;
  documents?: Array<{
    doc_id: string;
    text: string;
    metadata?: Record<string, unknown>;
  }>;
  language?: string | null;
  threshold?: number | null;
  budget?: number | null;
  granularity?: 'sentence' | 'clause' | 'span';
  return_metrics?: boolean;
  subquestions?: string[];
  keep_at_least_sentences?: number | null;
  keep_at_least_sources?: number | null;
  strict_mode?: boolean;
  detect_contradictions?: boolean;
}

export interface SelectedSpan {
  doc_id: string;
  start: number;
  end: number;
  text: string;
  score: number;
  token_count: number;
  sentence_index?: number | null;
  conflict_set_id?: string | null;
}

export interface SelectedSentence {
  doc_id: string;
  index: number;
  start: number;
  end: number;
  text: string;
  score: number;
  token_count: number;
  conflict_set_id?: string | null;
}

export interface SentenceScore {
  doc_id: string;
  index: number;
  start: number;
  end: number;
  text: string;
  score: number;
  token_count: number;
}

export interface ConflictSet {
  id: string;
  member_indices: number[];
  rationale: string;
}

export interface HighlightResponse {
  selected_spans: SelectedSpan[];
  selected_sentences: SelectedSentence[];
  sentence_scores: SentenceScore[];
  token_scores?: number[] | null;
  compression_rate: number;
  kept_token_count: number;
  total_token_count: number;
  model_version: string;
  timings_ms: Record<string, number>;
  conflict_sets: ConflictSet[];
}

export interface PruningPolicy {
  maxContextTokens?: number;
  minEvidenceSources?: number;
  strictMode?: boolean;
}
