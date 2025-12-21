/**
 * AI Copilot Types and Contracts
 *
 * Defines the stable JSON shapes for copilot responses that the UI can render.
 * All responses include provenance citations and follow strict guardrails.
 */

import { z } from 'zod';

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Reference to an entity in the knowledge graph
 */
export const EntityReferenceSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  properties: z.record(z.any()).optional(),
});

export type EntityReference = z.infer<typeof EntityReferenceSchema>;

/**
 * Reference to a relationship in the knowledge graph
 */
export const RelationshipReferenceSchema = z.object({
  id: z.string(),
  type: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  label: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type RelationshipReference = z.infer<typeof RelationshipReferenceSchema>;

// ============================================================================
// Provenance and Citation Types
// ============================================================================

/**
 * Source type enumeration
 */
export const SourceTypeSchema = z.enum([
  'graph_entity',
  'graph_relationship',
  'evidence',
  'claim',
  'document',
  'external_api',
]);

export type SourceType = z.infer<typeof SourceTypeSchema>;

/**
 * A citation referencing a source of information
 */
export const CitationSchema = z.object({
  /** Unique citation ID (e.g., [1], [2]) */
  id: z.string(),
  /** Type of source */
  sourceType: SourceTypeSchema,
  /** ID of the source entity/evidence/claim */
  sourceId: z.string(),
  /** Human-readable label for the source */
  label: z.string(),
  /** Snippet or excerpt from the source */
  excerpt: z.string().optional(),
  /** Confidence in the citation's relevance */
  confidence: z.number().min(0).max(1),
  /** URL or deep link to the source (if applicable) */
  link: z.string().optional(),
  /** Policy labels on the source */
  policyLabels: z.array(z.string()).optional(),
  /** Whether any part of this citation was redacted */
  wasRedacted: z.boolean().default(false),
});

export type Citation = z.infer<typeof CitationSchema>;

/**
 * Provenance chain showing how information was derived
 */
export const ProvenanceSchema = z.object({
  /** Evidence IDs that support the answer */
  evidenceIds: z.array(z.string()),
  /** Claim IDs from the provenance ledger */
  claimIds: z.array(z.string()),
  /** Entity IDs from the graph */
  entityIds: z.array(z.string()),
  /** Relationship IDs forming the reasoning path */
  relationshipIds: z.array(z.string()),
  /** Transformation steps applied to derive the answer */
  transformations: z.array(z.string()).optional(),
  /** Confidence in the provenance chain */
  chainConfidence: z.number().min(0).max(1),
});

export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * A reasoning path explaining how an answer was derived
 */
export const WhyPathSchema = z.object({
  /** Starting entity */
  from: z.string(),
  /** Ending entity */
  to: z.string(),
  /** Relationship ID connecting them */
  relationshipId: z.string(),
  /** Relationship type */
  relationshipType: z.string(),
  /** Support score for this path */
  supportScore: z.number().min(0).max(1),
  /** Human-readable explanation */
  explanation: z.string().optional(),
});

export type WhyPath = z.infer<typeof WhyPathSchema>;

// ============================================================================
// Query Types
// ============================================================================

/**
 * Query cost estimate
 */
export const QueryCostEstimateSchema = z.object({
  nodesScanned: z.number().int().nonnegative(),
  edgesScanned: z.number().int().nonnegative(),
  costClass: z.enum(['low', 'medium', 'high', 'very-high']),
  estimatedTimeMs: z.number().nonnegative(),
  estimatedMemoryMb: z.number().nonnegative(),
  costDrivers: z.array(z.string()),
});

export type QueryCostEstimate = z.infer<typeof QueryCostEstimateSchema>;

/**
 * Query refinement suggestion when cost is too high
 */
export const QueryRefinementSchema = z.object({
  /** Original query or prompt */
  original: z.string(),
  /** Suggested refinement */
  suggested: z.string(),
  /** Why this refinement helps */
  reason: z.string(),
  /** Estimated cost reduction */
  estimatedCostReduction: z.enum(['low', 'medium', 'high']),
});

export type QueryRefinement = z.infer<typeof QueryRefinementSchema>;

/**
 * Compiled query preview (before execution)
 */
export const QueryPreviewSchema = z.object({
  /** Unique query ID for tracking */
  queryId: z.string(),
  /** Generated Cypher query */
  cypher: z.string(),
  /** Human-readable explanation of what the query does */
  explanation: z.string(),
  /** Estimated execution cost */
  cost: QueryCostEstimateSchema,
  /** Whether the query is safe to execute */
  isSafe: z.boolean(),
  /** Required parameter bindings */
  parameters: z.record(z.any()),
  /** Warnings about the query */
  warnings: z.array(z.string()),
  /** If over budget, suggested refinements */
  refinements: z.array(QueryRefinementSchema).optional(),
  /** Whether execution is allowed by policy */
  allowed: z.boolean(),
  /** If not allowed, reason for blocking */
  blockReason: z.string().optional(),
});

export type QueryPreview = z.infer<typeof QueryPreviewSchema>;

// ============================================================================
// Copilot Answer Types
// ============================================================================

/**
 * Redaction status indicating what information was filtered
 */
export const RedactionStatusSchema = z.object({
  /** Whether any content was redacted */
  wasRedacted: z.boolean(),
  /** Number of fields/values redacted */
  redactedCount: z.number().int().nonnegative(),
  /** Types of redactions applied */
  redactionTypes: z.array(z.string()),
  /** Whether the answer reflects uncertainty due to redaction */
  uncertaintyAcknowledged: z.boolean(),
});

export type RedactionStatus = z.infer<typeof RedactionStatusSchema>;

/**
 * Guardrail check result
 */
export const GuardrailCheckSchema = z.object({
  /** Whether the response passed all guardrails */
  passed: z.boolean(),
  /** Which guardrails were checked */
  checks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      reason: z.string().optional(),
    }),
  ),
  /** If failed, the primary reason */
  failureReason: z.string().optional(),
});

