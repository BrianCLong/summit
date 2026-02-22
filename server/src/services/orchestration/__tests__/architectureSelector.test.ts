import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ArchitectureSelector, TaskSignalFeatures } from "../architectureSelector.js";
import { AgentOrchestrator } from "../AgentOrchestrator.js";
import { InMemoryPersistence } from "../persistence.js";

describe("ArchitectureSelector", () => {
  const selector = new ArchitectureSelector();

  const baseFeatures: TaskSignalFeatures = {
    id: "task-1",
    decomposabilityScore: 0.5,
    estimatedToolCount: 4,
    sequentialDependencyScore: 0.5,
    riskScore: 0.5,
    timeCriticalityScore: 0.5,
  };

  it("prefers SINGLE_AGENT for highly sequential tasks", () => {
    const architecture = selector.predictOptimalArchitecture({
      ...baseFeatures,
      sequentialDependencyScore: 0.9,
    });

    expect(architecture).toBe("SINGLE_AGENT");
  });

  it("prefers CENTRALIZED for decomposable tasks with moderate tool count", () => {
    const architecture = selector.predictOptimalArchitecture({
      ...baseFeatures,
      decomposabilityScore: 0.8,
      estimatedToolCount: 6,
      sequentialDependencyScore: 0.3,
    });

    expect(architecture).toBe("CENTRALIZED");
  });

  it("prefers HYBRID for high tool-count workloads", () => {
    const architecture = selector.predictOptimalArchitecture({
      ...baseFeatures,
      estimatedToolCount: 20,
      decomposabilityScore: 0.6,
      sequentialDependencyScore: 0.2,
    });

    expect(architecture).toBe("HYBRID");
  });

  it("recommends fallback architecture when error amplification is high", () => {
    const metrics = selector.monitorErrorAmplification("CENTRALIZED", [
      { stepIndex: 0, success: false },
      { stepIndex: 1, success: false },
      { stepIndex: 2, success: true },
      { stepIndex: 3, success: false },
    ]);

    expect(metrics.totalSteps).toBe(4);
    expect(metrics.errorSteps).toBe(3);
    expect(metrics.amplificationFactor).toBeGreaterThan(0.7);
    expect(metrics.recommendation).toBe("SINGLE_AGENT");
  });
});

describe("AgentOrchestrator architecture integration", () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    jest.useFakeTimers();
    orchestrator = AgentOrchestrator.getInstance();
    orchestrator.persistence = new InMemoryPersistence();
    (orchestrator.policyEngine as any).evaluate = jest.fn(async () => ({
      allowed: true,
      reason: "Allowed",
    }));
  });

  afterEach(() => {
    orchestrator.shutdown();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("stores selected architecture in task metadata", async () => {
    const taskId = await orchestrator.submitTask({
      title: "Incident triage",
      description: "Investigate and respond to production incident.",
      priority: "critical",
      input: {},
      requiredCapabilities: ["triage", "ops"],
      metadata: { user: "test-user" },
    });

    const task = await orchestrator.persistence.getTask(taskId);
    expect(task?.metadata?.orchestrationArchitecture).toBeDefined();
  });
});
