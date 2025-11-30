/**
 * AI Copilot for Graph Querying Types
 *
 * NL to Cypher/SQL with Guardrails
 *
 * Detected Stack:
 * - Backend: TypeScript/Node.js with Express
 * - Graph DB: Neo4j (Cypher queries)
 * - Relational DB: PostgreSQL (SQL queries)
 * - Query Dialect: Primarily Cypher, with SQL support
 * - Integration: services/copilot/ and services/api/src/routes/copilot.ts
 */

// =============================================================================
// Schema Description Types
// =============================================================================

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'id';
  description?: string;
  indexed?: boolean;
  sensitive?: boolean; // PII, classified data, etc.
}

export interface NodeTypeSchema {
  name: string; // e.g., "Person", "Organization"
  fields: FieldSchema[];
  labels?: string[]; // Graph labels or table name
  sensitivityLevel?: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
}

export interface EdgeTypeSchema {
  name: string; // e.g., "COMMUNICATES_WITH", "WORKS_FOR"
  from: string; // Source node type name
  to: string; // Target node type name
  fields: FieldSchema[];
  sensitivityLevel?: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
}

export interface GraphSchemaDescription {
  nodeTypes: NodeTypeSchema[];
  edgeTypes: EdgeTypeSchema[];
  version?: string;
  lastUpdated?: string;
}

// =============================================================================
// Policy Context Types
// =============================================================================

export interface PolicyContext {
  maxDepth: number; // Max traversal depth in graph queries
  maxRows: number; // Hard cap on rows/records returned
  maxExecutionTimeMs?: number; // Max query execution time
  disallowedLabels?: string[]; // Node/edge labels disallowed for this user
  disallowedNodeTypes?: string[];
  disallowedEdgeTypes?: string[];
  restrictedSensitivityLevels?: string[]; // e.g., ["SECRET", "TOP_SECRET"]
  allowedOperations?: QueryOperation[]; // READ, AGGREGATE, etc.
  deniedOperations?: QueryOperation[]; // DELETE, CREATE, etc.
}

export type QueryOperation =
  | 'READ'
  | 'AGGREGATE'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'MERGE'
  | 'PATH_FIND'
  | 'CENTRALITY'
  | 'CLUSTERING';

// =============================================================================
// User Context Types (for logging/audit)
// =============================================================================

export interface UserContext {
  userId: string;
  roles: string[];
  clearances: string[]; // e.g., ["UNCLASSIFIED", "CONFIDENTIAL"]
  tenantId: string;
  projectId?: string;
  sessionId?: string;
}

// =============================================================================
// LLM Adapter Types
// =============================================================================

export type QueryDialect = 'CYPHER' | 'SQL' | 'DSL';

export interface LlmGenerateInput {
  userText: string;
  schema: GraphSchemaDescription;
  policy: PolicyContext;
  dialect: QueryDialect;
  conversationHistory?: ConversationMessage[];
}

