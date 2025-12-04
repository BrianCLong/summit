/**
 * ChatOps Core Type Definitions
 *
 * This file defines all interfaces for the Summit ChatOps system including:
 * - Multi-model intent routing
 * - Hierarchical memory system
 * - Bounded autonomy engine
 * - Platform adapters (Slack, Teams, Web)
 */

import { z } from 'zod';

// =============================================================================
// INTENT ROUTER TYPES
// =============================================================================

/**
 * OSINT entity types for threat intelligence extraction
 */
export type OSINTEntityType =
  | 'THREAT_ACTOR'
  | 'INFRASTRUCTURE'
  | 'MALWARE'
  | 'CAMPAIGN'
  | 'TTP'
  | 'INDICATOR'
  | 'VULNERABILITY'
  | 'NARRATIVE';

/**
 * Extracted OSINT entity with provenance
 */
export interface OSINTEntity {
  type: OSINTEntityType;
  value: string;
  confidence: number;
  source: string; // Which model extracted this
  linkedGraphId?: string; // If matched to existing KG entity
  mitreId?: string; // MITRE ATT&CK reference
  metadata?: Record<string, unknown>;
}

/**
 * Result from a single model's intent classification
 */
export interface IntentResult {
  intent: string;
  confidence: number;
  model: string;
  latencyMs: number;
  entities: OSINTEntity[];
  rawResponse?: string;
}

/**
 * Aggregated intent from multi-model consensus
 */
export interface AggregatedIntent {
  primaryIntent: string;
  confidence: number;
  consensusScore: number; // Agreement ratio (0-1)
  dissent: IntentResult[]; // Models that disagreed
  osintEntities: OSINTEntity[];
  rankedContext: ContextChunk[];
  guardrailFlags: GuardrailFlag[];
}

/**
 * Context chunk from memory tiers
 */
export interface ContextChunk {
  turnId: string;
  content: string;
  relevanceScore: number;
  tokenCount: number;
  tier: MemoryTier;
  timestamp: Date;
}

/**
 * Guardrail violation flags
 */
export interface GuardrailFlag {
  type:
    | 'JAILBREAK_ATTEMPT'
    | 'PII_DETECTED'
    | 'CLASSIFICATION_BOUNDARY'
    | 'POLICY_VIOLATION'
    | 'RATE_LIMIT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: 'warn' | 'block' | 'escalate';
}

// =============================================================================
// HIERARCHICAL MEMORY TYPES
// =============================================================================

/**
 * Memory tier levels
 */
export type MemoryTier = 'short' | 'medium' | 'long';

/**
 * Memory storage backends
 */
export type MemoryStorage = 'redis' | 'postgres' | 'neo4j';

/**
 * Configuration for a memory tier
 */
export interface MemoryTierConfig {
  tier: MemoryTier;
  storage: MemoryStorage;
  maxTokens: number;
  retentionMs: number;
  compressionThreshold?: number;
}

/**
 * A single conversation turn
 */
export interface ConversationTurn {
  turnId: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenCount: number;
  metadata?: {
    intent?: string;
    entities?: OSINTEntity[];
    investigationId?: string;
  };
}

/**
 * Short-term memory (last 5 turns, full verbatim)
 */
export interface ShortTermMemory {
  turns: ConversationTurn[];
  totalTokens: number;
}

/**
 * Compressed summary of conversation turns
 */
export interface TurnSummary {
  turnIds: string[];
  summary: string;
  entities: string[];
  intent: string;
  outcome: 'success' | 'partial' | 'failed';
  tokenCount: number;
  timestamp: Date;
}

/**
 * Extracted fact from conversation
 */
export interface ExtractedFact {
  factId: string;
  content: string;
  turnIds: string[];
  confidence: number;
  category: 'finding' | 'decision' | 'preference' | 'context';
}

/**
 * Decision made during conversation
 */
export interface Decision {
  decisionId: string;
  description: string;
  turnId: string;
  timestamp: Date;
  rationale?: string;
}

/**
 * Medium-term memory (turns 6-20, compressed)
 */
export interface MediumTermMemory {
  summaries: TurnSummary[];
  keyFacts: ExtractedFact[];
  decisions: Decision[];
  openQuestions: string[];
  totalTokens: number;
}

/**
 * Entity mention in conversation
 */
export interface EntityMention {
  entityId: string;
  graphNodeId: string;
  turnIds: string[];
  frequency: number;
  lastMentioned: Date;
}

/**
 * Inferred relationship from conversation
 */
export interface InferredRelationship {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  turnIds: string[];
  confidence: number;
}

/**
 * User behavior pattern
 */
export interface UserPattern {
  patternType: 'query_style' | 'domain_focus' | 'time_preference';
  value: string;
  confidence: number;
  lastObserved: Date;
}

/**
 * Investigation context from long-term memory
 */
export interface InvestigationContext {
  investigationId: string;
  hypothesis?: string;
  keyEntities: string[];
  timeline?: {
    start: Date;
    end: Date;
  };
}

/**
 * Long-term memory (persistent, graph-backed)
 */
export interface LongTermMemory {
  entityMentions: EntityMention[];
  relationships: InferredRelationship[];
  userPatterns: UserPattern[];
  investigationContext?: InvestigationContext;
}

/**
 * Complete conversation memory state
 */
export interface ConversationMemory {
  sessionId: string;
  userId: string;
  tenantId: string;
  investigationId?: string;

  shortTerm: ShortTermMemory;
  mediumTerm: MediumTermMemory;
  longTerm: LongTermMemory;

  metadata: {
    createdAt: Date;
    lastActiveAt: Date;
    totalTurns: number;
  };
}

