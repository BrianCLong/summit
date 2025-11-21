/**
 * Agentic Mesh SDK - Core Type Definitions
 *
 * This module defines the foundational types for the Agentic Mesh system.
 * All agents, tools, and services implement these interfaces.
 */

// ============================================================================
// IDENTIFIERS & PRIMITIVES
// ============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601
export type RiskTier = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AgentStatus = 'active' | 'busy' | 'unhealthy' | 'retired';
export type PolicyAction = 'allow' | 'deny' | 'allow_with_redactions' | 'escalate_to_human';

// ============================================================================
// AGENT DESCRIPTORS
// ============================================================================

/**
 * Static metadata describing an agent's identity and capabilities.
 */
export interface AgentDescriptor {
  /** Unique identifier */
  id: UUID;
  /** Human-readable name */
  name: string;
  /** Semantic version */
  version: string;
  /** Functional role (planner, coder, critic, etc.) */
  role: AgentRole;
  /** Risk classification for policy enforcement */
  riskTier: RiskTier;
  /** List of capabilities this agent provides */
  capabilities: string[];
  /** Required tools for this agent to function */
  requiredTools: string[];
  /** Preferred model configuration */
  modelPreference?: ModelPreference;
  /** Expected p95 latency in milliseconds */
  expectedLatencyMs?: number;
  /** Cost profile for budget tracking */
  costProfile?: CostProfile;
  /** Agent status */
  status: AgentStatus;
  /** Registration timestamp */
  registeredAt: Timestamp;
  /** Last health check */
  lastHeartbeat?: Timestamp;
}

export type AgentRole =
  | 'planner'
  | 'coder'
  | 'researcher'
  | 'critic'
  | 'red_teamer'
  | 'policy_guardian'
  | 'provenance_auditor'
  | 'judge'
  | 'human_bridge'
  | 'ops_engineer'
  | 'data_engineer'
  | 'product_strategist'
  | 'custom';

export interface ModelPreference {
  provider: ModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  fallbackProvider?: ModelProvider;
  fallbackModel?: string;
}

export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'local';

export interface CostProfile {
  /** Cost per 1K input tokens */
  inputTokenCost: number;
  /** Cost per 1K output tokens */
  outputTokenCost: number;
  /** Maximum budget per task (USD) */
  maxBudgetPerTask?: number;
  /** Currency code */
  currency: string;
}

// ============================================================================
// CAPABILITY DESCRIPTORS
// ============================================================================

/**
 * Describes a specific capability an agent can perform.
 */
export interface CapabilityDescriptor {
  /** Unique capability identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this capability does */
  description: string;
  /** Input schema (JSON Schema) */
  inputSchema: JsonSchema;
  /** Output schema (JSON Schema) */
  outputSchema: JsonSchema;
  /** Risk tier for this specific capability */
  riskTier: RiskTier;
  /** Required permissions */
  requiredPermissions: string[];
  /** Estimated cost range */
  estimatedCost?: CostRange;
  /** Estimated latency range in ms */
  estimatedLatencyMs?: LatencyRange;
}

export interface CostRange {
  min: number;
  max: number;
  currency: string;
}

export interface LatencyRange {
  p50: number;
  p95: number;
  p99: number;
}

// ============================================================================
// TOOL DESCRIPTORS
// ============================================================================

/**
 * Describes a tool that agents can invoke.
 */
export interface ToolDescriptor {
  /** Unique tool identifier */
  id: UUID;
  /** Tool name */
  name: string;
  /** Semantic version */
  version: string;
  /** Description for agent discovery */
  description: string;
  /** Input schema (JSON Schema) */
  inputSchema: JsonSchema;
  /** Output schema (JSON Schema) */
  outputSchema: JsonSchema;
  /** Risk tier for policy enforcement */
  riskTier: RiskTier;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
  /** Cost model */
  costModel?: ToolCostModel;
  /** Required roles to invoke */
  requiredRoles: string[];
  /** Tool status */
  status: 'active' | 'deprecated' | 'disabled';
}

