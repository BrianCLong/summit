// src/types/maestro.ts

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface Run {
  id: string;
  user: { id: string };
  createdAt: string;
  requestText: string;
}

export interface TaskSummary {
  id: string;
  status: TaskStatus;
  description: string;
}

export interface TaskResult {
  task: {
    id: string;
    status: TaskStatus;
    description: string;
    errorMessage?: string;
  };
  artifact: {
    id: string;
    kind: 'text' | 'json' | 'file' | 'graph';
    label: string;
    data: unknown;
    createdAt: string;
  } | null;
}

export interface RunCostSummary {
  runId: string;
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: Record<
    string,
    {
      costUSD: number;
      inputTokens: number;
      outputTokens: number;
    }
  >;
}

export interface MaestroRunResponse {
  run: Run;
  tasks: TaskSummary[];
  results: TaskResult[];
  costSummary: RunCostSummary;
}
