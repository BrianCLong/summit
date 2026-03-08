export type ThreatContext =
  | 'domestic'
  | 'public_figure'
  | 'workplace'
  | 'school'
  | 'general';

export type RiskLevel =
  | 'LOW'
  | 'GUARDED'
  | 'ELEVATED'
  | 'HIGH'
  | 'CRITICAL'
  | 'REVIEW_REQUIRED';

export type IndicatorDirection = 'risk_up' | 'risk_down';

export interface IndicatorDefinition {
  indicator_id: string;
  family: string;
  label: string;
  description: string;
  allowed_values: Array<0 | 0.5 | 1 | 2>;
  contexts: ThreatContext[];
  direction: IndicatorDirection;
  default_weight: number;
  requires_evidence: boolean;
  evidence_min: number;
  notes: string;
  high_importance?: boolean;
}

export interface IndicatorObservation {
  indicator_id: string;
  value: 0 | 0.5 | 1 | 2;
  confidence: number;
  evidence_ids: string[];
  known?: boolean;
}

export interface ThreatAssessmentResult {
  case_id: string;
  context: ThreatContext;
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  score_breakdown: {
    base: number;
    context_prior: number;
    interaction_bonus: number;
    protective_suppression: number;
    uncertainty_penalty: number;
  };
  triggered_indicators: string[];
  contributing_factors: string[];
  suppressing_factors: string[];
  evidence_ids: string[];
  recommendations: string[];
}

export interface ThreatCase {
  case_id: string;
  context: ThreatContext;
  item_slug: string;
  observations: IndicatorObservation[];
}

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, string | number | boolean | null>;
}

export interface GraphProjection {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
