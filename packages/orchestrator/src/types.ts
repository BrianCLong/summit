export interface OrchestratorEvent {
  evidence_id: string;
  type: string;
  team_id: string;
  payload: unknown;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';

export interface Task {
  id: string;
  runId?: string;
  subject: string;
  description?: string;
  status: TaskStatus;
  owner?: string; // agentId
  blockedBy: string[]; // Task IDs
  blocks: string[]; // Task IDs
  attempts: number;
  maxAttempts: number;
  readyAt: string;
  priority: number;
  version: number;
  metadata?: any;
  timestamps: {
    created: string;
    started?: string;
    completed?: string;
  };
}
