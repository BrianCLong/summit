import { describe, expect, it } from "vitest";
import type { PolicyRule, WorkflowValidationResult } from "common-types";
import {
  GovernanceOrchestrator,
  buildGovernanceVerdict,
  runAdversarialProbes,
  summarizeWorkflowIssues,
  type GovernanceVerdictStatus,
  PolicyEngine,
} from "../src/index.js";

const baseRules: PolicyRule[] = [
  {
    id: "allow-analyst-read",
    description: "Analysts can read datasets",
    effect: "allow",
    actions: ["dataset:read"],
    resources: ["dataset"],
    conditions: [{ attribute: "roles", operator: "includes", value: ["analyst"] }],
  },
];

const baseRequest = {
  action: "dataset:read",
  resource: "dataset",
  context: {
    tenantId: "tenant-1",
    userId: "user-1",
    roles: ["analyst"],
    region: "us-west-1",
  },
};

describe("GovernanceVerdict wiring", () => {
  const engine = new PolicyEngine(baseRules);
  const orchestrator = new GovernanceOrchestrator(engine, {
    evaluatedBy: "governance-mesh",
    engineFactory: (rules) => new PolicyEngine(rules),
  });

  it("embeds governance verdicts into policy results", () => {
    const outcome = orchestrator.evaluateUserAction(baseRequest);

    expect(outcome.payload.allowed).toBe(true);
    expect(outcome.governance.status).toBe<"APPROVED">("APPROVED");
    expect(outcome.governance.policyIds).toContain("allow-analyst-read");
    expect(outcome.governance.actor?.tenantId).toBe("tenant-1");
  });

  it("supports dynamic policy overrides for recommendations and outputs", () => {
    const denyRule: PolicyRule = {
      id: "deny-analyst-deletion",
      description: "Analysts cannot delete datasets",
      effect: "deny",
      actions: ["dataset:delete"],
      resources: ["dataset"],
      conditions: [{ attribute: "roles", operator: "includes", value: ["analyst"] }],
    };

    const deleteRequest = {
      ...baseRequest,
      action: "dataset:delete",
    };

    const recommendation = orchestrator.evaluateRecommendation(
      { id: "rec-1", kind: "guard", content: "Escalate delete" },
      deleteRequest,
      { dynamicRules: [denyRule] }
    );

    expect(recommendation.governance.status).toBe<"REJECTED">("REJECTED");
    expect(recommendation.governance.runtime?.dynamicRulesApplied).toContain(
      "deny-analyst-deletion"
    );

    const governedOutput = orchestrator.evaluateOutput(
      { message: "workflow output" },
      deleteRequest,
      { dynamicRules: [denyRule] }
    );

    expect(governedOutput.governance.status).toBe<"REJECTED">("REJECTED");
  });

  it("propagates workflow validation into governance verdicts", () => {
    const validation: WorkflowValidationResult = {
      valid: false,
      issues: [
        { severity: "error", message: "missing approval", ruleId: "r1" },
        { severity: "warning", message: "lacking budget cap", ruleId: "r2" },
      ],
    };

    const governed = orchestrator.validateWorkflow(
      { id: "wf-1", tenantId: "tenant-1", owner: "user-1", roles: ["owner"] },
      validation
    );

    expect(governed.governance.status).toBe<"REJECTED">("REJECTED");
    expect(summarizeWorkflowIssues(validation.issues ?? [])).toContain("error:r1:missing approval");
  });
});

describe("Adversarial probes", () => {
  const engine = new PolicyEngine(baseRules);
  const orchestrator = new GovernanceOrchestrator(engine, {
    evaluatedBy: "adversarial-harness",
    engineFactory: (rules) => new PolicyEngine(rules),
  });

  it("detects bypass attempts and stays aligned to expected outcomes", () => {
    const probes = runAdversarialProbes(orchestrator, [
      {
        name: "legitimate-read",
        request: baseRequest,
        expectedStatus: "APPROVED" as GovernanceVerdictStatus,
      },
      {
        name: "exfiltration-attempt",
        request: {
          action: "model:exfiltrate",
          resource: "model",
          context: {
            tenantId: "tenant-1",
            userId: "user-2",
            roles: ["external"],
          },
        },
        expectedStatus: "REJECTED" as GovernanceVerdictStatus,
      },
    ]);

    expect(probes.every((probe) => probe.bypassDetected === false)).toBe(true);
    expect(probes.map((probe) => probe.verdict.status)).toEqual(["APPROVED", "REJECTED"]);
  });
});

describe("buildGovernanceVerdict helper", () => {
  it("creates a universal governance envelope from a policy evaluation", () => {
    const evaluation = {
      allowed: false,
      effect: "deny" as const,
      matchedRules: ["deny-everything"],
      reasons: ["deny-everything"],
      obligations: [],
      trace: [],
    };

    const verdict = buildGovernanceVerdict(baseRequest, evaluation, {
      evaluatedBy: "unit-test",
      surface: "microservice",
      recommendations: ["manual-review"],
      evidence: { rationale: "unit-test" },
    });

    expect(verdict.status).toBe<"REJECTED">("REJECTED");
    expect(verdict.policyIds).toContain("deny-everything");
    expect(verdict.recommendations).toContain("manual-review");
  });
});
