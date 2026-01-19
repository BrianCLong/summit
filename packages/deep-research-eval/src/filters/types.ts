import type { TaskDefinition } from '../taskpack/schema.js';

export interface FilterOutcome {
  taskId: string;
  passed: boolean;
  reasons: string[];
}

export type TaskFilter = (task: TaskDefinition) => FilterOutcome;
