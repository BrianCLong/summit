"use strict";
/**
 * AI Copilot Types and Contracts
 *
 * Defines the stable JSON shapes for copilot responses that the UI can render.
 * All responses include provenance citations and follow strict guardrails.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskyPromptLogSchema = exports.RiskLevelSchema = exports.GraphRAGRequestSchema = exports.NLQueryRequestSchema = exports.CopilotRefusalSchema = exports.CopilotAnswerSchema = exports.GovernanceVerdictSchema = exports.GovernanceVerdictTypeSchema = exports.GuardrailCheckSchema = exports.RedactionStatusSchema = exports.QueryPreviewSchema = exports.QueryRefinementSchema = exports.QueryCostEstimateSchema = exports.WhyPathSchema = exports.ProvenanceSchema = exports.CitationSchema = exports.SourceTypeSchema = exports.RelationshipReferenceSchema = exports.EntityReferenceSchema = void 0;
exports.isAnswer = isAnswer;
exports.isRefusal = isRefusal;
exports.isPreview = isPreview;
const zod_1 = require("zod");
// ============================================================================
// Core Entity Types
// ============================================================================
/**
 * Reference to an entity in the knowledge graph
 */
exports.EntityReferenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    label: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    properties: zod_1.z.record(zod_1.z.any()).optional(),
});
/**
 * Reference to a relationship in the knowledge graph
 */
exports.RelationshipReferenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    label: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
// ============================================================================
// Provenance and Citation Types
// ============================================================================
/**
 * Source type enumeration
 */
exports.SourceTypeSchema = zod_1.z.enum([
    'graph_entity',
    'graph_relationship',
    'evidence',
    'claim',
    'document',
    'external_api',
]);
/**
 * A citation referencing a source of information
 */
exports.CitationSchema = zod_1.z.object({
    /** Unique citation ID (e.g., [1], [2]) */
    id: zod_1.z.string(),
    /** Type of source */
    sourceType: exports.SourceTypeSchema,
    /** ID of the source entity/evidence/claim */
    sourceId: zod_1.z.string(),
    /** Human-readable label for the source */
    label: zod_1.z.string(),
    /** Snippet or excerpt from the source */
    excerpt: zod_1.z.string().optional(),
    /** Confidence in the citation's relevance */
    confidence: zod_1.z.number().min(0).max(1),
    /** URL or deep link to the source (if applicable) */
    link: zod_1.z.string().optional(),
    /** Policy labels on the source */
    policyLabels: zod_1.z.array(zod_1.z.string()).optional(),
    /** Whether any part of this citation was redacted */
    wasRedacted: zod_1.z.boolean().default(false),
});
/**
 * Provenance chain showing how information was derived
 */
exports.ProvenanceSchema = zod_1.z.object({
    /** Evidence IDs that support the answer */
    evidenceIds: zod_1.z.array(zod_1.z.string()),
    /** Claim IDs from the provenance ledger */
    claimIds: zod_1.z.array(zod_1.z.string()),
    /** Entity IDs from the graph */
    entityIds: zod_1.z.array(zod_1.z.string()),
    /** Relationship IDs forming the reasoning path */
    relationshipIds: zod_1.z.array(zod_1.z.string()),
    /** Transformation steps applied to derive the answer */
    transformations: zod_1.z.array(zod_1.z.string()).optional(),
    /** Confidence in the provenance chain */
    chainConfidence: zod_1.z.number().min(0).max(1),
});
/**
 * A reasoning path explaining how an answer was derived
 */
exports.WhyPathSchema = zod_1.z.object({
    /** Starting entity */
    from: zod_1.z.string(),
    /** Ending entity */
    to: zod_1.z.string(),
    /** Relationship ID connecting them */
    relationshipId: zod_1.z.string(),
    /** Relationship type */
    relationshipType: zod_1.z.string(),
    /** Support score for this path */
    supportScore: zod_1.z.number().min(0).max(1),
    /** Human-readable explanation */
    explanation: zod_1.z.string().optional(),
});
// ============================================================================
// Query Types
// ============================================================================
/**
 * Query cost estimate
 */
exports.QueryCostEstimateSchema = zod_1.z.object({
    nodesScanned: zod_1.z.number().int().nonnegative(),
    edgesScanned: zod_1.z.number().int().nonnegative(),
    costClass: zod_1.z.enum(['low', 'medium', 'high', 'very-high']),
    estimatedTimeMs: zod_1.z.number().nonnegative(),
    estimatedMemoryMb: zod_1.z.number().nonnegative(),
    costDrivers: zod_1.z.array(zod_1.z.string()),
});
/**
 * Query refinement suggestion when cost is too high
 */
