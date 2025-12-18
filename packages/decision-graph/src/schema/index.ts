/**
 * Decision Graph Schema v0
 * Core types for the Provable Value Slice sprint
 *
 * Graph Model:
 * - Entity: Core graph nodes (Person, Org, etc.)
 * - Claim: Assertions about entities with confidence scores
 * - Evidence: Source material supporting claims
 * - Decision: AI/human decisions with full provenance
 * - PolicyLabel: Classification and access control tags
 */

import { z } from 'zod';

// ============================================================================
// Policy and Classification Labels
// ============================================================================

export const SensitivityLevel = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
  'classified',
]);

export const PolicyLabelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['sensitivity', 'origin', 'clearance', 'legal_basis', 'retention']),
  value: z.string(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
  created_by: z.string(),
});

export type PolicyLabel = z.infer<typeof PolicyLabelSchema>;

// ============================================================================
// Entity Schema (Extended)
// ============================================================================

export const EntityType = z.enum([
  'Person',
  'Organization',
  'Asset',
  'Account',
  'Location',
  'Event',
  'Document',
  'Communication',
  'Device',
  'Vehicle',
  'FinancialInstrument',
  'Infrastructure',
  'Indicator',
  'Model', // AI model reference
  'Vendor', // For vendor risk decisions
]);

export const EntitySchema = z.object({
  id: z.string().uuid(),
  type: EntityType,
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  attributes: z.record(z.string(), z.any()).default({}),
  policy_labels: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string(),
  tenant_id: z.string(),
  version: z.number().int().positive().default(1),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().optional(),
});

export type Entity = z.infer<typeof EntitySchema>;

// ============================================================================
// Claim Schema
// ============================================================================

export const ClaimStatus = z.enum([
  'draft',
  'pending_review',
  'verified',
  'disputed',
  'retracted',
  'superseded',
]);

export const ClaimConfidenceLevel = z.enum([
  'low',       // <50% confidence
  'medium',    // 50-75% confidence
  'high',      // 75-90% confidence
  'very_high', // 90-99% confidence
  'certain',   // 99%+ confidence
]);

export const ClaimSchema = z.object({
  id: z.string().uuid(),
  entity_id: z.string().uuid(), // The entity this claim is about
  claim_type: z.string().min(1).max(100), // e.g., 'financial_status', 'security_risk', 'relationship'
  assertion: z.string().min(1).max(2000), // The actual claim text
  confidence_score: z.number().min(0).max(1).default(0.5),
  confidence_level: ClaimConfidenceLevel.default('medium'),
  status: ClaimStatus.default('draft'),
  evidence_ids: z.array(z.string().uuid()).default([]),
  supporting_claim_ids: z.array(z.string().uuid()).default([]), // Claims that support this claim
  contradicting_claim_ids: z.array(z.string().uuid()).default([]), // Claims that contradict this
  source_type: z.enum(['human', 'ai', 'automated', 'external']),
  source_id: z.string(), // User ID, model ID, or external system ID
  policy_labels: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
  hash: z.string(), // SHA-256 of claim content for integrity
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string(),
  reviewed_by: z.string().optional(),
  reviewed_at: z.string().datetime().optional(),
  tenant_id: z.string(),
  version: z.number().int().positive().default(1),
  superseded_by: z.string().uuid().optional(), // ID of newer claim version
});

export type Claim = z.infer<typeof ClaimSchema>;

// ============================================================================
// Evidence Schema
// ============================================================================

export const EvidenceType = z.enum([
  'document',
  'url',
  'database_record',
  'api_response',
  'image',
  'audio',
  'video',
  'structured_data',
  'model_output',
  'human_statement',
]);

export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  type: EvidenceType,
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  source_uri: z.string().max(2000), // URL, file path, or reference
  source_type: z.string(), // e.g., 'internal_doc', 'external_api', 'user_upload'
  content_hash: z.string(), // SHA-256 of source content
  content_type: z.string().optional(), // MIME type
  file_size_bytes: z.number().int().optional(),
  extracted_text: z.string().optional(), // For searchability
  extraction_metadata: z.record(z.string(), z.any()).default({}),
  reliability_score: z.number().min(0).max(1).default(0.5),
  freshness_date: z.string().datetime(), // When the evidence was created/captured
  retrieval_date: z.string().datetime(), // When we retrieved it
  expiry_date: z.string().datetime().optional(), // When it becomes stale
  license_id: z.string().optional(), // License registry reference
  policy_labels: z.array(z.string()).default([]),
  transform_chain: z.array(z.object({
    transform_type: z.string(),
    timestamp: z.string().datetime(),
    actor_id: z.string(),
    config: z.record(z.string(), z.any()).optional(),
    input_hash: z.string(),
    output_hash: z.string(),
  })).default([]),
  created_at: z.string().datetime(),
  created_by: z.string(),
  tenant_id: z.string(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

// ============================================================================
// Decision Schema
// ============================================================================

export const DecisionStatus = z.enum([
  'draft',
  'pending_review',
  'pending_approval',
  'approved',
  'rejected',
  'implemented',
  'superseded',
  'reverted',
]);

export const DecisionType = z.enum([
  'vendor_selection',
  'risk_assessment',
  'model_selection',
  'resource_allocation',
  'policy_change',
  'investigation_action',
  'access_grant',
  'classification_change',
  'custom',
]);

export const DecisionOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string(),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  supporting_claim_ids: z.array(z.string().uuid()).default([]),
  estimated_impact: z.record(z.string(), z.any()).default({}),
  selected: z.boolean().default(false),
});