export interface LlmGenerateOutput {
  query: string;
  explanation: string;
  assumptions: string[];
  parameters: Record<string, unknown>;
  confidence: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// =============================================================================
// Copilot Request/Response Types
// =============================================================================

export interface CopilotRequest {
  userText: string;
  user: UserContext;
  schema: GraphSchemaDescription;
  policy: PolicyContext;
  dialect?: QueryDialect;
  investigationId?: string;
  conversationId?: string;
}

export interface CopilotDraftQuery {
  id: string;
  userText: string;
  query: string;
  dialect: QueryDialect;
  explanation: string;
  assumptions: string[];
  parameters: Record<string, unknown>;
  estimatedCost: QueryCostEstimate;
  safety: SafetyCheckResult;
  createdAt: string;
  createdBy: string; // userId or "copilot"
  expiresAt?: string; // Draft expiration
  investigationId?: string;
  conversationId?: string;
}

export interface QueryCostEstimate {
  depth: number;
  expectedRows: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  estimatedExecutionTimeMs?: number;
}

// =============================================================================
// Safety Analysis Types
// =============================================================================

export interface SafetyCheckResult {
  passesStaticChecks: boolean;
  violations: SafetyViolation[];
  warnings: SafetyWarning[];
  estimatedDepth: number;
  estimatedRows: number;
  suggestedFixes?: string[];
}

export interface SafetyViolation {
  code: SafetyViolationCode;
  message: string;
  severity: 'ERROR' | 'CRITICAL';
  location?: string; // Part of query causing the violation
}

export interface SafetyWarning {
  code: string;
  message: string;
  severity: 'WARNING' | 'INFO';
}

export type SafetyViolationCode =
  | 'EXCEEDS_MAX_DEPTH'
  | 'EXCEEDS_MAX_ROWS'
  | 'MISSING_LIMIT'
  | 'DISALLOWED_LABEL'
  | 'DISALLOWED_NODE_TYPE'
  | 'DISALLOWED_EDGE_TYPE'
  | 'FORBIDDEN_OPERATION'
  | 'SENSITIVE_DATA_ACCESS'
  | 'INVALID_SYNTAX'
  | 'POTENTIAL_INJECTION'
  | 'UNBOUNDED_PATTERN';

// =============================================================================
// Execution Types
// =============================================================================

export interface ExecuteRequest {
  draftId: string;
  confirm: boolean;
  overrideSafety?: boolean;
  reason?: string; // Required if overrideSafety is true
}

export interface ExecuteResponse {
  draftId: string;
  results: Record<string, unknown>[];
  truncated: boolean;
  executedAt: string;
  executionTimeMs: number;
  rowCount: number;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Audit Types
// =============================================================================

export type CopilotAuditAction =
  | 'PREVIEW'
  | 'EXECUTE'
  | 'EXECUTE_DENIED'
  | 'SAFETY_OVERRIDE'
  | 'DRAFT_EXPIRED';

export interface CopilotAuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  tenantId: string;
  action: CopilotAuditAction;
  draftId?: string;
  userText?: string;
  query?: string;
  dialect?: QueryDialect;
  safetySummary?: {
    passesStaticChecks: boolean;
    violations: string[];
    estimatedDepth: number;
    estimatedRows: number;
  };
  decision?: {
    confirmed: boolean;
    overrideSafety: boolean;
    reason?: string;
  };
  result?: {
    success: boolean;
    rowCount?: number;
    executionTimeMs?: number;
    error?: string;
  };
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Policy Engine Types
// =============================================================================

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  obligations?: PolicyObligation[];
  matchedPolicies?: string[];
}

export interface PolicyObligation {
  type: string;
  requirement?: string;
  target?: string;
}

export interface PolicyEvaluationInput {
  user: UserContext;
  draft: CopilotDraftQuery;
  operationType: 'PREVIEW' | 'EXECUTE';
  overrideSafety?: boolean;
}

// =============================================================================
// Repository Types
// =============================================================================

export interface DraftQueryRepository {
  save(draft: CopilotDraftQuery): Promise<void>;
  getById(id: string): Promise<CopilotDraftQuery | null>;
  deleteById(id: string): Promise<boolean>;
  getByUserId(userId: string, limit?: number): Promise<CopilotDraftQuery[]>;
  deleteExpired(): Promise<number>;
}

export interface CopilotAuditLog {
  append(record: CopilotAuditRecord): Promise<void>;
  getByUserId(userId: string, limit?: number): Promise<CopilotAuditRecord[]>;
  getByDraftId(draftId: string): Promise<CopilotAuditRecord[]>;
}

// =============================================================================
// API Types
// =============================================================================

export interface PreviewRequest {
  userText: string;
  schemaContextId?: string; // Optional: load schema from context
  policyContextId?: string; // Optional: load policy from context
  dialect?: QueryDialect;
  investigationId?: string;
  conversationId?: string;
}

export interface PreviewResponse {
  draft: CopilotDraftQuery;
}

export interface ExecuteAPIRequest {
  draftId: string;
  confirm: boolean;
  overrideSafety?: boolean;
  reason?: string;
}

export interface ExecuteAPIResponse {
  draftId: string;
  results: Record<string, unknown>[];
  truncated: boolean;
  executedAt: string;
  executionTimeMs: number;
  rowCount: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
