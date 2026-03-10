export interface PlannedTask {
  id: string;
  type: string;
  description: string;
}

export interface TaskPlan {
  goal: string;
  tasks: PlannedTask[];
}

export function planTask(goal: string): TaskPlan {
  return {
    goal,
    tasks: [],
  };
}
