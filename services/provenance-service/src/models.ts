/**
 * Provenance Service - Data Models
 *
 * Defines the data structures for provenance records, including
 * tasks, agent interactions, model calls, and policy decisions.
 */

import type {
  UUID,
  Timestamp,
  ProvenanceRecord,
  ProvenanceEventType,
  ProvenancePayload,
  TraceContext,
  ModelProvider,
  PolicyAction,
} from '@intelgraph/mesh-sdk';

// ============================================================================
// PROVENANCE RECORD MODELS
// ============================================================================

/**
 * Extended provenance record with storage metadata.
 */
export interface StoredProvenanceRecord extends ProvenanceRecord {
  /** Storage sequence number for ordering */
  sequenceNumber: bigint;
  /** Partition key for sharding */
  partitionKey: string;
  /** TTL for automatic cleanup */
  expiresAt?: Timestamp;
  /** Compression applied to payload */
  compression?: 'none' | 'gzip' | 'zstd';
}

/**
 * Provenance chain representing a complete task execution.
 */
export interface ProvenanceChain {
  rootTaskId: UUID;
  records: ProvenanceRecord[];
  totalRecords: number;
  agents: AgentSummary[];
  models: ModelSummary[];
  tools: ToolSummary[];
  policies: PolicySummary[];
  timespan: {
    start: Timestamp;
    end: Timestamp;
    durationMs: number;
  };
  cost: CostSummary;
}

export interface AgentSummary {
  agentId: UUID;
  name: string;
  role: string;
  taskCount: number;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
}

export interface ModelSummary {
  provider: ModelProvider;
  model: string;
  callCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  avgLatencyMs: number;
}

export interface ToolSummary {
  toolName: string;
  callCount: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
}

export interface PolicySummary {
  policyId: string;
  evaluationCount: number;
  allowCount: number;
  denyCount: number;
  redactionCount: number;
  escalationCount: number;
}

export interface CostSummary {
  totalTokens: number;
  totalCostUsd: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
}

// ============================================================================
// GRAPH SCHEMA (Neo4j)
// ============================================================================

/**
 * Node types for the provenance graph.
 */
export type GraphNodeType =
  | 'Task'
  | 'Agent'
  | 'ModelCall'
  | 'ToolCall'
  | 'PolicyDecision'
  | 'Output'
  | 'DataSource';

/**
 * Relationship types for the provenance graph.
 */
export type GraphRelationType =
  | 'ASSIGNED_TO'
  | 'SPAWNED'
  | 'INVOKED'
  | 'CALLED'
  | 'SUBJECT_TO'
  | 'PRODUCED'
  | 'DERIVED_FROM'
  | 'REVIEWED_BY'
  | 'INFLUENCED';

/**
 * Task node in the graph.
 */
export interface TaskNode {
  id: UUID;
  type: string;
  status: string;
  priority: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  metadata: Record<string, unknown>;
}

/**
 * Agent node in the graph.
 */
export interface AgentNode {
  id: UUID;
  name: string;
  role: string;
  version: string;
  riskTier: string;
}

/**
 * Model call node in the graph.
 */
export interface ModelCallNode {
  id: UUID;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  temperature?: number;
  promptHash: string;
  responseHash: string;
  timestamp: Timestamp;
}

/**
 * Tool call node in the graph.
 */
export interface ToolCallNode {
  id: UUID;
  toolName: string;
  inputHash: string;
  outputHash: string;
  success: boolean;
  latencyMs: number;
  timestamp: Timestamp;
}

/**
 * Policy decision node in the graph.
 */
export interface PolicyDecisionNode {
  id: UUID;
  action: PolicyAction;
  reason: string;
  policyIds: string[];
  timestamp: Timestamp;
}

// ============================================================================
// QUERY MODELS
// ============================================================================

/**
 * Query parameters for provenance search.
 */
export interface ProvenanceQuery {
  taskId?: UUID;
  agentId?: UUID;
  eventTypes?: ProvenanceEventType[];
  startTime?: Timestamp;
  endTime?: Timestamp;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'sequence';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Graph query for relationship traversal.
 */
export interface GraphQuery {
  /** Starting node ID */
  startNodeId: UUID;
  /** Type of starting node */
  startNodeType: GraphNodeType;
  /** Relationship types to traverse */
  relationshipTypes?: GraphRelationType[];
  /** Maximum traversal depth */
  maxDepth?: number;
  /** Direction of traversal */
  direction?: 'outgoing' | 'incoming' | 'both';
  /** Filter conditions */
  filters?: GraphFilter[];
}

export interface GraphFilter {
  nodeType: GraphNodeType;
  property: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: unknown;
}

/**
 * Result of a graph query.
 */
export interface GraphQueryResult {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  paths: GraphPath[];
}

export interface GraphNode {
  id: UUID;
  type: GraphNodeType;
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  id: UUID;
  type: GraphRelationType;
  startNodeId: UUID;
  endNodeId: UUID;
  properties?: Record<string, unknown>;
}

export interface GraphPath {
  nodes: UUID[];
  relationships: UUID[];
  length: number;
}

// ============================================================================
// AUDIT MODELS
// ============================================================================

/**
 * Audit report for a task or time range.
 */
export interface AuditReport {
  reportId: UUID;
  generatedAt: Timestamp;
  scope: AuditScope;
  summary: AuditSummary;
  findings: AuditFinding[];
  recommendations: string[];
}

export interface AuditScope {
  type: 'task' | 'agent' | 'timerange';
  taskId?: UUID;
  agentId?: UUID;
  startTime?: Timestamp;
  endTime?: Timestamp;
}

export interface AuditSummary {
  totalRecords: number;
  recordsByType: Record<string, number>;
  agentsInvolved: number;
  modelCallCount: number;
  toolCallCount: number;
  policyViolations: number;
  integrityStatus: 'valid' | 'compromised' | 'unknown';
}

export interface AuditFinding {
  id: UUID;
  type: 'gap' | 'integrity' | 'policy' | 'anomaly';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedRecords: UUID[];
  timestamp?: Timestamp;
  remediation?: string;
}

// ============================================================================
// INTEGRITY VERIFICATION
// ============================================================================

/**
 * Hash chain for integrity verification.
 */
export interface HashChain {
  taskId: UUID;
  entries: HashChainEntry[];
  rootHash: string;
  verified: boolean;
  verifiedAt?: Timestamp;
}

export interface HashChainEntry {
  recordId: UUID;
  payloadHash: string;
  previousHash: string;
  chainHash: string;
  timestamp: Timestamp;
}