exports.QueryRefinementSchema = zod_1.z.object({
    /** Original query or prompt */
    original: zod_1.z.string(),
    /** Suggested refinement */
    suggested: zod_1.z.string(),
    /** Why this refinement helps */
    reason: zod_1.z.string(),
    /** Estimated cost reduction */
    estimatedCostReduction: zod_1.z.enum(['low', 'medium', 'high']),
});
/**
 * Compiled query preview (before execution)
 */
exports.QueryPreviewSchema = zod_1.z.object({
    /** Unique query ID for tracking */
    queryId: zod_1.z.string(),
    /** Generated Cypher query */
    cypher: zod_1.z.string(),
    /** Human-readable explanation of what the query does */
    explanation: zod_1.z.string(),
    /** Estimated execution cost */
    cost: exports.QueryCostEstimateSchema,
    /** Whether the query is safe to execute */
    isSafe: zod_1.z.boolean(),
    /** Required parameter bindings */
    parameters: zod_1.z.record(zod_1.z.any()),
    /** Warnings about the query */
    warnings: zod_1.z.array(zod_1.z.string()),
    /** If over budget, suggested refinements */
    refinements: zod_1.z.array(exports.QueryRefinementSchema).optional(),
    /** Whether execution is allowed by policy */
    allowed: zod_1.z.boolean(),
    /** If not allowed, reason for blocking */
    blockReason: zod_1.z.string().optional(),
});
// ============================================================================
// Copilot Answer Types
// ============================================================================
/**
 * Redaction status indicating what information was filtered
 */
exports.RedactionStatusSchema = zod_1.z.object({
    /** Whether any content was redacted */
    wasRedacted: zod_1.z.boolean(),
    /** Number of fields/values redacted */
    redactedCount: zod_1.z.number().int().nonnegative(),
    /** Types of redactions applied */
    redactionTypes: zod_1.z.array(zod_1.z.string()),
    /** Whether the answer reflects uncertainty due to redaction */
    uncertaintyAcknowledged: zod_1.z.boolean(),
});
/**
 * Guardrail check result
 */
exports.GuardrailCheckSchema = zod_1.z.object({
    /** Whether the response passed all guardrails */
    passed: zod_1.z.boolean(),
    /** Which guardrails were checked */
    checks: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        passed: zod_1.z.boolean(),
        reason: zod_1.z.string().optional(),
    })),
    /** If failed, the primary reason */
    failureReason: zod_1.z.string().optional(),
});
// ============================================================================
// Governance Types
// ============================================================================
/**
 * Governance verdict type - REQUIRED for all copilot outputs
 */
exports.GovernanceVerdictTypeSchema = zod_1.z.enum([
    'APPROVED',
    'REJECTED',
    'REQUIRES_REVIEW',
]);
/**
 * Governance verdict schema
 *
 * Ensures all AI/copilot outputs include governance evaluation per SOC 2 controls
 * (CC6.1, CC7.2, PI1.3)
 */
