/**
 * Deny-fixtures — comprehensive negative test suite for the control plane.
 *
 * These tests must ALL pass before any agent-guardrails CI gate will merge.
 * They cover every denial path across registry, router, and policy layers.
 *
 * EVD-AFCP-POLICY-004
 */

import { AgentRegistry, RegistrationError } from "../../../src/agents/controlplane/registry/AgentRegistry.js";
import { routeTask } from "../../../src/agents/controlplane/router/routeTask.js";
import { evaluatePolicy } from "../../../src/agents/controlplane/policy/PolicyDecisionPoint.js";
import type { AgentDescriptor } from "../../../src/agents/controlplane/registry/AgentDescriptor.js";
import type { TaskSpec } from "../../../src/agents/controlplane/router/RouterTypes.js";
import type { PolicyInput } from "../../../src/agents/controlplane/policy/PolicyTypes.js";

// ─── Shared helpers ─────────────────────────────────────────────────────────

function agent(overrides: Partial<AgentDescriptor> = {}): AgentDescriptor {
  return {
    id: "agent-001",
    name: "Base Agent",
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

function task(overrides: Partial<TaskSpec> = {}): TaskSpec {
  return {
    id: "task-001",
    type: "text-summarise",
    goal: "Summarise",
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

function policyInput(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    agentId: "agent-001",
    capability: "text-summarise",
    requestedTools: ["web-search"],
    allowedTools: ["web-search"],
    requestedDatasets: ["ds-public"],
    allowedDatasets: ["ds-public"],
    dataClassification: "public",
    taskRisk: "low",
    humanApprovalGranted: false,
    requiresHumanApproval: false,
    ...overrides,
  };
}

// ─── Registry deny fixtures ──────────────────────────────────────────────────

describe("Registry — deny fixtures", () => {
  it("DENY: register agent without capabilities", () => {
    const reg = new AgentRegistry();
    expect(() => reg.register(agent({ capabilities: [] }))).toThrow(RegistrationError);
  });

  it("DENY: register agent with blank id", () => {
    const reg = new AgentRegistry();
    expect(() => reg.register(agent({ id: "" }))).toThrow(RegistrationError);
  });

  it("DENY: register agent with determinismScore > 1", () => {
    const reg = new AgentRegistry();
    expect(() => reg.register(agent({ determinismScore: 2 }))).toThrow(RegistrationError);
  });

  it("DENY: register agent with observabilityScore < 0", () => {
    const reg = new AgentRegistry();
    expect(() => reg.register(agent({ observabilityScore: -1 }))).toThrow(RegistrationError);
  });

  it("DENY: register duplicate agent id", () => {
    const reg = new AgentRegistry();
    reg.register(agent());
    expect(() => reg.register(agent())).toThrow(RegistrationError);
  });
});

// ─── Router deny fixtures ────────────────────────────────────────────────────

describe("Router — deny fixtures", () => {
  it("DENY: no agents in pool", () => {
    const r = routeTask(task(), []);
    expect(r.selectedAgentId).toBeNull();
    expect(r.denialReasons).toContain("NO_ELIGIBLE_AGENT");
  });

  it("DENY: agent missing required capability", () => {
    const r = routeTask(
      task({ requiredCapabilities: ["code-review"] }),
      [agent({ capabilities: ["text-summarise"] })]
    );
    expect(r.selectedAgentId).toBeNull();
  });

  it("DENY: agent missing required tool", () => {
    const r = routeTask(
      task({ requiredTools: ["sql-query"] }),
      [agent({ tools: ["web-search"] })]
    );
    expect(r.selectedAgentId).toBeNull();
  });

  it("DENY: agent missing required dataset access", () => {
    const r = routeTask(
      task({ requiredDatasets: ["ds-confidential"] }),
      [agent({ datasets: ["ds-public"] })]
    );
    expect(r.selectedAgentId).toBeNull();
  });

  it("DENY: agent risk level exceeds task riskBudget", () => {
    const r = routeTask(
      task({ riskBudget: "low" }),
      [agent({ riskLevel: "high" })]
    );
    expect(r.selectedAgentId).toBeNull();
  });

  it("DENY: high-risk task requires observabilityScore >= 0.5", () => {
    const r = routeTask(
      task({ riskBudget: "high", requiredCapabilities: ["text-summarise"] }),
      [agent({ riskLevel: "high", observabilityScore: 0.2 })]
    );
    expect(r.selectedAgentId).toBeNull();
  });
});

// ─── Policy deny fixtures ────────────────────────────────────────────────────

describe("Policy — deny fixtures", () => {
  it("DENY: tool outside authorised scope", () => {
    const d = evaluatePolicy(
      policyInput({ requestedTools: ["rm-rf"], allowedTools: ["web-search"] })
    );
    expect(d.allow).toBe(false);
    expect(d.reasons.some((r) => r.startsWith("TOOL_SCOPE_DENIED"))).toBe(true);
  });

  it("DENY: dataset outside authorised scope", () => {
    const d = evaluatePolicy(
      policyInput({
        requestedDatasets: ["ds-restricted"],
        allowedDatasets: ["ds-public"],
      })
    );
    expect(d.allow).toBe(false);
    expect(d.reasons.some((r) => r.startsWith("DATASET_SCOPE_DENIED"))).toBe(true);
  });

  it("DENY: restricted data without human approval", () => {
    const d = evaluatePolicy(
      policyInput({
        dataClassification: "restricted",
        requiresHumanApproval: true,
        humanApprovalGranted: false,
      })
    );
    expect(d.allow).toBe(false);
    expect(d.reasons).toContain("RESTRICTED_REQUIRES_APPROVAL");
  });

  it("DENY: multiple violations accumulate in reasons array", () => {
    const d = evaluatePolicy(
      policyInput({
        requestedTools: ["evil-tool"],
        allowedTools: ["web-search"],
        requestedDatasets: ["ds-secret"],
        allowedDatasets: ["ds-public"],
      })
    );
    expect(d.allow).toBe(false);
    expect(d.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
