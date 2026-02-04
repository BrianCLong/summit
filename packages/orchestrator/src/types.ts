export interface OrchestratorEvent {
  evidence_id: string;
  type: string;
  team_id: string;
  payload: unknown;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';

export interface Task {
  id: string;
  subject: string;
  description?: string;
  status: TaskStatus;
  owner?: string; // agentId
  blockedBy: string[]; // Task IDs
  blocks: string[]; // Task IDs
  timestamps: {
    created: string;
    started?: string;
    completed?: string;
  };
}