exports.GovernanceVerdictSchema = zod_1.z.object({
    /** Verdict decision */
    verdict: exports.GovernanceVerdictTypeSchema,
    /** Policy evaluated */
    policy: zod_1.z.string(),
    /** Rationale for verdict */
    rationale: zod_1.z.string(),
    /** ISO 8601 timestamp */
    timestamp: zod_1.z.string().datetime(),
    /** System/agent that evaluated */
    evaluatedBy: zod_1.z.string(),
    /** Confidence 0-1 */
    confidence: zod_1.z.number().min(0).max(1),
    /** Optional metadata */
    metadata: zod_1.z
        .object({
        policyVersion: zod_1.z.string().optional(),
        evidence: zod_1.z.array(zod_1.z.string()).optional(),
        riskLevel: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
        soc2Controls: zod_1.z.array(zod_1.z.string()).optional(),
        remediationSuggestions: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .passthrough()
        .optional(),
});
/**
 * Complete copilot answer response
 */
exports.CopilotAnswerSchema = zod_1.z.object({
    /** Unique answer ID for tracking */
    answerId: zod_1.z.string(),
    /** The generated answer text */
    answer: zod_1.z.string(),
    /** Overall confidence in the answer (0-1) */
    confidence: zod_1.z.number().min(0).max(1),
    /** Citations supporting the answer */
    citations: zod_1.z.array(exports.CitationSchema),
    /** Provenance chain for the answer */
    provenance: exports.ProvenanceSchema,
    /** Reasoning paths explaining how the answer was derived */
    whyPaths: zod_1.z.array(exports.WhyPathSchema),
    /** Redaction status */
    redaction: exports.RedactionStatusSchema,
    /** Guardrail check results */
    guardrails: exports.GuardrailCheckSchema,
    /** REQUIRED: Governance verdict for this answer */
    governanceVerdict: exports.GovernanceVerdictSchema,
    /** Timestamp of generation */
    generatedAt: zod_1.z.string().datetime(),
    /** Investigation context */
    investigationId: zod_1.z.string(),
    /** Original query/question */
    originalQuery: zod_1.z.string(),
    /** If query was generated, the Cypher query used */
    executedQuery: zod_1.z.string().optional(),
    /** Any warnings about the answer */
    warnings: zod_1.z.array(zod_1.z.string()),
});
/**
 * Copilot refusal response (when answer cannot be provided)
 */
exports.CopilotRefusalSchema = zod_1.z.object({
    /** Unique refusal ID for tracking */
    refusalId: zod_1.z.string(),
    /** Why the request was refused */
    reason: zod_1.z.string(),
    /** Category of refusal */
    category: zod_1.z.enum([
        'policy_violation',
        'authorization_denied',
        'unsafe_query',
        'no_citations_available',
        'redaction_complete',
        'rate_limited',
        'internal_error',
    ]),
    /** Suggestions for the user */
    suggestions: zod_1.z.array(zod_1.z.string()),
    /** Timestamp */
    timestamp: zod_1.z.string().datetime(),
    /** Audit ID for logging */
    auditId: zod_1.z.string(),
    /** REQUIRED: Governance verdict for this refusal */
    governanceVerdict: exports.GovernanceVerdictSchema,
});
// ============================================================================
// Request Types
// ============================================================================
/**
 * Natural language query request
 */
exports.NLQueryRequestSchema = zod_1.z.object({
    /** Natural language question */
    query: zod_1.z.string().min(1).max(2000),
    /** Investigation context */
    investigationId: zod_1.z.string(),
    /** User making the request */
    userId: zod_1.z.string().optional(),
    /** Tenant context */
    tenantId: zod_1.z.string().optional(),
    /** Whether to only preview (dry-run) */
    dryRun: zod_1.z.boolean().default(true),
    /** Focus entities to anchor the query */
    focusEntityIds: zod_1.z.array(zod_1.z.string()).optional(),
    /** Maximum hops for graph traversal */
    maxHops: zod_1.z.number().int().min(1).max(5).default(2),
    /** Temperature for LLM generation */
    temperature: zod_1.z.number().min(0).max(1).optional(),
});
/**
 * GraphRAG request for retrieval-augmented generation
 */
exports.GraphRAGRequestSchema = zod_1.z.object({
    /** Question to answer */
    question: zod_1.z.string().min(1).max(2000),
    /** Investigation context */
    investigationId: zod_1.z.string(),
    /** User making the request */
    userId: zod_1.z.string().optional(),
    /** Tenant context */
    tenantId: zod_1.z.string().optional(),
    /** Focus entities */
    focusEntityIds: zod_1.z.array(zod_1.z.string()).optional(),
    /** Max hops for subgraph retrieval */
    maxHops: zod_1.z.number().int().min(1).max(3).default(2),
    /** Temperature for LLM generation */
    temperature: zod_1.z.number().min(0).max(1).default(0),
    /** Max tokens for response */
    maxTokens: zod_1.z.number().int().min(100).max(2000).default(1000),
    /** Whether to include evidence from prov-ledger */
    includeEvidence: zod_1.z.boolean().default(true),
    /** Whether to include claims from prov-ledger */
    includeClaims: zod_1.z.boolean().default(true),
});
// ============================================================================
// Audit and Logging Types
// ============================================================================
/**
 * Risk level for prompts
 */
exports.RiskLevelSchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
/**
 * Risky prompt log entry for red-team review
 */
exports.RiskyPromptLogSchema = zod_1.z.object({
    /** Unique log ID */
    logId: zod_1.z.string(),
    /** Hash of the prompt (for privacy) */
    promptHash: zod_1.z.string(),
    /** Sanitized/redacted version of the prompt */
    sanitizedPrompt: zod_1.z.string(),
    /** Risk level */
    riskLevel: exports.RiskLevelSchema,
    /** Risk factors detected */
    riskFactors: zod_1.z.array(zod_1.z.string()),
    /** Whether the prompt was blocked */
    blocked: zod_1.z.boolean(),
    /** Block reason if applicable */
    blockReason: zod_1.z.string().optional(),
    /** User ID (hashed for privacy) */
    userIdHash: zod_1.z.string().optional(),
    /** Tenant ID */
    tenantId: zod_1.z.string().optional(),
    /** Timestamp */
    timestamp: zod_1.z.string().datetime(),
    /** Requires red-team review */
    requiresReview: zod_1.z.boolean(),
});
/**
 * Type guard for answer response
 */
function isAnswer(response) {
    return response.type === 'answer';
}
/**
 * Type guard for refusal response
 */
function isRefusal(response) {
    return response.type === 'refusal';
}
/**
 * Type guard for preview response
 */
function isPreview(response) {
    return response.type === 'preview';
}
