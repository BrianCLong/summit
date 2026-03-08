import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AgentOrchestrator,
  type Agent,
  type AgentTask,
} from "../../agents/orchestrator/agent-orchestrator.js";
import { TaskQueue } from "../../agents/queue/task-queue.js";
import { AntigravityGovernanceAgent } from "../../agents/antigravity-governance.js";
import { CodexBuilderAgent } from "../../agents/codex-builder.js";
import { JulesPlannerAgent } from "../../agents/jules-planner.js";
import { ObserverReviewerAgent } from "../../agents/observer-reviewer.js";

describe("AgentOrchestrator", () => {
  const buildTask = (id: string, priority: number): AgentTask => ({
    id,
    objective: "Implement orchestrator runtime",
    inputs: {},
    priority,
  });

  const registerFlowAgents = (orchestrator: AgentOrchestrator): void => {
    orchestrator.registerAgent(new JulesPlannerAgent());
    orchestrator.registerAgent(new CodexBuilderAgent());
    orchestrator.registerAgent(new ObserverReviewerAgent());
    orchestrator.registerAgent(new AntigravityGovernanceAgent());
  };

  it("registers agents in deterministic execution order", () => {
    const orchestrator = new AgentOrchestrator();
    registerFlowAgents(orchestrator);

    assert.deepEqual(
      orchestrator.getRegisteredAgents().map((agent) => agent.name),
      ["Jules", "Codex", "Observer", "Antigravity"]
    );
  });

  it("routes task across planner-builder-reviewer-governance pipeline", async () => {
    const orchestrator = new AgentOrchestrator();
    registerFlowAgents(orchestrator);
    orchestrator.enqueueTask(buildTask("task-route", 10));

    const result = await orchestrator.processNextTask();

    assert.equal(result?.status, "success");
    assert.deepEqual(
      result?.result?.timeline.map((step) => step.agent),
      ["Jules", "Codex", "Observer", "Antigravity"]
    );
    assert.equal(result?.result?.status, "success");
  });

  it("schedules tasks by priority with queue isolation", async () => {
    const orchestrator = new AgentOrchestrator();
    registerFlowAgents(orchestrator);

    orchestrator.enqueueTask(buildTask("low", 1));
    orchestrator.enqueueTask(buildTask("high", 100));

    const first = await orchestrator.processNextTask();
    const second = await orchestrator.processNextTask();

    assert.equal(first?.taskId, "high");
    assert.equal(second?.taskId, "low");
  });

  it("recovers from retries and marks exhausted tasks without blocking queue", async () => {
    let failuresRemaining = 1;
    const retryingBuilder: Agent = {
      name: "Codex",
      role: "builder",
      execute(task) {
        if (failuresRemaining > 0) {
          failuresRemaining -= 1;
          return Promise.resolve({
            status: "retry",
            outputs: { reason: "temporary failure", taskId: task.id },
          });
        }

        return Promise.resolve({
          status: "success",
          outputs: { recovered: true },
        });
      },
    };

    const queue = new TaskQueue({ concurrency: 1, defaultMaxAttempts: 2 });
    const orchestrator = new AgentOrchestrator(queue);
    orchestrator.registerAgent(new JulesPlannerAgent());
    orchestrator.registerAgent(retryingBuilder);
    orchestrator.registerAgent(new ObserverReviewerAgent());
    orchestrator.registerAgent(new AntigravityGovernanceAgent());

    orchestrator.enqueueTask(buildTask("retry-task", 50));

    const result = await orchestrator.processNextTask();

    assert.equal(result?.status, "success");
    assert.equal(result?.attempts, 2);
  });
});
