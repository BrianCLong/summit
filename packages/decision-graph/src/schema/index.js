"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schemas = exports.DisclosurePackSchema = exports.GraphRelationshipSchema = exports.GraphRelationshipType = exports.DecisionRunOutputSchema = exports.DecisionRunInputSchema = exports.ProvenanceEventSchema = exports.ProvenanceEventType = exports.DecisionSchema = exports.DecisionOptionSchema = exports.DecisionType = exports.DecisionStatus = exports.EvidenceSchema = exports.EvidenceType = exports.ClaimSchema = exports.ClaimConfidenceLevel = exports.ClaimStatus = exports.EntitySchema = exports.EntityType = exports.PolicyLabelSchema = exports.SensitivityLevel = void 0;
const zod_1 = require("zod");
// ============================================================================
// Policy and Classification Labels
// ============================================================================
exports.SensitivityLevel = zod_1.z.enum([
    'public',
    'internal',
    'confidential',
    'restricted',
    'classified',
]);
exports.PolicyLabelSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    type: zod_1.z.enum(['sensitivity', 'origin', 'clearance', 'legal_basis', 'retention']),
    value: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    created_at: zod_1.z.string().datetime(),
    created_by: zod_1.z.string(),
});
// ============================================================================
// Entity Schema (Extended)
// ============================================================================
exports.EntityType = zod_1.z.enum([
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
exports.EntitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.EntityType,
    name: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    policy_labels: zod_1.z.array(zod_1.z.string()).default([]),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
    created_by: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    version: zod_1.z.number().int().positive().default(1),
    valid_from: zod_1.z.string().datetime().optional(),
    valid_to: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Claim Schema
// ============================================================================
exports.ClaimStatus = zod_1.z.enum([
    'draft',
    'pending_review',
    'verified',
    'disputed',
    'retracted',
    'superseded',
]);
exports.ClaimConfidenceLevel = zod_1.z.enum([
    'low', // <50% confidence
    'medium', // 50-75% confidence
    'high', // 75-90% confidence
    'very_high', // 90-99% confidence
    'certain', // 99%+ confidence
]);
exports.ClaimSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entity_id: zod_1.z.string().uuid(), // The entity this claim is about
    claim_type: zod_1.z.string().min(1).max(100), // e.g., 'financial_status', 'security_risk', 'relationship'
    assertion: zod_1.z.string().min(1).max(2000), // The actual claim text
    confidence_score: zod_1.z.number().min(0).max(1).default(0.5),
    confidence_level: exports.ClaimConfidenceLevel.default('medium'),
    status: exports.ClaimStatus.default('draft'),
    evidence_ids: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    supporting_claim_ids: zod_1.z.array(zod_1.z.string().uuid()).default([]), // Claims that support this claim
    contradicting_claim_ids: zod_1.z.array(zod_1.z.string().uuid()).default([]), // Claims that contradict this
    source_type: zod_1.z.enum(['human', 'ai', 'automated', 'external']),
    source_id: zod_1.z.string(), // User ID, model ID, or external system ID
    policy_labels: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    hash: zod_1.z.string(), // SHA-256 of claim content for integrity
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
    created_by: zod_1.z.string(),
    reviewed_by: zod_1.z.string().optional(),
    reviewed_at: zod_1.z.string().datetime().optional(),
    tenant_id: zod_1.z.string(),
    version: zod_1.z.number().int().positive().default(1),
    superseded_by: zod_1.z.string().uuid().optional(), // ID of newer claim version
});
// ============================================================================
// Evidence Schema
// ============================================================================
exports.EvidenceType = zod_1.z.enum([
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
exports.EvidenceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.EvidenceType,
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    source_uri: zod_1.z.string().max(2000), // URL, file path, or reference
    source_type: zod_1.z.string(), // e.g., 'internal_doc', 'external_api', 'user_upload'
    content_hash: zod_1.z.string(), // SHA-256 of source content
    content_type: zod_1.z.string().optional(), // MIME type
    file_size_bytes: zod_1.z.number().int().optional(),
    extracted_text: zod_1.z.string().optional(), // For searchability
    extraction_metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    reliability_score: zod_1.z.number().min(0).max(1).default(0.5),
    freshness_date: zod_1.z.string().datetime(), // When the evidence was created/captured
    retrieval_date: zod_1.z.string().datetime(), // When we retrieved it
    expiry_date: zod_1.z.string().datetime().optional(), // When it becomes stale
    license_id: zod_1.z.string().optional(), // License registry reference
    policy_labels: zod_1.z.array(zod_1.z.string()).default([]),
    transform_chain: zod_1.z.array(zod_1.z.object({
        transform_type: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        actor_id: zod_1.z.string(),
        config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        input_hash: zod_1.z.string(),
        output_hash: zod_1.z.string(),
    })).default([]),
    created_at: zod_1.z.string().datetime(),
    created_by: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
});
// ============================================================================
// Decision Schema
// ============================================================================
exports.DecisionStatus = zod_1.z.enum([
    'draft',
    'pending_review',
    'pending_approval',
    'approved',
    'rejected',
    'implemented',
    'superseded',
    'reverted',
]);
exports.DecisionType = zod_1.z.enum([
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
exports.DecisionOptionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string(),
    pros: zod_1.z.array(zod_1.z.string()).default([]),
    cons: zod_1.z.array(zod_1.z.string()).default([]),
    risk_level: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    supporting_claim_ids: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    estimated_impact: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    selected: zod_1.z.boolean().default(false),
});
exports.DecisionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.DecisionType,
    title: zod_1.z.string().min(1).max(500),
    question: zod_1.z.string().min(1).max(2000), // The decision question
    context: zod_1.z.string().max(10000), // Background context
    constraints: zod_1.z.array(zod_1.z.string()).default([]), // Decision constraints
    options: zod_1.z.array(exports.DecisionOptionSchema).min(1),
    selected_option_id: zod_1.z.string().uuid().optional(),
    recommendation: zod_1.z.string().optional(), // AI recommendation text
    rationale: zod_1.z.string().optional(), // Why this decision was made
    claim_ids: zod_1.z.array(zod_1.z.string().uuid()).default([]), // Claims considered
    evidence_ids: zod_1.z.array(zod_1.z.string().uuid()).default([]), // Evidence consulted
    entity_ids: zod_1.z.array(zod_1.z.string().uuid()).default([]), // Entities affected
    status: exports.DecisionStatus.default('draft'),
    decision_maker_id: zod_1.z.string(), // Who made the final decision
    decision_maker_type: zod_1.z.enum(['human', 'ai', 'hybrid']),
    maestro_run_id: zod_1.z.string().optional(), // Link to orchestration run
    confidence_score: zod_1.z.number().min(0).max(1).optional(),
    risk_assessment: zod_1.z.object({
        overall_risk: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
        risk_factors: zod_1.z.array(zod_1.z.string()).default([]),
        mitigations: zod_1.z.array(zod_1.z.string()).default([]),
    }).optional(),
    policy_labels: zod_1.z.array(zod_1.z.string()).default([]),
    approval_chain: zod_1.z.array(zod_1.z.object({
        approver_id: zod_1.z.string(),
        role: zod_1.z.string(),
        status: zod_1.z.enum(['pending', 'approved', 'rejected']),
        timestamp: zod_1.z.string().datetime().optional(),
        comment: zod_1.z.string().optional(),
    })).default([]),
    hash: zod_1.z.string(), // SHA-256 for integrity
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
    decided_at: zod_1.z.string().datetime().optional(),
    created_by: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    version: zod_1.z.number().int().positive().default(1),
    superseded_by: zod_1.z.string().uuid().optional(),
});
// ============================================================================
// Provenance Chain Schema
// ============================================================================
exports.ProvenanceEventType = zod_1.z.enum([
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
exports.ProvenanceEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    event_type: exports.ProvenanceEventType,
    subject_type: zod_1.z.enum(['entity', 'claim', 'evidence', 'decision']),
    subject_id: zod_1.z.string().uuid(),
    actor_id: zod_1.z.string(),
    actor_type: zod_1.z.enum(['user', 'system', 'ai_model', 'external']),
    timestamp: zod_1.z.string().datetime(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    before_hash: zod_1.z.string().optional(), // Hash before change
    after_hash: zod_1.z.string(), // Hash after change
    parent_event_id: zod_1.z.string().uuid().optional(), // For event chains
    tenant_id: zod_1.z.string(),
});
// ============================================================================
// Decision Run Artifacts Schema (for Maestro integration)
// ============================================================================
exports.DecisionRunInputSchema = zod_1.z.object({
    question: zod_1.z.string().min(1),
    context: zod_1.z.string().optional(),
    entity_ids: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    constraints: zod_1.z.array(zod_1.z.string()).default([]),
    options: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string(),
    })).optional(),
    max_evidence_items: zod_1.z.number().int().positive().default(20),
    require_human_approval: zod_1.z.boolean().default(true),
    confidence_threshold: zod_1.z.number().min(0).max(1).default(0.7),
});
exports.DecisionRunOutputSchema = zod_1.z.object({
    decision_id: zod_1.z.string().uuid(),
    selected_option: zod_1.z.string(),
    recommendation: zod_1.z.string(),
    rationale: zod_1.z.string(),
    confidence_score: zod_1.z.number().min(0).max(1),
    claims_referenced: zod_1.z.array(zod_1.z.object({
        claim_id: zod_1.z.string().uuid(),
        relevance_score: zod_1.z.number().min(0).max(1),
        summary: zod_1.z.string(),
    })),
    evidence_referenced: zod_1.z.array(zod_1.z.object({
        evidence_id: zod_1.z.string().uuid(),
        relevance_score: zod_1.z.number().min(0).max(1),
        summary: zod_1.z.string(),
    })),
    risk_factors: zod_1.z.array(zod_1.z.string()),
    known_limitations: zod_1.z.array(zod_1.z.string()),
    requires_approval: zod_1.z.boolean(),
    cost_usd: zod_1.z.number().optional(),
    duration_ms: zod_1.z.number().int(),
    model_versions: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
});
// ============================================================================
// Graph Relationship Types
// ============================================================================
exports.GraphRelationshipType = zod_1.z.enum([
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
exports.GraphRelationshipSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.GraphRelationshipType,
    source_id: zod_1.z.string().uuid(),
    source_type: zod_1.z.enum(['entity', 'claim', 'evidence', 'decision']),
    target_id: zod_1.z.string().uuid(),
    target_type: zod_1.z.enum(['entity', 'claim', 'evidence', 'decision']),
    weight: zod_1.z.number().min(0).max(1).default(1),
    confidence: zod_1.z.number().min(0).max(1).default(1),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    valid_from: zod_1.z.string().datetime().optional(),
    valid_to: zod_1.z.string().datetime().optional(),
    created_at: zod_1.z.string().datetime(),
    created_by: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
});
// ============================================================================
// Disclosure Pack Schema
// ============================================================================
exports.DisclosurePackSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    version: zod_1.z.string(),
    decision_id: zod_1.z.string().uuid(),
    generated_at: zod_1.z.string().datetime(),
    generated_by: zod_1.z.string(),
    format: zod_1.z.enum(['markdown', 'html', 'pdf', 'json']),
    sections: zod_1.z.object({
        summary: zod_1.z.object({
            question: zod_1.z.string(),
            answer: zod_1.z.string(),
            confidence: zod_1.z.number(),
            decision_maker: zod_1.z.string(),
            decided_at: zod_1.z.string().datetime().optional(),
        }),
        options_considered: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            was_selected: zod_1.z.boolean(),
            pros: zod_1.z.array(zod_1.z.string()),
            cons: zod_1.z.array(zod_1.z.string()),
        })),
        claims_and_evidence: zod_1.z.array(zod_1.z.object({
            claim_summary: zod_1.z.string(),
            confidence: zod_1.z.number(),
            evidence_sources: zod_1.z.array(zod_1.z.object({
                title: zod_1.z.string(),
                source_type: zod_1.z.string(),
                reliability: zod_1.z.number(),
                redacted: zod_1.z.boolean().default(false),
            })),
        })),
        risk_assessment: zod_1.z.object({
            overall_risk: zod_1.z.string(),
            factors: zod_1.z.array(zod_1.z.string()),
            mitigations: zod_1.z.array(zod_1.z.string()),
        }).optional(),
        limitations: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            description: zod_1.z.string(),
        })),
        audit_trail: zod_1.z.array(zod_1.z.object({
            event: zod_1.z.string(),
            actor: zod_1.z.string(),
            timestamp: zod_1.z.string().datetime(),
        })),
    }),
    merkle_root: zod_1.z.string(),
    signature: zod_1.z.string().optional(),
    policy_labels_applied: zod_1.z.array(zod_1.z.string()).default([]),
    redactions_applied: zod_1.z.number().int().default(0),
    tenant_id: zod_1.z.string(),
});
// ============================================================================
// Export all schemas and types
// ============================================================================
exports.Schemas = {
    PolicyLabel: exports.PolicyLabelSchema,
    Entity: exports.EntitySchema,
    Claim: exports.ClaimSchema,
    Evidence: exports.EvidenceSchema,
    Decision: exports.DecisionSchema,
    DecisionOption: exports.DecisionOptionSchema,
    ProvenanceEvent: exports.ProvenanceEventSchema,
    DecisionRunInput: exports.DecisionRunInputSchema,
    DecisionRunOutput: exports.DecisionRunOutputSchema,
    GraphRelationship: exports.GraphRelationshipSchema,
    DisclosurePack: exports.DisclosurePackSchema,
};
