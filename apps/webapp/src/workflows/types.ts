export type WorkflowRunState = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export interface WorkflowNode {
  id: string;
  label: string;
  status: WorkflowRunState;
  startedAt?: string;
  finishedAt?: string;
  __typename?: string;
}

export interface WorkflowLogEntry {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: string;
  __typename?: string;
}

export interface WorkflowRun {
  id: string;
  name: string;
  status: WorkflowRunState;
  startedAt: string;
  updatedAt: string;
  progress: number;
  nodes: WorkflowNode[];
  logs: WorkflowLogEntry[];
  __typename?: string;
}

export interface WorkflowStatusPayload {
  workflowStatus: WorkflowRun;
  __typename?: string;
}
