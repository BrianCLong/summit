/**
 * @fileoverview Core types for IntelGraph Strands Agents integration
 * @module @intelgraph/strands-agents/types
 */

import { z } from 'zod';

// ============================================================================
// Entity Types
// ============================================================================

export const EntityTypeSchema = z.enum([
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

export type EntityType = z.infer<typeof EntityTypeSchema>;

export const EntitySchema = z.object({
  id: z.string().uuid(),
  type: EntityTypeSchema,
  label: z.string().min(1).max(500),
  properties: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  source: z.string().optional(),
  classification: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Entity = z.infer<typeof EntitySchema>;

// ============================================================================
// Relationship Types
// ============================================================================

export const RelationshipTypeSchema = z.enum([
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

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const RelationshipSchema = z.object({
  id: z.string().uuid(),
  type: RelationshipTypeSchema,
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  properties: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  weight: z.number().optional(),
  provenance: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});

export type Relationship = z.infer<typeof RelationshipSchema>;

// ============================================================================
// Investigation Types
// ============================================================================

export const InvestigationStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PENDING_REVIEW',
  'CLOSED',
  'ARCHIVED',
]);

export type InvestigationStatus = z.infer<typeof InvestigationStatusSchema>;

export const InvestigationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: InvestigationStatusSchema,
  hypothesis: z.string().optional(),
  entities: z.array(z.string().uuid()).default([]),
  relationships: z.array(z.string().uuid()).default([]),
  findings: z.array(z.string()).default([]),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Investigation = z.infer<typeof InvestigationSchema>;

// ============================================================================
// Query Types
// ============================================================================

export const QueryResultSchema = z.object({
  records: z.array(z.record(z.unknown())),
  summary: z.object({
    query: z.string(),
    counters: z.record(z.number()).optional(),
    executionTimeMs: z.number(),
  }),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

export const CypherQuerySchema = z.object({
  query: z.string().min(1),
  parameters: z.record(z.unknown()).optional(),
  database: z.string().optional(),
  readOnly: z.boolean().default(true),
});

export type CypherQuery = z.infer<typeof CypherQuerySchema>;

// ============================================================================
// Hypothesis Types
// ============================================================================

export const HypothesisSchema = z.object({
  id: z.string().uuid(),
  investigationId: z.string().uuid(),
  statement: z.string().min(1),
  supportingEvidence: z.array(z.string()).default([]),
  contradictingEvidence: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  status: z.enum(['PROPOSED', 'TESTING', 'SUPPORTED', 'REFUTED', 'INCONCLUSIVE']),
  reasoning: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Hypothesis = z.infer<typeof HypothesisSchema>;

// ============================================================================
// Agent Configuration Types
// ============================================================================

export const AgentRoleSchema = z.enum([
  'INVESTIGATOR',
  'ANALYST',
  'ENTITY_RESOLVER',
  'PATTERN_DETECTOR',
  'NARRATOR',
  'REVIEWER',
]);

export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const RiskTierSchema = z.enum([
  'AUTONOMOUS',    // Can execute without approval
  'SUPERVISED',    // Requires human confirmation
  'RESTRICTED',    // Requires elevated approval
  'PROHIBITED',    // Cannot be executed by agents
]);

export type RiskTier = z.infer<typeof RiskTierSchema>;

export const AgentConfigSchema = z.object({
  role: AgentRoleSchema,
  systemPrompt: z.string().optional(),
  maxIterations: z.number().min(1).max(50).default(10),
  maxTokens: z.number().min(100).max(100000).default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  riskTolerance: RiskTierSchema.default('SUPERVISED'),
  tools: z.array(z.string()).optional(),
  modelProvider: z.enum(['bedrock', 'anthropic', 'openai']).default('bedrock'),
  modelId: z.string().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// ============================================================================
// Memory Types
// ============================================================================

export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  agentId: z.string(),
  sessionId: z.string(),
  type: z.enum(['FACT', 'ENTITY', 'RELATIONSHIP', 'INSIGHT', 'ACTION', 'ERROR']),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  importance: z.number().min(0).max(1).default(0.5),
  timestamp: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

// ============================================================================
// Tool Result Types
// ============================================================================

export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.object({
    executionTimeMs: z.number(),
    tokensUsed: z.number().optional(),
    cacheHit: z.boolean().optional(),
  }).optional(),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;
