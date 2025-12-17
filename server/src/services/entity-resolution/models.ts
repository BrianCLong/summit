export interface ResolutionFeature {
  name: string;
  score: number; // 0 to 1
  weight: number;
  description?: string;
}

export interface ResolutionCandidate {
  sourceEntityId: string;
  targetEntityId: string;
  overallScore: number;
  features: ResolutionFeature[];
  reasons: string[];
}

export type DecisionType = 'MERGE' | 'LINK' | 'NO_MATCH' | 'REVIEW';

export interface ResolutionDecision {
  candidate: ResolutionCandidate;
  decision: DecisionType;
  confidence: number;
  ruleId?: string;
}

export interface ERConfig {
  thresholds: {
    merge: number;
    link: number;
    review: number;
  };
  weights: Record<string, number>;
  enabledFeatures: string[];
}

export interface EntityInput {
  id: string;
  type: string;
  properties: Record<string, any>;
  tenantId: string;
}

export interface DataQualityMetric {
  metric: string;
  value: number;
  timestamp: Date;
  dimensions?: Record<string, string>;
}
