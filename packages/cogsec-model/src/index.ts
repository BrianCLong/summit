export interface CognitiveSurface {
  channels: string[];
  narratives: string[];
  audience_segments?: string[];
}

export type ThreatType = 'CIB' | 'SYNTHETIC_MEDIA' | 'RECOMMENDER_EXPLOITATION' | 'DATA_POISONING';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ThreatHypothesis {
  type: ThreatType;
  confidence: ConfidenceLevel;
  evidence_refs: string[];
}

export type Mitigation = string;

export interface CogSecReport {
  cognitive_surface: CognitiveSurface;
  threat_hypotheses: ThreatHypothesis[];
  mitigations_applied: Mitigation[];
}
