export interface Run {
  id: string;
  user?: { id: string };
  createdAt: string;
  requestText: string;
  status?: 'running' | 'completed' | 'failed';
}

export interface Task {
  id: string;
  runId: string;
  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed';
  agent?: { id: string; name: string; kind: string };
  kind: 'planner' | 'action';
  description: string;
  input?: any;
  output?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  runId: string;
  taskId: string;
  kind: string; // e.g. 'text', 'json', 'image'
  label: string;
  data: any;
  createdAt: string;
}

export interface CostSample {
  runId: string;
  taskId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  createdAt?: string;
}

export interface ModelCostSummary {
  costUSD: number;
  inputTokens: number;
  outputTokens: number;
}

export interface RunCostSummary {
  runId: string;
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: Record<string, ModelCostSummary>;
}

export interface TaskResult {
  task: {
    id: string;
    status: string;
    description: string;
    errorMessage?: string;
  };
  artifact: Artifact | null;
}

export interface MaestroRunResponse {
  run: Run;
  tasks: { id: string; status: string; description: string }[];
  results: TaskResult[];
  costSummary: RunCostSummary;
}
