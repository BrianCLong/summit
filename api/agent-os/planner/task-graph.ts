export interface TaskNode {
  id: string;
  kind: "plan" | "code" | "test" | "security" | "verify";
  deps: string[];
  evidenceRequired: string[];
  budgetClass: "xs" | "s" | "m" | "l";
}

export interface TaskGraph {
  id: string;
  repo: string;
  nodes: TaskNode[];
}
