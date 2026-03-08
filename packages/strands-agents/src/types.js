"use strict";
/**
 * @fileoverview Core types for IntelGraph Strands Agents integration
 * @module @intelgraph/strands-agents/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolResultSchema = exports.MemoryEntrySchema = exports.AgentConfigSchema = exports.RiskTierSchema = exports.AgentRoleSchema = exports.HypothesisSchema = exports.CypherQuerySchema = exports.QueryResultSchema = exports.InvestigationSchema = exports.InvestigationStatusSchema = exports.RelationshipSchema = exports.RelationshipTypeSchema = exports.EntitySchema = exports.EntityTypeSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Entity Types
// ============================================================================
exports.EntityTypeSchema = zod_1.z.enum([
    'PERSON',
    'ORGANIZATION',
    'LOCATION',
    'EVENT',
    'DOCUMENT',
    'COMMUNICATION',
    'FINANCIAL_TRANSACTION',
    'VEHICLE',
    'WEAPON',
    'DEVICE',
    'ACCOUNT',
    'THREAT_ACTOR',
    'MALWARE',
    'VULNERABILITY',
    'INDICATOR',
    'CUSTOM',
]);
exports.EntitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.EntityTypeSchema,
    label: zod_1.z.string().min(1).max(500),
    properties: zod_1.z.record(zod_1.z.unknown()).optional(),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    source: zod_1.z.string().optional(),
    classification: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime().optional(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Relationship Types
// ============================================================================
exports.RelationshipTypeSchema = zod_1.z.enum([
    'KNOWS',
    'WORKS_FOR',
    'MEMBER_OF',
    'LOCATED_AT',
    'OWNS',
    'COMMUNICATES_WITH',
    'TRANSACTED_WITH',
    'RELATED_TO',
    'ASSOCIATED_WITH',
    'TARGETS',
    'USES',
    'ATTRIBUTED_TO',
    'INDICATES',
    'DERIVED_FROM',
    'CUSTOM',
]);
exports.RelationshipSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.RelationshipTypeSchema,
    sourceId: zod_1.z.string().uuid(),
    targetId: zod_1.z.string().uuid(),
    properties: zod_1.z.record(zod_1.z.unknown()).optional(),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    weight: zod_1.z.number().optional(),
    provenance: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Investigation Types
// ============================================================================
exports.InvestigationStatusSchema = zod_1.z.enum([
    'DRAFT',
    'ACTIVE',
    'PENDING_REVIEW',
    'CLOSED',
    'ARCHIVED',
]);
exports.InvestigationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    status: exports.InvestigationStatusSchema,
    hypothesis: zod_1.z.string().optional(),
    entities: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    relationships: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    findings: zod_1.z.array(zod_1.z.string()).default([]),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// Query Types
// ============================================================================
exports.QueryResultSchema = zod_1.z.object({
    records: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())),
    summary: zod_1.z.object({
        query: zod_1.z.string(),
        counters: zod_1.z.record(zod_1.z.number()).optional(),
        executionTimeMs: zod_1.z.number(),
    }),
});
exports.CypherQuerySchema = zod_1.z.object({
    query: zod_1.z.string().min(1),
    parameters: zod_1.z.record(zod_1.z.unknown()).optional(),
    database: zod_1.z.string().optional(),
    readOnly: zod_1.z.boolean().default(true),
});
// ============================================================================
// Hypothesis Types
// ============================================================================
exports.HypothesisSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    investigationId: zod_1.z.string().uuid(),
    statement: zod_1.z.string().min(1),
    supportingEvidence: zod_1.z.array(zod_1.z.string()).default([]),
    contradictingEvidence: zod_1.z.array(zod_1.z.string()).default([]),
    confidence: zod_1.z.number().min(0).max(1),
    status: zod_1.z.enum(['PROPOSED', 'TESTING', 'SUPPORTED', 'REFUTED', 'INCONCLUSIVE']),
    reasoning: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime(),
});
// ============================================================================
// Agent Configuration Types
// ============================================================================
exports.AgentRoleSchema = zod_1.z.enum([
    'INVESTIGATOR',
    'ANALYST',
    'ENTITY_RESOLVER',
    'PATTERN_DETECTOR',
    'NARRATOR',
    'REVIEWER',
]);
exports.RiskTierSchema = zod_1.z.enum([
    'AUTONOMOUS', // Can execute without approval
    'SUPERVISED', // Requires human confirmation
    'RESTRICTED', // Requires elevated approval
    'PROHIBITED', // Cannot be executed by agents
]);
exports.AgentConfigSchema = zod_1.z.object({
    role: exports.AgentRoleSchema,
    systemPrompt: zod_1.z.string().optional(),
    maxIterations: zod_1.z.number().min(1).max(50).default(10),
    maxTokens: zod_1.z.number().min(100).max(100000).default(4096),
    temperature: zod_1.z.number().min(0).max(2).default(0.7),
    riskTolerance: exports.RiskTierSchema.default('SUPERVISED'),
    tools: zod_1.z.array(zod_1.z.string()).optional(),
    modelProvider: zod_1.z.enum(['bedrock', 'anthropic', 'openai']).default('bedrock'),
    modelId: zod_1.z.string().optional(),
});
// ============================================================================
// Memory Types
// ============================================================================
exports.MemoryEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agentId: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    type: zod_1.z.enum(['FACT', 'ENTITY', 'RELATIONSHIP', 'INSIGHT', 'ACTION', 'ERROR']),
    content: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    importance: zod_1.z.number().min(0).max(1).default(0.5),
    timestamp: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// Tool Result Types
// ============================================================================
exports.ToolResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.unknown().optional(),
    error: zod_1.z.string().optional(),
    metadata: zod_1.z.object({
        executionTimeMs: zod_1.z.number(),
        tokensUsed: zod_1.z.number().optional(),
        cacheHit: zod_1.z.boolean().optional(),
    }).optional(),
});
