export type SkillName = string;

export interface SkillSpec {
  name: SkillName;
  description: string;
  inputsSchema?: any;
  outputsSchema?: any;
  risk: "low" | "medium" | "high";
  scopes?: Array<"repo" | "net" | "fs" | "secrets" | "connectors" | "compute">;
}

export interface SkillInvocation {
  run_id: string;
  task_id: string;
  agent_name: string;
  agent_role: "planner" | "builder" | "reviewer" | "governance";
  skill: SkillName;
  inputs: any;
  scope: {
    repo_paths?: string[];
    dataset_ids?: string[];
    connector_ids?: string[];
  };
  env: "test" | "dev" | "prod";
}

export interface PolicyDecision {
  decision: "allow" | "deny";
  reason: string;
  matched_rules?: string[];
}
