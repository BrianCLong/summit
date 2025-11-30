/**
 * Decision Graph Service Interface
 * Defines the contract for decision graph operations
 */

import type {
  Entity,
  Claim,
  Evidence,
  Decision,
  ProvenanceEvent,
  GraphRelationship,
  DisclosurePack,
  DecisionRunInput,
  DecisionRunOutput,
} from '../schema/index.js';

// ============================================================================
// Query Types
// ============================================================================

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  tenant_id?: string;
  created_after?: string;
  created_before?: string;
  created_by?: string;
  policy_labels?: string[];
  status?: string[];
}

export interface QueryResult<T> {
  items: T[];
  total: number;
  has_more: boolean;
  cursor?: string;
}

// ============================================================================
// Entity Operations
// ============================================================================

export interface CreateEntityInput {
  type: Entity['type'];
  name: string;
  description?: string;
  attributes?: Record<string, unknown>;
  policy_labels?: string[];
}

export interface UpdateEntityInput {
  name?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  policy_labels?: string[];
}

// ============================================================================
// Claim Operations
// ============================================================================

export interface CreateClaimInput {
  entity_id: string;
  claim_type: string;
  assertion: string;
  confidence_score?: number;
  evidence_ids?: string[];
  source_type: Claim['source_type'];
  source_id: string;
  policy_labels?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateClaimInput {
  assertion?: string;
  confidence_score?: number;
  status?: Claim['status'];
  evidence_ids?: string[];
  supporting_claim_ids?: string[];
  contradicting_claim_ids?: string[];
  policy_labels?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Evidence Operations
// ============================================================================

export interface CreateEvidenceInput {
  type: Evidence['type'];
  title: string;
  description?: string;
  source_uri: string;
  source_type: string;
  content_hash: string;
  content_type?: string;
  file_size_bytes?: number;
  extracted_text?: string;
  reliability_score?: number;
  freshness_date: string;
  expiry_date?: string;
  license_id?: string;
  policy_labels?: string[];
}

// ============================================================================
// Decision Operations
// ============================================================================

export interface CreateDecisionInput {
  type: Decision['type'];
  title: string;
  question: string;
  context?: string;
  constraints?: string[];
  options: Array<{
    name: string;
    description: string;
    pros?: string[];
    cons?: string[];
    risk_level: 'low' | 'medium' | 'high' | 'critical';
  }>;
  entity_ids?: string[];
  require_approval?: boolean;
}

export interface UpdateDecisionInput {
  selected_option_id?: string;
  recommendation?: string;
  rationale?: string;
  status?: Decision['status'];
  claim_ids?: string[];
  evidence_ids?: string[];
  risk_assessment?: Decision['risk_assessment'];
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IDecisionGraphService {
  // Entity operations
  createEntity(
    input: CreateEntityInput,
    actor: { id: string; tenant_id: string },
  ): Promise<Entity>;

  getEntity(id: string, tenant_id: string): Promise<Entity | null>;

  updateEntity(
    id: string,
    input: UpdateEntityInput,
    actor: { id: string; tenant_id: string },
  ): Promise<Entity>;

  listEntities(
    filters: FilterOptions,
    pagination?: PaginationOptions,
    sort?: SortOptions,
  ): Promise<QueryResult<Entity>>;

  // Claim operations
  createClaim(
    input: CreateClaimInput,
    actor: { id: string; tenant_id: string },
  ): Promise<Claim>;

  getClaim(id: string, tenant_id: string): Promise<Claim | null>;

  updateClaim(
    id: string,
    input: UpdateClaimInput,
    actor: { id: string; tenant_id: string },
  ): Promise<Claim>;

  listClaimsByEntity(
    entity_id: string,
    filters?: FilterOptions,
    pagination?: PaginationOptions,
  ): Promise<QueryResult<Claim>>;

  // Evidence operations
  createEvidence(
    input: CreateEvidenceInput,
    actor: { id: string; tenant_id: string },
  ): Promise<Evidence>;

  getEvidence(id: string, tenant_id: string): Promise<Evidence | null>;

  attachEvidenceToClaim(
    evidence_id: string,
    claim_id: string,
    actor: { id: string; tenant_id: string },
  ): Promise<void>;

  listEvidenceByClaim(
    claim_id: string,
    pagination?: PaginationOptions,
  ): Promise<QueryResult<Evidence>>;

  // Decision operations
  createDecision(
    input: CreateDecisionInput,
    actor: { id: string; tenant_id: string },
  ): Promise<Decision>;

  getDecision(id: string, tenant_id: string): Promise<Decision | null>;

  updateDecision(
    id: string,
    input: UpdateDecisionInput,
    actor: { id: string; tenant_id: string },
  ): Promise<Decision>;

  approveDecision(
    id: string,
    approver: { id: string; role: string; tenant_id: string },
    comment?: string,
  ): Promise<Decision>;

  rejectDecision(
    id: string,
    approver: { id: string; role: string; tenant_id: string },
    reason: string,
  ): Promise<Decision>;

  // Query operations
  getClaimsByDecision(
    decision_id: string,
    tenant_id: string,
  ): Promise<Claim[]>;

  getEvidenceByDecision(
    decision_id: string,
    tenant_id: string,
  ): Promise<Evidence[]>;

  getDecisionGraph(
    decision_id: string,
    tenant_id: string,
  ): Promise<{
    decision: Decision;
    claims: Claim[];
    evidence: Evidence[];
    entities: Entity[];
    relationships: GraphRelationship[];
  }>;

  // Provenance operations
  getProvenanceChain(
    subject_id: string,
    subject_type: ProvenanceEvent['subject_type'],
    tenant_id: string,
  ): Promise<ProvenanceEvent[]>;

  // Disclosure pack operations
  generateDisclosurePack(
    decision_id: string,
    format: DisclosurePack['format'],
    actor: { id: string; tenant_id: string; clearance_level?: string },
  ): Promise<DisclosurePack>;

  // Maestro integration
  executeDecisionRun(
    input: DecisionRunInput,
    actor: { id: string; tenant_id: string },
  ): Promise<DecisionRunOutput>;
}

// ============================================================================
// Event Types for Pub/Sub
// ============================================================================

export type DecisionGraphEvent =
  | { type: 'entity.created'; payload: Entity }
  | { type: 'entity.updated'; payload: Entity }
  | { type: 'claim.created'; payload: Claim }
  | { type: 'claim.updated'; payload: Claim }
  | { type: 'claim.verified'; payload: Claim }
  | { type: 'evidence.created'; payload: Evidence }
  | { type: 'evidence.attached'; payload: { evidence_id: string; claim_id: string } }
  | { type: 'decision.created'; payload: Decision }
  | { type: 'decision.updated'; payload: Decision }
  | { type: 'decision.approved'; payload: Decision }
  | { type: 'decision.rejected'; payload: Decision }
  | { type: 'disclosure.generated'; payload: DisclosurePack };
