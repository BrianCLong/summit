/**
 * Regulatory Artifact Canonical Format (RACF)
 * Represents a normalized public or quasi-public artifact from regulatory/legal domains.
 */
export interface RACF {
  tenant_id: string;
  artifact_id: string;
  artifact_type: 'foia_response' | 'filing' | 'docket_entry' | 'order' | 'exhibit' | 'contract' | 'enforcement' | 'comment';
  jurisdiction: string;
  agency_or_court: string;
  case_or_docket_id?: string;
  date_published?: string; // ISO8601
  access_level: 'public' | 'sealed' | 'privileged' | 'internal';
  source_url_hash?: string;
  content_hash: string;
  provenance: string[]; // List of source system IDs or URIs
  confidence: number; // 0.0 to 1.0
}

/**
 * Regulatory Yield Vector Format (RYVF)
 * Quantifies the intelligence yield of a specific artifact.
 */
export interface RYVF {
  tenant_id: string;
  artifact_id: string;
  yield_facts: YieldFact[];
  yield_links: YieldLink[];
  assumptions: string[];
}

export interface YieldFact {
  fact_id: string;
  category: 'technical' | 'operational' | 'financial' | 'supply_chain' | 'strategy' | 'personnel';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  claim_text_hash: string;
  evidence_spans: string[]; // Text spans or location markers
  confidence: number;
}

export interface YieldLink {
  fact_id: string;
  corroborates_fact_id: string;
  strength: number; // 0.0 to 1.0
}

/**
 * Disclosure Equilibrium Finding (DEGF)
 * Output of the REN/DEG simulation.
 */
export interface DEGF {
  tenant_id: string;
  finding_id: string;
  scenario_id: string;
  reconstructed_insights: ReconstructedInsight[];
  intelligence_yield_score: number;
  recommended_moves: RecommendedMove[];
  evidence_refs: string[]; // List of Evidence IDs
}

export interface ReconstructedInsight {
  insight_id: string;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  supporting_artifacts: string[]; // List of artifact_ids
  description: string;
}

export interface RecommendedMove {
  move_id: string;
  move_type: 'structure' | 'wording_guideline' | 'redaction_request' | 'sealing_motion' | 'partitioning' | 'timing' | 'engagement_posture';
  constraint_refs: string[]; // Policies or legal constraints
  expected_yield_delta: number;
  legal_friction_proxy: number; // 0.0 to 1.0 (cost/time/risk)
  rationale: string;
}
