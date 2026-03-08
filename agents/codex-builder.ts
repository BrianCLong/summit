import type { Agent, AgentResult, AgentTask } from "./orchestrator/agent-orchestrator.js";

export class CodexBuilderAgent implements Agent {
  readonly name = "Codex";

  readonly role = "builder" as const;

  execute(task: AgentTask): Promise<AgentResult> {
    const plannerOutput = task.inputs?.planner;
    const implementationSummary = {
      acceptedPlan: plannerOutput ?? null,
      changes: ["generated implementation patch", "prepared deterministic test updates"],
      pullRequestDrafted: true,
    };

    return Promise.resolve({
      status: "success",
      outputs: implementationSummary,
    });
  }
}
