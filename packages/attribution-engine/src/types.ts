/**
 * Types for attribution engine
 */

export interface Attribution {
  id: string;
  targetEntity: string;
  attributedTo: string;
  confidence: number;
  method: AttributionMethod;
  evidence: Evidence[];
  hypotheses: Hypothesis[];
  metadata: AttributionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type AttributionMethod =
  | 'deterministic'
  | 'probabilistic'
  | 'ml_based'
  | 'graph_based'
  | 'behavioral'
  | 'hybrid';

export interface Evidence {
  id: string;
  type: EvidenceType;
  source: string;
  value: any;
  strength: number; // 0-1
  reliability: number; // 0-1
  timestamp: Date;
  metadata: Record<string, any>;
}

export type EvidenceType =
  | 'digital_footprint'
  | 'identity_match'
  | 'network_connection'
  | 'behavioral_pattern'
  | 'temporal_correlation'
  | 'spatial_correlation'
  | 'linguistic_analysis'
  | 'technical_indicator'
  | 'document_analysis'
  | 'witness_testimony';

export interface Hypothesis {
  id: string;
  description: string;
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  likelihood: number;
  impact: 'low' | 'medium' | 'high';
}

export interface AttributionMetadata {
  analyst?: string;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  tags: string[];
  classification: string;
  notes: string;
}

export interface ConfidenceScore {
  overall: number;
  components: ConfidenceComponent[];
  factors: ConfidenceFactor[];
  uncertainties: Uncertainty[];
}

export interface ConfidenceComponent {
  name: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface ConfidenceFactor {
  name: string;
  type: 'positive' | 'negative';
  impact: number;
  description: string;
}

export interface Uncertainty {
  type: UncertaintyType;
  level: number; // 0-1
  description: string;
  mitigation?: string;
}

export type UncertaintyType =
  | 'data_quality'
  | 'conflicting_evidence'
  | 'missing_data'
  | 'temporal_gap'
  | 'source_reliability'
  | 'method_limitation';

export interface AttributionQuality {
  completeness: number;
  consistency: number;
  reliability: number;
  timeliness: number;
  validity: number;
  overall: number;
}

export interface CompetingHypothesis {
  primary: Hypothesis;
  alternatives: Hypothesis[];
  analysis: HypothesisComparison;
}

export interface HypothesisComparison {
  winner: string;
  confidenceGap: number;
  criticalEvidence: string[];
  weaknesses: Record<string, string[]>;
}

export interface AttributionReport {
  attribution: Attribution;
  confidenceScore: ConfidenceScore;
  quality: AttributionQuality;
  competingHypotheses?: CompetingHypothesis;
  timeline: TimelineEntry[];
  recommendations: string[];
  generatedAt: Date;
}

export interface TimelineEntry {
  timestamp: Date;
  event: string;
  evidence: string[];
  significance: 'low' | 'medium' | 'high';
}

export interface SourceReliability {
  source: string;
  reliability: number;
  trackRecord: number;
  bias: number;
  methodology: string;
  assessmentDate: Date;
}

export interface ConsistencyCheck {
  passed: boolean;
  inconsistencies: Inconsistency[];
  overallScore: number;
}

export interface Inconsistency {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedEvidence: string[];
  resolution?: string;
}
