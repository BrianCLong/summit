import { TaskSpec } from './TaskSpec.js';

export interface TaskPlan {
  goal: string;
  tasks: TaskSpec[];
}

export function planTask(goal: string): TaskPlan {
  return {
    goal,
    tasks: [],
  };
}
