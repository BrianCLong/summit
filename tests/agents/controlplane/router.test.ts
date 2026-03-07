/**
 * routeTask — deterministic router unit tests.
 *
 * Positive fixtures: correct agent selected, approval flag propagated.
 * Negative fixtures: no eligible agent, tool scope denied, dataset scope denied,
 *                    risk budget exceeded, observability too low.
 * Determinism check: same inputs → same output across multiple calls.
 */

import { routeTask } from "../../../src/agents/controlplane/router/routeTask.js";
import type { AgentDescriptor } from "../../../src/agents/controlplane/registry/AgentDescriptor.js";
import type { TaskSpec } from "../../../src/agents/controlplane/router/RouterTypes.js";

function makeAgent(overrides: Partial<AgentDescriptor> = {}): AgentDescriptor {
  return {
    id: "agent-001",
    name: "Default Agent",
    capabilities: ["text-summarise"],
    tools: ["web-search"],
    datasets: ["ds-public"],
    maxDataClassification: "internal",
    riskLevel: "low",
    determinismScore: 0.9,
    observabilityScore: 0.8,
    auditEnabled: true,
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: "task-001",
    type: "text-summarise",
    goal: "Summarise the quarterly report",
    requiredCapabilities: ["text-summarise"],
    requiredTools: ["web-search"],
    requiredDatasets: ["ds-public"],
    riskBudget: "low",
    latencyBudgetMs: 500,
    costBudget: 50,
    requiresApproval: false,
    ...overrides,
  };
}

describe("routeTask — positive fixtures", () => {
  it("selects the single eligible agent", () => {
    const result = routeTask(makeTask(), [makeAgent()]);
    expect(result.selectedAgentId).toBe("agent-001");
    expect(result.denialReasons).toHaveLength(0);
  });

  it("propagates requiresApproval=true from task to decision", () => {
    const result = routeTask(makeTask({ requiresApproval: true }), [makeAgent()]);
    expect(result.requiresHumanApproval).toBe(true);
  });

  it("selects highest-scoring agent from two candidates", () => {
    const better = makeAgent({
      id: "agent-better",
      determinismScore: 1.0,
      observabilityScore: 1.0,
    });
    const worse = makeAgent({
      id: "agent-worse",
      determinismScore: 0.1,
      observabilityScore: 0.1,
    });
    const result = routeTask(makeTask(), [worse, better]);
    expect(result.selectedAgentId).toBe("agent-better");
  });

  it("applies stable lexical tie-break when scores are equal", () => {
    const a = makeAgent({ id: "agent-aaa", determinismScore: 0.9, observabilityScore: 0.8 });
    const b = makeAgent({ id: "agent-bbb", determinismScore: 0.9, observabilityScore: 0.8 });
    const result = routeTask(makeTask(), [b, a]);
    // agent-aaa is lexically before agent-bbb
    expect(result.selectedAgentId).toBe("agent-aaa");
  });
});

describe("routeTask — negative fixtures", () => {
  it("returns NO_ELIGIBLE_AGENT when pool is empty", () => {
    const result = routeTask(makeTask(), []);
    expect(result.selectedAgentId).toBeNull();
    expect(result.denialReasons).toContain("NO_ELIGIBLE_AGENT");
  });

  it("denies agent that lacks required capability", () => {
    const agent = makeAgent({ capabilities: ["code-review"] });
    const result = routeTask(makeTask({ requiredCapabilities: ["text-summarise"] }), [agent]);
    expect(result.selectedAgentId).toBeNull();
    expect(result.denialReasons).toContain("NO_ELIGIBLE_AGENT");
  });

  it("denies agent that lacks required tool", () => {
    const agent = makeAgent({ tools: ["db-query"] });
    const result = routeTask(makeTask({ requiredTools: ["web-search"] }), [agent]);
    expect(result.selectedAgentId).toBeNull();
  });

  it("denies agent that lacks access to required dataset", () => {
    const agent = makeAgent({ datasets: ["ds-internal"] });
    const result = routeTask(makeTask({ requiredDatasets: ["ds-restricted"] }), [agent]);
    expect(result.selectedAgentId).toBeNull();
  });

  it("denies agent whose risk level exceeds task riskBudget", () => {
    const agent = makeAgent({ riskLevel: "high" });
    const result = routeTask(makeTask({ riskBudget: "low" }), [agent]);
    expect(result.selectedAgentId).toBeNull();
  });

  it("denies agent with insufficient observabilityScore for high-risk task", () => {
    const agent = makeAgent({ riskLevel: "high", observabilityScore: 0.3 });
    const result = routeTask(makeTask({ riskBudget: "high" }), [agent]);
    expect(result.selectedAgentId).toBeNull();
  });
});

describe("routeTask — determinism", () => {
  it("produces identical output across 10 consecutive calls with identical inputs", () => {
    const task = makeTask();
    const agents = [
      makeAgent({ id: "agent-x", determinismScore: 0.7 }),
      makeAgent({ id: "agent-y", determinismScore: 0.9 }),
    ];

    const first = routeTask(task, agents);
    for (let i = 0; i < 9; i++) {
      const repeat = routeTask(task, agents);
      expect(repeat.selectedAgentId).toBe(first.selectedAgentId);
      expect(repeat.score).toBe(first.score);
    }
  });
});
