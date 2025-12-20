export interface SketchConfig {
  expected_items?: number;
  bloom_false_positive_rate?: number;
  hll_error_rate?: number;
  minhash_permutations?: number;
  seed?: number;
}

export interface DatasetInput {
  name: string;
  records: string[][];
  sketch?: SketchConfig;
}

export interface Thresholds {
  high_overlap?: number;
  moderate_overlap?: number;
  uniqueness_alert?: number;
  near_exact_match_ratio?: number;
}

export interface JoinOptions {
  thresholds?: Thresholds;
}

export interface DatasetSummary {
  name: string;
  record_count: number;
  quasi_identifier_width: number;
  estimated_unique: number;
  uniqueness_ratio: number;
}

export interface EstimateInterval {
  point_estimate: number;
  lower_bound: number;
  upper_bound: number;
  relative_error: number;
}

export type RiskClassification = 'low' | 'moderate' | 'high';

export interface RiskBounds {
  lower_bound: number;
  upper_bound: number;
  classification: RiskClassification;
  notes: string[];
}

export interface JoinRiskReport {
  left: DatasetSummary;
  right: DatasetSummary;
  join_cardinality: EstimateInterval;
  jaccard_similarity: number;
  overlap_ratio: number;
  risk_bounds: RiskBounds;
  guardrail_recommendations: string[];
  seed: number;
}
