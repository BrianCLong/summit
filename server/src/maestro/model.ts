
export type TenantId = string;
export type RunId = string;
export type TaskId = string;
export type TemplateId = string;
export type AgentId = string;

export interface MaestroTemplate {
  id: TemplateId;
  tenantId: TenantId;
  name: string;
  version: number;
  description?: string;
  kind: "workflow" | "agent" | "job";
  // Input/output schemas (JSON Schema or TS types)
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  // Graph-like description of tasks/edges or a DSL
  spec: MaestroSpec;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  metadata: Record<string, unknown>;
}

export type RunStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

export interface MaestroRun {
  id: RunId;
  tenantId: TenantId;
  templateId: TemplateId;
  templateVersion: number;
  createdByPrincipalId: string;
  status: RunStatus;
  startedAt?: string;
  completedAt?: string;
  input: unknown;   // validated against template.inputSchema
  output?: unknown; // validated against template.outputSchema if present
  errorSummary?: string;
  metadata: Record<string, unknown>;
}

export interface MaestroTask {
  id: TaskId;
  runId: RunId;
  tenantId: TenantId;
  name: string;
  kind: "llm_call" | "rag_query" | "graph_job" | "http_request" | "script" | "subflow" | "delay" | "decision" | "agent_call" | "custom" | "diffusion_edit";
  status: "pending" | "ready" | "queued" | "running" | "succeeded" | "failed" | "skipped" | "cancelled";
  dependsOn: TaskId[]; // Array of parent task IDs
  attempt: number;
  maxAttempts: number;
  backoffStrategy: "none" | "fixed" | "exponential";
  payload: unknown;       // typed by task kind
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
}

export interface MaestroAgent {
  id: AgentId;
  tenantId: TenantId;
  name: string;
  description?: string;
  capabilities: string[]; // e.g. ["research", "triage", "graph_analysis"]
  templateId: TemplateId; // underlying MaestroTemplate
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

// DSL Definitions

export type MaestroNodeKind = "task" | "gateway" | "subflow" | "agent_call";

export interface MaestroNode {
  id: string;
  kind: MaestroNodeKind;
  ref: string; // e.g. task type identifier ("llm_call") or sub-template/agent id
  name?: string;
  inputMapping?: Record<string, unknown>;  // from run context / previous tasks
  outputMapping?: Record<string, unknown>; // into run context
  conditions?: MaestroCondition[];         // for gateways/decisions
  // Task specific configuration (retries, timeout, etc)
  config?: Record<string, unknown>;
}

export interface MaestroCondition {
  // Simple condition: "context.foo == 'bar'" or more structured
  expression: string;
  targetNodeId: string;
}

export interface MaestroSpec {
  nodes: MaestroNode[];
  edges: { from: string; to: string; conditionId?: string }[];
}

// Coordination Types for Subagent Collaboration
export interface CoordinationTask {
  id: string;
  title: string;
  description: string;
  assignedAgentIds: string[];
  dependencies?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  payload: Record<string, any>;
  status: 'pending' | 'delegated' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  result?: any;
  error?: string;
}

export interface CoordinationChannel {
  id: string;
  participants: string[];
  topic: string;  // What they're coordinating about (e.g., "threat-analysis", "entity-resolution")
  messages: CoordinationMessage[];
  createdAt: Date;
  updatedAt?: Date;
  isActive: boolean;
}

export interface CoordinationMessage {
  id: string;
  senderId: string;
  recipientId?: string;  // If null, broadcast to channel
  timestamp: Date;
  type: 'TASK_ASSIGNMENT' | 'TASK_RESULT' | 'REQUEST_HELP' | 'REQUEST_REVIEW' | 'CONSENSUS_PROPOSAL' | 'CONSENSUS_VOTE' | 'STATUS_UPDATE' | 'COORDINATION_MESSAGE';
  content: string;
  attachments?: any[];
  correlationId?: string;  // For linking related messages
  metadata?: Record<string, any>;
}

export interface ConsensusProposal<T = any> {
  id: string;
  coordinatorId: string;
  topic: string;
  proposal: T;
  voters: string[];  // Agent IDs that should vote
  votingDeadline: Date;
  votes: Map<string, { vote: 'approve' | 'reject' | 'abstain'; timestamp: Date; rationale?: string }>;
  status: 'draft' | 'in_voting' | 'passed' | 'rejected' | 'cancelled';
  createdAt: Date;
  updatedAt?: Date;
  closedAt?: Date;
}

export interface AgentCoordinationMetrics {
  coordinationMessagesSent: number;
  coordinationMessagesReceived: number;
  collaborativeTasksCompleted: number;
  consensusDecisionsMade: number;
  resourceSharingEvents: number;
  conflictResolutionEvents: number;
  averageCollaborationTimeMs: number;
  updatedAt?: Date;
}