/**
 * Context window for LLM prompt construction
 */
export interface ContextWindow {
  chunks: ContextChunk[];
  totalTokens: number;
  tierDistribution: Record<MemoryTier, number>;
}

// =============================================================================
// BOUNDED AUTONOMY TYPES
// =============================================================================

/**
 * Risk classification levels
 */
export type RiskLevel = 'autonomous' | 'hitl' | 'prohibited';

/**
 * Risk classification result
 */
export interface RiskClassification {
  level: RiskLevel;
  reason: string;
  requiredApprovals?: number;
  requiredRoles?: string[];
  auditRequirements?: AuditRequirement[];
  policyRule?: string;
}

/**
 * Audit requirement specification
 */
export interface AuditRequirement {
  type: 'log' | 'alert' | 'review';
  retention: 'standard' | 'extended' | 'permanent';
  notifyRoles?: string[];
}

/**
 * Tool operation specification
 */
export interface ToolOperation {
  toolId: string;
  operation: string;
  input: Record<string, unknown>;
  riskOverride?: RiskLevel;
}

/**
 * Single step in ReAct trace
 */
export interface ReActStep {
  stepNumber: number;
  thought: string;
  action: {
    tool: string;
    input: Record<string, unknown>;
    riskLevel: RiskLevel;
  };
  observation: {
    result: unknown;
    success: boolean;
    error?: string;
    tokensUsed: number;
    latencyMs: number;
  };
  timestamp: Date;
}

/**
 * Complete ReAct execution trace
 */
export interface ReActTrace {
  traceId: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  startTime: Date;
  endTime?: Date;
  steps: ReActStep[];
  finalOutcome: 'success' | 'partial' | 'failed' | 'blocked';
  totalTokens: number;
  totalLatencyMs: number;
  hitlEscalations: number;
  prohibitedBlocks: number;
}

/**
 * Approval request for HITL operations
 */
export interface ApprovalRequest {
  requestId: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  operation: ToolOperation;
  classification: RiskClassification;
  trace: ReActTrace;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requestedAt: Date;
  expiresAt: Date;
  approvals: Approval[];
}

/**
 * Single approval decision
 */
export interface Approval {
  approverId: string;
  decision: 'approve' | 'deny';
  reason: string;
  timestamp: Date;
}

// =============================================================================
// CHATOPS ADAPTER TYPES
// =============================================================================

/**
 * Unified message format across platforms
 */
export interface ChatMessage {
  messageId: string;
  platform: 'slack' | 'teams' | 'web';
  channelId: string;
  threadId?: string;
  userId: string;
  content: string;
  timestamp: Date;
  metadata?: {
    tenantId?: string;
    investigationId?: string;
    mentions?: string[];
  };
}

/**
 * Unified response format
 */
export interface ChatResponse {
  content: string;
  attachments?: ChatAttachment[];
  interactive?: InteractiveComponent[];
  citations?: Citation[];
  confidenceScore?: number;
}

/**
 * Response attachment (entity card, graph viz, etc.)
 */
export interface ChatAttachment {
  type: 'entity_card' | 'graph_viz' | 'trace_view' | 'approval_form';
  data: Record<string, unknown>;
}

/**
 * Interactive component (buttons, selects, etc.)
 */
export interface InteractiveComponent {
  type: 'button' | 'select' | 'input';
  id: string;
  label: string;
  action: string;
  value?: string;
  options?: Array<{ label: string; value: string }>;
}

/**
 * Citation for response provenance
 */
export interface Citation {
  entityId: string;
  entityName: string;
  relevance: number;
  source: string;
}

// =============================================================================
// SECURITY CONTEXT TYPES
// =============================================================================

/**
 * Security context for operation authorization
 */
export interface SecurityContext {
  userId: string;
  tenantId: string;
  roles: string[];
  clearanceLevel:
    | 'UNCLASSIFIED'
    | 'CUI'
    | 'CONFIDENTIAL'
    | 'SECRET'
    | 'TOP_SECRET'
    | 'TOP_SECRET_SCI';
  compartments?: string[];
  sessionId: string;
  authorityId?: string;
  mfaVerified: boolean;
}

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

export const OSINTEntitySchema = z.object({
  type: z.enum([
    'THREAT_ACTOR',
    'INFRASTRUCTURE',
    'MALWARE',
    'CAMPAIGN',
    'TTP',
    'INDICATOR',
    'VULNERABILITY',
    'NARRATIVE',
  ]),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.string(),
  linkedGraphId: z.string().optional(),
  mitreId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ConversationTurnSchema = z.object({
  turnId: z.string().uuid(),
  sessionId: z.string().uuid(),
  userId: z.string(),
  tenantId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  tokenCount: z.number().int().positive(),
  metadata: z
    .object({
      intent: z.string().optional(),
      entities: z.array(OSINTEntitySchema).optional(),
      investigationId: z.string().optional(),
    })
    .optional(),
});

export const ToolOperationSchema = z.object({
  toolId: z.string(),
  operation: z.string(),
  input: z.record(z.unknown()),
  riskOverride: z.enum(['autonomous', 'hitl', 'prohibited']).optional(),
});

export const ChatMessageSchema = z.object({
  messageId: z.string(),
  platform: z.enum(['slack', 'teams', 'web']),
  channelId: z.string(),
  threadId: z.string().optional(),
  userId: z.string(),
  content: z.string(),
  timestamp: z.date(),
  metadata: z
    .object({
      tenantId: z.string().optional(),
      investigationId: z.string().optional(),
      mentions: z.array(z.string()).optional(),
    })
    .optional(),
});