export type GuardrailCheck = z.infer<typeof GuardrailCheckSchema>;

/**
 * Complete copilot answer response
 */
export const CopilotAnswerSchema = z.object({
  /** Unique answer ID for tracking */
  answerId: z.string(),
  /** The generated answer text */
  answer: z.string(),
  /** Overall confidence in the answer (0-1) */
  confidence: z.number().min(0).max(1),
  /** Citations supporting the answer */
  citations: z.array(CitationSchema),
  /** Provenance chain for the answer */
  provenance: ProvenanceSchema,
  /** Reasoning paths explaining how the answer was derived */
  whyPaths: z.array(WhyPathSchema),
  /** Redaction status */
  redaction: RedactionStatusSchema,
  /** Guardrail check results */
  guardrails: GuardrailCheckSchema,
  /** Timestamp of generation */
  generatedAt: z.string().datetime(),
  /** Investigation context */
  investigationId: z.string(),
  /** Original query/question */
  originalQuery: z.string(),
  /** If query was generated, the Cypher query used */
  executedQuery: z.string().optional(),
  /** Any warnings about the answer */
  warnings: z.array(z.string()),
});

export type CopilotAnswer = z.infer<typeof CopilotAnswerSchema>;

/**
 * Copilot refusal response (when answer cannot be provided)
 */
export const CopilotRefusalSchema = z.object({
  /** Unique refusal ID for tracking */
  refusalId: z.string(),
  /** Why the request was refused */
  reason: z.string(),
  /** Category of refusal */
  category: z.enum([
    'policy_violation',
    'authorization_denied',
    'unsafe_query',
    'no_citations_available',
    'redaction_complete',
    'rate_limited',
    'internal_error',
  ]),
  /** Suggestions for the user */
  suggestions: z.array(z.string()),
  /** Timestamp */
  timestamp: z.string().datetime(),
  /** Audit ID for logging */
  auditId: z.string(),
});

