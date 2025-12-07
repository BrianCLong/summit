
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

export interface MaestroRun {
  id: RunId;
  tenantId: TenantId;
  templateId: TemplateId;
  templateVersion: number;
  createdByPrincipalId: string;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
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
  kind: "llm_call" | "rag_query" | "graph_job" | "http_request" | "script" | "subflow" | "delay" | "decision" | "agent_call" | "custom";
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
