export type EpicStatus = "not_started" | "in_progress" | "completed" | "blocked";

export interface EpicTaskState {
  id: string;
  description: string;
  status: EpicStatus;
  owner?: string;
  note?: string;
  updatedAt: string;
}

export interface EpicDefinition {
  id: string;
  title: string;
  outcome: string;
  tasks: Array<{ id: string; description: string }>;
}

export interface EpicProgressSnapshot extends EpicDefinition {
  tasks: EpicTaskState[];
  completedCount: number;
  blockedCount: number;
  progress: number;
}

export interface EpicUpdatePayload {
  status: EpicStatus;
  note?: string;
  owner?: string;
}