export type CopilotRefusal = z.infer<typeof CopilotRefusalSchema>;

// ============================================================================
// Request Types
// ============================================================================

/**
 * Natural language query request
 */
export const NLQueryRequestSchema = z.object({
  /** Natural language question */
  query: z.string().min(1).max(2000),
  /** Investigation context */
  investigationId: z.string(),
  /** User making the request */
  userId: z.string().optional(),
  /** Tenant context */
  tenantId: z.string().optional(),
  /** Whether to only preview (dry-run) */
  dryRun: z.boolean().default(true),
  /** Focus entities to anchor the query */
  focusEntityIds: z.array(z.string()).optional(),
  /** Maximum hops for graph traversal */
  maxHops: z.number().int().min(1).max(5).default(2),
  /** Temperature for LLM generation */
  temperature: z.number().min(0).max(1).optional(),
});

export type NLQueryRequest = z.infer<typeof NLQueryRequestSchema>;

/**
 * GraphRAG request for retrieval-augmented generation
 */
export const GraphRAGRequestSchema = z.object({
  /** Question to answer */
  question: z.string().min(1).max(2000),
  /** Investigation context */
  investigationId: z.string(),
  /** User making the request */
  userId: z.string().optional(),
  /** Tenant context */
  tenantId: z.string().optional(),
  /** Focus entities */
  focusEntityIds: z.array(z.string()).optional(),
  /** Max hops for subgraph retrieval */
  maxHops: z.number().int().min(1).max(3).default(2),
  /** Temperature for LLM generation */
  temperature: z.number().min(0).max(1).default(0),
  /** Max tokens for response */
  maxTokens: z.number().int().min(100).max(2000).default(1000),
  /** Whether to include evidence from prov-ledger */
  includeEvidence: z.boolean().default(true),
  /** Whether to include claims from prov-ledger */
  includeClaims: z.boolean().default(true),
});

export type GraphRAGRequest = z.infer<typeof GraphRAGRequestSchema>;

// ============================================================================
// Audit and Logging Types
// ============================================================================

/**
 * Risk level for prompts
 */
export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

/**
 * Risky prompt log entry for red-team review
 */
export const RiskyPromptLogSchema = z.object({
  /** Unique log ID */
  logId: z.string(),
  /** Hash of the prompt (for privacy) */
  promptHash: z.string(),
  /** Sanitized/redacted version of the prompt */
  sanitizedPrompt: z.string(),
  /** Risk level */
  riskLevel: RiskLevelSchema,
  /** Risk factors detected */
  riskFactors: z.array(z.string()),
  /** Whether the prompt was blocked */
  blocked: z.boolean(),
  /** Block reason if applicable */
  blockReason: z.string().optional(),
  /** User ID (hashed for privacy) */
  userIdHash: z.string().optional(),
  /** Tenant ID */
  tenantId: z.string().optional(),
  /** Timestamp */
  timestamp: z.string().datetime(),
  /** Requires red-team review */
  requiresReview: z.boolean(),
});

export type RiskyPromptLog = z.infer<typeof RiskyPromptLogSchema>;

// ============================================================================
// Response Union Types
// ============================================================================

/**
 * Copilot response - either an answer or a refusal
 */
export type CopilotResponse =
  | { type: 'answer'; data: CopilotAnswer }
  | { type: 'refusal'; data: CopilotRefusal }
  | { type: 'preview'; data: QueryPreview };

/**
 * Type guard for answer response
 */
export function isAnswer(
  response: CopilotResponse,
): response is { type: 'answer'; data: CopilotAnswer } {
  return response.type === 'answer';
}

/**
 * Type guard for refusal response
 */
export function isRefusal(
  response: CopilotResponse,
): response is { type: 'refusal'; data: CopilotRefusal } {
  return response.type === 'refusal';
}

/**
 * Type guard for preview response
 */
export function isPreview(
  response: CopilotResponse,
): response is { type: 'preview'; data: QueryPreview } {
  return response.type === 'preview';
}
