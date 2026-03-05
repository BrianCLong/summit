export interface AgentTask {
  id: string;
  priority: number;
  created_at: string;
  type: string;
  inputs: Record<string, unknown>;
  max_attempts?: number;
}

export interface AgentResult {
  task_id: string;
  status: 'success' | 'failed';
  outputs: Record<string, unknown>;
  error?: string;
  attempt: number;
  started_at: string;
  finished_at: string;
}

export interface Agent {
  name: string;
  canHandle(task: AgentTask): boolean;
  execute(task: AgentTask): Promise<AgentResult>;
}

export type AgentEventType =
  | 'RUN_STARTED'
  | 'TASK_ENQUEUED'
  | 'TASK_DEQUEUED'
  | 'AGENT_SELECTED'
  | 'AGENT_EXEC_STARTED'
  | 'AGENT_EXEC_FINISHED'
  | 'TASK_RETRIED'
  | 'TASK_FAILED'
  | 'RUN_FINISHED'
  | 'LOG_WRITE_FAILED';

export interface AgentEvent {
  run_id: string;
  task_id: string | null;
  agent_name: string | null;
  ts: string;
  type: AgentEventType;
  inputs_hash: string | null;
  outputs_hash: string | null;
  attempt: number | null;
  status: 'success' | 'failed' | 'retrying' | 'started' | 'finished' | null;
  metadata: Record<string, unknown>;
}

export interface OrchestratorRunSummary {
  run_id: string;
  started_at: string;
  finished_at: string;
  total_tasks: number;
  succeeded_tasks: number;
  failed_tasks: number;
  results: AgentResult[];
  events_emitted: number;
}
