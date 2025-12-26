export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type RunStatus =
  | 'created'
  | 'running'
  | 'paused'
  | 'halted'
  | 'completed'
  | 'aborted'
  | 'failed';

export interface UserRef {
  id: string;
}

export interface AgentRef {
  id: string;
  name: string;
  kind: 'llm' | 'tool' | 'workflow' | 'graph-engine';
  modelId?: string;        // e.g. "openai:gpt-4.1"
  toolName?: string;       // e.g. "bash-shell"
}

export interface RunFailure {
  code: string;
  reason: string;
  remediation?: string;
}

export interface RunEvent {
  id: string;
  runId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  tenantId: string;
}

export interface Run {
  id: string;
  user: UserRef;
  createdAt: string;
  requestText: string;
  status: RunStatus;
  failureDetails?: RunFailure;
}

export interface Task {
  id: string;
  runId: string;
  parentTaskId?: string;
  status: TaskStatus;
  agent: AgentRef;
  kind: 'plan' | 'action' | 'subworkflow' | 'graph.analysis';
  description: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  runId: string;
  taskId: string;
  kind: 'text' | 'json' | 'file' | 'graph';
  label: string;
  data: unknown; // or a typed union if you want stricter types
  createdAt: string;
}

export interface CostSample {
  id: string;
  runId: string;
  taskId: string;
  model: string;
  vendor: 'openai' | 'anthropic' | 'google' | 'local';
  inputTokens: number;
  outputTokens: number;
  currency: 'USD';
  cost: number;
  createdAt: string;
  feature?: string;
  tenantId?: string;
  environment?: string;
}

export interface RunCostSummary {
  runId: string;
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: Record<string, {
    costUSD: number;
    inputTokens: number;
    outputTokens: number;
  }>;
}

// Added missing interfaces used by MaestroService.ts
export interface HealthSnapshot {
  overallScore: number;
  workstreams: { name: string; status: string; score: number }[];
  activeAlerts: { id: string; title: string; severity: string; timestamp: string }[];
}

export interface SLOSnapshot {
  // Define properties if needed, though MaestroService doesn't seem to use it deeply in the mock
  id: string;
}

export interface AutonomicLoop {
  id: string;
  name: string;
  type: string;
  status: string;
  lastDecision: string;
  lastRun: string;
  config: Record<string, unknown>;
}

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  model: string;
  status: string;
  metrics: Record<string, number>;
  routingWeight: number;
}

export interface MergeTrain {
  id: string;
  status: string;
  queueLength: number;
  throughput: number;
  activePRs: { number: number; title: string; author: string; status: string; url: string }[];
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  status: string;
  variants: string[];
  metrics: Record<string, number>;
  startDate: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  isEnabled: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  status: string;
}
