export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface UserRef {
  id: string;
}

export interface AgentRef {
  id: string;
  name: string;
  kind: 'llm' | 'tool' | 'workflow';
  modelId?: string;        // e.g. "openai:gpt-4.1"
  toolName?: string;       // e.g. "bash-shell"
}

export interface Run {
  id: string;
  user: UserRef;
  createdAt: string;
  requestText: string;
}

export interface Task {
  id: string;
  runId: string;
  parentTaskId?: string;
  status: TaskStatus;
  agent: AgentRef;
  kind: 'plan' | 'action' | 'subworkflow';
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