export type DecisionOption = z.infer<typeof DecisionOptionSchema>;

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  type: DecisionType,
  title: z.string().min(1).max(500),
  question: z.string().min(1).max(2000), // The decision question
  context: z.string().max(10000), // Background context
  constraints: z.array(z.string()).default([]), // Decision constraints
  options: z.array(DecisionOptionSchema).min(1),
  selected_option_id: z.string().uuid().optional(),
  recommendation: z.string().optional(), // AI recommendation text
  rationale: z.string().optional(), // Why this decision was made
  claim_ids: z.array(z.string().uuid()).default([]), // Claims considered
  evidence_ids: z.array(z.string().uuid()).default([]), // Evidence consulted
  entity_ids: z.array(z.string().uuid()).default([]), // Entities affected
  status: DecisionStatus.default('draft'),
  decision_maker_id: z.string(), // Who made the final decision
  decision_maker_type: z.enum(['human', 'ai', 'hybrid']),
  maestro_run_id: z.string().optional(), // Link to orchestration run
  confidence_score: z.number().min(0).max(1).optional(),
  risk_assessment: z.object({
    overall_risk: z.enum(['low', 'medium', 'high', 'critical']),
    risk_factors: z.array(z.string()).default([]),
    mitigations: z.array(z.string()).default([]),
  }).optional(),
  policy_labels: z.array(z.string()).default([]),
  approval_chain: z.array(z.object({
    approver_id: z.string(),
    role: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']),
    timestamp: z.string().datetime().optional(),
    comment: z.string().optional(),
  })).default([]),
  hash: z.string(), // SHA-256 for integrity
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  decided_at: z.string().datetime().optional(),
  created_by: z.string(),
  tenant_id: z.string(),
  version: z.number().int().positive().default(1),
  superseded_by: z.string().uuid().optional(),
});

export type Decision = z.infer<typeof DecisionSchema>;

// ============================================================================
// Provenance Chain Schema
// ============================================================================

export const ProvenanceEventType = z.enum([
  'created',
  'updated',
  'reviewed',
  'approved',
  'rejected',
  'linked',
  'unlinked',
  'classified',
  'declassified',
  'exported',
  'transformed',
  'merged',
  'split',
  'superseded',
]);

export const ProvenanceEventSchema = z.object({
  id: z.string().uuid(),
  event_type: ProvenanceEventType,
  subject_type: z.enum(['entity', 'claim', 'evidence', 'decision']),
  subject_id: z.string().uuid(),
  actor_id: z.string(),
  actor_type: z.enum(['user', 'system', 'ai_model', 'external']),
  timestamp: z.string().datetime(),
  details: z.record(z.string(), z.any()).default({}),
  before_hash: z.string().optional(), // Hash before change
  after_hash: z.string(), // Hash after change
  parent_event_id: z.string().uuid().optional(), // For event chains
  tenant_id: z.string(),
});

export type ProvenanceEvent = z.infer<typeof ProvenanceEventSchema>;

// ============================================================================
// Decision Run Artifacts Schema (for Maestro integration)
// ============================================================================

export const DecisionRunInputSchema = z.object({
  question: z.string().min(1),
  context: z.string().optional(),
  entity_ids: z.array(z.string().uuid()).default([]),
  constraints: z.array(z.string()).default([]),
  options: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).optional(),
  max_evidence_items: z.number().int().positive().default(20),
  require_human_approval: z.boolean().default(true),
  confidence_threshold: z.number().min(0).max(1).default(0.7),
});

export type DecisionRunInput = z.infer<typeof DecisionRunInputSchema>;

