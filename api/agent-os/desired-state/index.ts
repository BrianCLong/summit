import type { TaskGraph } from '../planner/task-graph';

export interface Objective {
  issueId: string;
  description: string;
}

export function compileToTaskGraph(objective: Objective): TaskGraph {
  return {
    id: `graph-${objective.issueId}`,
    repo: "BrianCLong/summit",
    nodes: [
      {
        id: "task-1",
        kind: "plan",
        deps: [],
        evidenceRequired: ["plan.json"],
        budgetClass: "s"
      }
    ]
  };
}
