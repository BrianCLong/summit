/**
 * Explainability Contract Types v1.0.0
 *
 * Authoritative type definitions for explainability surfaces.
 * Implements: docs/explainability/EXPLAINABILITY_CONTRACT.md
 */

export type RunType = 'agent_run' | 'prediction' | 'negotiation' | 'policy_decision';
export type ActorType = 'human' | 'agent' | 'system' | 'service';
export type AuthMethod = 'oauth2' | 'api_key' | 'mtls' | 'service_account';
export type HashAlgorithm = 'sha256' | 'sha3-256';
export type Decision = 'allow' | 'deny' | 'audit_only' | 'require_approval';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type EvidenceQuality = 'high' | 'medium' | 'low' | 'unknown';
export type SourceReliability = 'verified' | 'trusted' | 'unverified';

export interface ActorInfo {
  actor_type: ActorType;
  actor_id: string;
  actor_name: string;
  actor_role: string | null;
  authentication_method: AuthMethod;
}

export interface InputSource {
  source_type: 'user_input' | 'database' | 'api' | 'file' | 'environment';
  source_id: string;
  retrieved_at: string;
}

export interface ExplainableInputs {
  parameters: Record<string, any>;
  input_hash: string;
  hashing_algorithm: HashAlgorithm;
  pii_fields_redacted: string[];
  secret_fields_redacted: string[];
  input_sources: InputSource[];
}

export interface ArtifactReference {
  artifact_id: string;
  artifact_type: 'file' | 'claim' | 'evidence' | 'report' | 'sbom';
  artifact_uri: string;
  artifact_hash: string;
  created_at: string;
  provenance_chain_id: string | null;
}

export interface SideEffect {
  effect_type: 'database_write' | 'api_call' | 'file_write' | 'message_sent';
  target: string;
  action: string;
  timestamp: string;
  reversible: boolean;
}

export interface ExplainableOutputs {
  results: Record<string, any>;
  output_hash: string;
  hashing_algorithm: HashAlgorithm;
  pii_fields_redacted: string[];
  secret_fields_redacted: string[];
  artifacts: ArtifactReference[];
  side_effects: SideEffect[];
}

export interface ReasoningStep {
  step_number: number;
  description: string;
  inputs: string[];
  outputs: string[];
  confidence: number;
  rationale: string;
}

export interface Alternative {
  approach: string;
  why_not_chosen: string;
  estimated_confidence: number | null;
}

export interface Explanation {
  summary: string;
  reasoning_steps: ReasoningStep[];
  why_triggered: string;
  why_this_approach: string;
  alternatives_considered: Alternative[];
}

export interface ConfidenceMetrics {
  overall_confidence: number;
  confidence_basis: string;
  evidence_count: number;
  evidence_quality: EvidenceQuality;
  source_count: number;
  source_licenses: string[];
  source_reliability: SourceReliability;
  validated: boolean;
  validation_method: string | null;
  validated_at: string | null;
}

export interface Assumption {
  assumption_id: string;
  description: string;
  risk_if_false: RiskLevel;
  validated: boolean;
  validation_notes: string | null;
}

export interface Limitation {
  limitation_id: string;
  category: 'data_quality' | 'model_capability' | 'time_constraint' | 'resource_constraint' | 'scope';
  description: string;
  impact: RiskLevel;
  mitigation: string | null;
}

export interface PolicyDecision {
  decision_id: string;
  policy_name: string;
  policy_version: string;
  decision: Decision;
  rationale: string;
  evaluated_at: string;
  capability_requested: string;
  risk_level: RiskLevel;
  evidence_used: string[];
  override_applied: boolean;
  override_justification: string | null;
}

export interface ClaimReference {
  claim_id: string;
  claim_type: 'factual' | 'inferential' | 'predictive' | 'evaluative';
  confidence: number;
  supporting_evidence_count: number;
}

export interface EvidenceReference {
  evidence_id: string;
  evidence_type: 'document' | 'image' | 'video' | 'log' | 'testimony' | 'sensor_data' | 'database_record';
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  integrity_hash: string;
}

export interface SourceReference {
  source_id: string;
  source_type: 'document' | 'database' | 'api' | 'user_input' | 'sensor';
  license: 'public' | 'internal' | 'restricted' | 'classified';
  retrieved_at: string;
}

export interface TransformReference {
  transform_id: string;
  transform_type: 'extract' | 'ocr' | 'translate' | 'normalize' | 'enrich' | 'extract_claim' | 'deduplicate' | 'classify' | 'redact';
  parent_transform_id: string | null;
}

export interface ProvenanceLinks {
  provenance_chain_id: string | null;
  claims: ClaimReference[];
  evidence: EvidenceReference[];
  sources: SourceReference[];
  transforms: TransformReference[];
  sbom_id: string | null;
  cosign_attestations: string[];
  merkle_root: string | null;
  merkle_proof: string[] | null;
}

export interface ExplainableRun {
  // Identity & Context
  run_id: string;
  run_type: RunType;
  tenant_id: string;
  actor: ActorInfo;

  // Temporal
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;

  // Inputs/Outputs
  inputs: ExplainableInputs;
  outputs: ExplainableOutputs;

  // Explanation
  explanation: Explanation;

  // Confidence & Limits
  confidence: ConfidenceMetrics;
  assumptions: Assumption[];
  limitations: Limitation[];

  // Policy & Governance
  policy_decisions: PolicyDecision[];
  capabilities_used: string[];

  // Lineage & Provenance
  provenance_links: ProvenanceLinks;
  parent_run_id: string | null;
  child_run_ids: string[];

  // Audit Trail
  audit_event_ids: string[];

  // Metadata
  version: string;
  redacted_fields: string[];
}

export interface APIError {
  code: string;
  message: string;
  field?: string;
}

export interface ExplainabilityAPIResponse<T> {
  success: boolean;
  data: T | null;
  meta: {
    request_id: string;
    tenant_id: string;
    queried_at: string;
    version: string;
  };
  errors?: APIError[];
}

export interface ListRunsFilter {
  run_type?: RunType | RunType[];
  actor_id?: string;
  started_after?: string;
  started_before?: string;
  capability?: string;
  min_confidence?: number;
  limit?: number;
  offset?: number;
}

export interface RunComparison {
  run_a: ExplainableRun;
  run_b: ExplainableRun;
  deltas: {
    input_diff: any;
    output_diff: any;
    confidence_delta: number;
    duration_delta_ms: number | null;
    different_capabilities: string[];
    different_policies: string[];
  };
}