export const DecisionRunOutputSchema = z.object({
  decision_id: z.string().uuid(),
  selected_option: z.string(),
  recommendation: z.string(),
  rationale: z.string(),
  confidence_score: z.number().min(0).max(1),
  claims_referenced: z.array(z.object({
    claim_id: z.string().uuid(),
    relevance_score: z.number().min(0).max(1),
    summary: z.string(),
  })),
  evidence_referenced: z.array(z.object({
    evidence_id: z.string().uuid(),
    relevance_score: z.number().min(0).max(1),
    summary: z.string(),
  })),
  risk_factors: z.array(z.string()),
  known_limitations: z.array(z.string()),
  requires_approval: z.boolean(),
  cost_usd: z.number().optional(),
  duration_ms: z.number().int(),
  model_versions: z.record(z.string(), z.string()).default({}),
});

export type DecisionRunOutput = z.infer<typeof DecisionRunOutputSchema>;

// ============================================================================
// Graph Relationship Types
// ============================================================================

export const GraphRelationshipType = z.enum([
  // Entity relationships
  'RELATED_TO',
  'OWNS',
  'EMPLOYED_BY',
  'LOCATED_IN',
  'TRANSACTED_WITH',
  'COMMUNICATES_WITH',
  // Claim relationships
  'CLAIMS_ABOUT',
  'SUPPORTS_CLAIM',
  'CONTRADICTS_CLAIM',
  'DERIVED_FROM_CLAIM',
  // Evidence relationships
  'EVIDENCES',
  'SOURCE_OF',
  'EXTRACTED_FROM',
  // Decision relationships
  'DECIDED_ON',
  'BASED_ON_CLAIM',
  'BASED_ON_EVIDENCE',
  'AFFECTS_ENTITY',
  'SUPERSEDES',
]);

export const GraphRelationshipSchema = z.object({
  id: z.string().uuid(),
  type: GraphRelationshipType,
  source_id: z.string().uuid(),
  source_type: z.enum(['entity', 'claim', 'evidence', 'decision']),
  target_id: z.string().uuid(),
  target_type: z.enum(['entity', 'claim', 'evidence', 'decision']),
  weight: z.number().min(0).max(1).default(1),
  confidence: z.number().min(0).max(1).default(1),
  attributes: z.record(z.string(), z.any()).default({}),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  created_by: z.string(),
  tenant_id: z.string(),
});

export type GraphRelationship = z.infer<typeof GraphRelationshipSchema>;

// ============================================================================
// Disclosure Pack Schema
// ============================================================================

export const DisclosurePackSchema = z.object({
  id: z.string().uuid(),
  version: z.string(),
  decision_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  generated_by: z.string(),
  format: z.enum(['markdown', 'html', 'pdf', 'json']),
  sections: z.object({
    summary: z.object({
      question: z.string(),
      answer: z.string(),
      confidence: z.number(),
      decision_maker: z.string(),
      decided_at: z.string().datetime().optional(),
    }),
    options_considered: z.array(z.object({
      name: z.string(),
      description: z.string(),
      was_selected: z.boolean(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    })),
    claims_and_evidence: z.array(z.object({
      claim_summary: z.string(),
      confidence: z.number(),
      evidence_sources: z.array(z.object({
        title: z.string(),
        source_type: z.string(),
        reliability: z.number(),
        redacted: z.boolean().default(false),
      })),
    })),
    risk_assessment: z.object({
      overall_risk: z.string(),
      factors: z.array(z.string()),
      mitigations: z.array(z.string()),
    }).optional(),
    limitations: z.array(z.object({
      type: z.string(),
      description: z.string(),
    })),
    audit_trail: z.array(z.object({
      event: z.string(),
      actor: z.string(),
      timestamp: z.string().datetime(),
    })),
  }),
  merkle_root: z.string(),
  signature: z.string().optional(),
  policy_labels_applied: z.array(z.string()).default([]),
  redactions_applied: z.number().int().default(0),
  tenant_id: z.string(),
});

export type DisclosurePack = z.infer<typeof DisclosurePackSchema>;

// ============================================================================
// Export all schemas and types
// ============================================================================

export const Schemas = {
  PolicyLabel: PolicyLabelSchema,
  Entity: EntitySchema,
  Claim: ClaimSchema,
  Evidence: EvidenceSchema,
  Decision: DecisionSchema,
  DecisionOption: DecisionOptionSchema,
  ProvenanceEvent: ProvenanceEventSchema,
  DecisionRunInput: DecisionRunInputSchema,
  DecisionRunOutput: DecisionRunOutputSchema,
  GraphRelationship: GraphRelationshipSchema,
  DisclosurePack: DisclosurePackSchema,
};
