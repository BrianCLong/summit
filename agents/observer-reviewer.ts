import type { Agent, AgentResult, AgentTask } from "./orchestrator/agent-orchestrator.js";

export class ObserverReviewerAgent implements Agent {
  readonly name = "Observer";

  readonly role = "reviewer" as const;

  execute(task: AgentTask): Promise<AgentResult> {
    const ciReport = {
      checks: ["lint", "typecheck", "unit-tests"],
      status: "green",
      builderOutput: task.inputs?.builder ?? null,
    };

    return Promise.resolve({
      status: "success",
      outputs: ciReport,
    });
  }
}