export interface ToolCostModel {
  /** Fixed cost per invocation */
  perInvocation?: number;
  /** Variable cost based on input size */
  perInputUnit?: number;
  /** Unit type for variable cost */
  inputUnitType?: 'bytes' | 'tokens' | 'records';
  currency: string;
}

// ============================================================================
// ROUTING CONTEXT
// ============================================================================

/**
 * Context provided to the routing gateway for decision making.
 */
export interface RoutingContext {
  /** The task being routed */
  task: TaskDescriptor;
  /** User/caller identity */
  caller: CallerIdentity;
  /** Available budget */
  budget?: BudgetConstraints;
  /** Latency requirements */
  latencySlo?: LatencySlo;
  /** Preferred routing strategy */
  strategy?: RoutingStrategy;
  /** Previous routing attempts (for retry logic) */
  previousAttempts?: RoutingAttempt[];
}

export interface TaskDescriptor {
  id: UUID;
  type: string;
  input: Record<string, unknown>;
  priority: number;
  parentTaskId?: UUID;
  metadata: TaskMetadata;
  createdAt: Timestamp;
}

export interface TaskMetadata {
  requester?: string;
  dataClassification?: DataClassification;
  tags?: string[];
  traceId?: string;
  spanId?: string;
}

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface CallerIdentity {
  userId?: string;
  agentId?: UUID;
  roles: string[];
  permissions: string[];
  sessionId?: string;
}

export interface BudgetConstraints {
  maxTokens?: number;
  maxCostUsd?: number;
  maxModelCalls?: number;
}

export interface LatencySlo {
  targetP95Ms: number;
  maxTimeoutMs: number;
}

export type RoutingStrategy =
  | 'cheapest_meeting_slo'
  | 'max_quality'
  | 'defensive_multi_model'
  | 'consensus'
  | 'fastest';

export interface RoutingAttempt {
  agentId: UUID;
  modelProvider: ModelProvider;
  timestamp: Timestamp;
  result: 'success' | 'failure' | 'timeout';
  latencyMs?: number;
  error?: string;
}

// ============================================================================
// POLICY CONTEXT
// ============================================================================

/**
 * Context provided to the policy enforcer for evaluation.
 */
export interface PolicyContext {
  /** Action being evaluated */
  action: PolicyActionType;
  /** Subject performing the action */
  subject: PolicySubject;
  /** Resource being acted upon */
  resource: PolicyResource;
  /** Environment context */
  environment: PolicyEnvironment;
}

export type PolicyActionType =
  | 'task_assign'
  | 'tool_invoke'
  | 'model_call'
  | 'data_export'
  | 'data_read'
  | 'agent_spawn'
  | 'external_api_call';

export interface PolicySubject {
  type: 'user' | 'agent' | 'service';
  id: string;
  roles: string[];
  attributes: Record<string, unknown>;
}

export interface PolicyResource {
  type: string;
  id: string;
  classification: DataClassification;
  owner?: string;
  attributes: Record<string, unknown>;
}

export interface PolicyEnvironment {
  timestamp: Timestamp;
  sourceIp?: string;
  requestId: string;
  traceId?: string;
  riskScore?: number;
}

/**
 * Result of policy evaluation.
 */
export interface PolicyDecision {
  action: PolicyAction;
  reason: string;
  conditions?: PolicyCondition[];
  redactions?: RedactionSpec[];
  escalationTarget?: string;
  auditRequired: boolean;
  decisionId: UUID;
  evaluatedAt: Timestamp;
}

export interface PolicyCondition {
  type: string;
  requirement: string;
}

export interface RedactionSpec {
  path: string;
  strategy: 'mask' | 'remove' | 'hash' | 'encrypt';
}

// ============================================================================
// PROVENANCE RECORDS
// ============================================================================

/**
 * A provenance record capturing a single traceable event.
 */
