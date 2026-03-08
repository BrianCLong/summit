import type { Agent, AgentResult, AgentTask } from "./orchestrator/agent-orchestrator.js";

export class JulesPlannerAgent implements Agent {
  readonly name = "Jules";

  readonly role = "planner" as const;

  execute(task: AgentTask): Promise<AgentResult> {
    const plan = {
      objective: task.objective,
      workItems: [
        "analyze request scope",
        "define implementation slices",
        "prepare execution handoff for Codex",
      ],
      requestedAt: task.id,
    };

    return Promise.resolve({
      status: "success",
      outputs: plan,
    });
  }
}