export interface ProvenanceRecord {
  /** Unique record identifier */
  id: UUID;
  /** Type of provenance event */
  type: ProvenanceEventType;
  /** Associated task */
  taskId: UUID;
  /** Agent that created this record */
  agentId?: UUID;
  /** Timestamp of the event */
  timestamp: Timestamp;
  /** Event-specific payload */
  payload: ProvenancePayload;
  /** Hash of the payload for integrity */
  payloadHash: string;
  /** Parent record (for chaining) */
  parentRecordId?: UUID;
  /** Trace context */
  traceContext: TraceContext;
}

export type ProvenanceEventType =
  | 'task_created'
  | 'task_assigned'
  | 'task_completed'
  | 'task_failed'
  | 'subtask_spawned'
  | 'model_call'
  | 'tool_invocation'
  | 'policy_decision'
  | 'agent_handoff'
  | 'human_review_requested'
  | 'human_review_completed'
  | 'output_produced'
  | 'error_occurred';

export type ProvenancePayload =
  | TaskCreatedPayload
  | ModelCallPayload
  | ToolInvocationPayload
  | PolicyDecisionPayload
  | OutputProducedPayload
  | ErrorPayload;

export interface TaskCreatedPayload {
  type: 'task_created';
  taskType: string;
  inputSummary: string;
  priority: number;
}

export interface ModelCallPayload {
  type: 'model_call';
  provider: ModelProvider;
  model: string;
  promptHash: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  temperature?: number;
  responseHash: string;
}

export interface ToolInvocationPayload {
  type: 'tool_invocation';
  toolName: string;
  inputHash: string;
  outputHash: string;
  success: boolean;
  latencyMs: number;
  error?: string;
}

export interface PolicyDecisionPayload {
  type: 'policy_decision';
  action: PolicyAction;
  reason: string;
  policyIds: string[];
}

export interface OutputProducedPayload {
  type: 'output_produced';
  outputType: string;
  outputHash: string;
  size: number;
}

export interface ErrorPayload {
  type: 'error';
  errorCode: string;
  message: string;
  stackTrace?: string;
  recoverable: boolean;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

// ============================================================================
// TASK EXECUTION
// ============================================================================

/**
 * Input provided to an agent for task execution.
 */
export interface TaskInput<T = Record<string, unknown>> {
  task: TaskDescriptor;
  context: ExecutionContext;
  payload: T;
}

export interface ExecutionContext {
  /** Routing decision that led to this assignment */
  routingDecision: RoutingDecision;
  /** Available tools for this task */
  availableTools: ToolDescriptor[];
  /** Budget remaining */
  budgetRemaining: BudgetConstraints;
  /** Deadline */
  deadline: Timestamp;
  /** Parent context for subtasks */
  parentContext?: ExecutionContext;
}

export interface RoutingDecision {
  selectedAgent: UUID;
  selectedModel: ModelPreference;
  strategy: RoutingStrategy;
  confidence: number;
  alternatives: AlternativeRoute[];
  decidedAt: Timestamp;
}

export interface AlternativeRoute {
  agentId: UUID;
  model: ModelPreference;
  reason: string;
}

/**
 * Output produced by an agent after task execution.
 */
export interface TaskOutput<T = Record<string, unknown>> {
  taskId: UUID;
  status: 'completed' | 'failed' | 'needs_review';
  result?: T;
  error?: TaskError;
  subtasks?: SubtaskResult[];
  metadata: OutputMetadata;
}

export interface TaskError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface SubtaskResult {
  subtaskId: UUID;
  status: TaskStatus;
  agentId: UUID;
  summary: string;
}

export interface OutputMetadata {
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
  modelCallCount: number;
  toolCallCount: number;
  provenanceRecordIds: UUID[];
}

// ============================================================================
// AGENT LIFECYCLE EVENTS
// ============================================================================

export interface AgentLifecycleEvent {
  type: AgentLifecycleEventType;
  agentId: UUID;
  timestamp: Timestamp;
  payload: Record<string, unknown>;
}

export type AgentLifecycleEventType =
  | 'registered'
  | 'task_received'
  | 'subtask_result'
  | 'error'
  | 'health_check'
  | 'retired';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  details?: Record<string, unknown>;
  checkedAt: Timestamp;
}
