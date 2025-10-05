import { describe, expect, it } from "vitest";
import type {
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyRule
} from "common-types";
import {
  PolicyBenchmarkSuite,
  PolicyDiffEngine,
  PolicyPerformanceAnalyzer,
  PolicySandbox,
  SyntheticEventGenerator,
  ComplianceChecker
} from "../src/index.ts";

describe("SyntheticEventGenerator", () => {
  it("produces deterministic batches and edge cases with a fixed seed", () => {
    const generatorA = new SyntheticEventGenerator({ seed: 42 });
    const generatorB = new SyntheticEventGenerator({ seed: 42 });
    const batchA = generatorA.generateBatch(32);
    const batchB = generatorB.generateBatch(32);
    expect(batchA.events).toEqual(batchB.events);
    expect(batchA.metrics.edgeCasesEmitted).toBeGreaterThan(0);
    const containsEdgeCase = batchA.events.some(event => event.context.roles.length === 0);
    expect(containsEdgeCase).toBe(true);
  });
});

describe("PolicySandbox", () => {
  const createBaselinePolicies = (): PolicyRule[] => [
    {
      id: "allow-analytics",
      description: "Allow analytics reads in-region",
      effect: "allow",
      actions: ["dataset:read"],
      resources: ["analytics"],
      conditions: [{ attribute: "region", operator: "eq", value: "eu-west-1" }],
      obligations: [{ type: "audit-log" }]
    },
    {
      id: "allow-personal-data",
      description: "Allow personal data views with controls",
      effect: "allow",
      actions: ["dataset:read"],
      resources: ["personal-data"],
      conditions: [{ attribute: "region", operator: "eq", value: "eu-west-1" }],
      obligations: [
        { type: "data-minimization" },
        { type: "retention-check" },
        { type: "audit-log" }
      ]
    },
    {
      id: "deny-sale",
      description: "Deny data sales by default",
      effect: "deny",
      actions: ["data:sell"],
      resources: ["personal-data"]
    }
  ];

  const createSandbox = (): PolicySandbox =>
    new PolicySandbox(createBaselinePolicies(), { name: "governance" });

  it("evaluates requests without mutating baseline policies", () => {
    const sandbox = createSandbox();
    const request: PolicyEvaluationRequest = {
      action: "dataset:read",
      resource: "analytics",
      context: {
        tenantId: "tenant-alpha",
        userId: "user-1",
        roles: ["developer"],
        region: "eu-west-1",
        attributes: {}
      }
    };
    const result = sandbox.evaluate(request) as PolicyEvaluationResult;
    expect(result.allowed).toBe(true);
    const baselinePolicies = createBaselinePolicies();
    expect(baselinePolicies[0].actions).toEqual(["dataset:read"]);
    expect(baselinePolicies[0].conditions?.[0].value).toBe("eu-west-1");
  });

  it("produces diff summaries for proposed policy changes", () => {
    const sandbox = createSandbox();
    const baselinePolicies = createBaselinePolicies();
    const events: PolicyEvaluationRequest[] = [
      {
        action: "dataset:read",
        resource: "analytics",
        context: {
          tenantId: "tenant-alpha",
          userId: "user-1",
          roles: ["developer"],
          region: "eu-west-1",
          attributes: {}
        }
      },
      {
        action: "dataset:read",
        resource: "analytics",
        context: {
          tenantId: "tenant-alpha",
          userId: "user-2",
          roles: ["auditor"],
          region: "eu-west-1",
          attributes: {}
        }
      }
    ];
    const proposedPolicies: PolicyRule[] = [
      ...baselinePolicies,
      {
        id: "restrict-analytics",
        description: "Tighten analytics access",
        effect: "deny",
        actions: ["dataset:read"],
        resources: ["analytics"],
        conditions: [{ attribute: "roles", operator: "includes", value: ["developer"] }]
      }
    ];
    const diff = sandbox.simulateChange(proposedPolicies, events);
    expect(diff.decisionChanges).toBeGreaterThan(0);
    expect(diff.details.length).toBe(events.length);
  });

  it("runs integrated scenarios with benchmarking and compliance checks", () => {
    const sandbox = createSandbox();
    const proposedPolicies: PolicyRule[] = [
      ...createBaselinePolicies().map(rule => ({ ...rule })),
      {
        id: "allow-analytics-us",
        description: "Allow analytics in US with audit",
        effect: "allow",
        actions: ["dataset:read"],
        resources: ["analytics"],
        conditions: [{ attribute: "region", operator: "eq", value: "us-east-1" }],
        obligations: [{ type: "audit-log" }]
      }
    ];
    const result = sandbox.runScenario({
      name: "expansion",
      proposedPolicies,
      eventCount: 120,
      includeCompliance: true,
      includeBenchmark: true,
      benchmarkIterations: 2
    });
    expect(result.diff).toBeDefined();
    expect(result.compliance).toBeDefined();
    expect(result.performance?.eventsEvaluated).toBeGreaterThan(0);
  });
});

describe("PolicyDiffEngine", () => {
  it("compares before and after evaluation results", () => {
    const request: PolicyEvaluationRequest = {
      action: "dataset:read",
      resource: "analytics",
      context: {
        tenantId: "tenant-alpha",
        userId: "user-2",
        roles: ["developer"],
        region: "us-east-1",
        attributes: {}
      }
    };
    const before: PolicyEvaluationResult = {
      allowed: true,
      effect: "allow",
      matchedRules: ["allow"],
      reasons: [],
      obligations: [{ type: "audit-log" }],
      trace: []
    };
    const after: PolicyEvaluationResult = {
      allowed: false,
      effect: "deny",
      matchedRules: ["deny"],
      reasons: ["Denied"],
      obligations: [],
      trace: []
    };
    const summary = PolicyDiffEngine.compare({ events: [request], before: [before], after: [after] });
    expect(summary.total).toBe(1);
    expect(summary.decisionChanges).toBe(1);
    expect(summary.improved + summary.regressed).toBe(1);
  });
});

describe("ComplianceChecker", () => {
  it("validates GDPR/CCPA/SOC2 heuristics for compliant policies", () => {
    const compliantPolicies: PolicyRule[] = [
      {
        id: "allow-personal-data-eu",
        description: "Allow EU personal data with controls",
        effect: "allow",
        actions: ["dataset:read"],
        resources: ["personal-data"],
        conditions: [{ attribute: "region", operator: "eq", value: "eu-west-1" }],
        obligations: [
          { type: "data-minimization" },
          { type: "retention-check" },
          { type: "audit-log" }
        ]
      },
      {
        id: "deny-data-sale",
        description: "Deny data sale",
        effect: "deny",
        actions: ["data:sell"],
        resources: ["personal-data"]
      },
      {
        id: "audit-log",
        description: "Ensure audit logging",
        effect: "allow",
        actions: ["audit:emit"],
        resources: ["audit-log"],
        obligations: [{ type: "audit-log" }]
      },
      {
        id: "default-deny",
        description: "Deny everything else",
        effect: "deny",
        actions: [],
        resources: []
      }
    ];
    const report = new ComplianceChecker(compliantPolicies).checkAll();
    expect(report.compliant).toBe(true);
  });

  it("flags non-compliant policies missing safeguards", () => {
    const failingPolicies: PolicyRule[] = [
      {
        id: "allow-unrestricted-personal",
        description: "Allow personal data anywhere",
        effect: "allow",
        actions: ["dataset:read"],
        resources: ["personal-data"],
        obligations: []
      }
    ];
    const issues = new ComplianceChecker(failingPolicies).checkFramework("GDPR");
    expect(issues.some(issue => issue.severity === "error")).toBe(true);
  });
});

describe("PolicyPerformanceAnalyzer", () => {
  const simplePolicies: PolicyRule[] = [
    {
      id: "allow-analytics",
      description: "Allow analytics",
      effect: "allow",
      actions: ["dataset:read"],
      resources: ["analytics"],
      conditions: [],
      obligations: []
    },
    {
      id: "default-deny",
      description: "Catch all",
      effect: "deny",
      actions: [],
      resources: []
    }
  ];

  it("meets throughput expectations for 10k events per second", () => {
    const generator = new SyntheticEventGenerator({ seed: 99 });
    const events = generator.generateEvents(2000, { includeEdgeCases: false });
    const metrics = PolicyPerformanceAnalyzer.benchmark(simplePolicies, events, {
      iterations: 5,
      warmupIterations: 1
    });
    expect(metrics.eventsEvaluated).toBe(10_000);
    expect(metrics.eventsPerSecond).toBeGreaterThan(10_000);
  });
});

describe("PolicyBenchmarkSuite", () => {
  it("runs scenario collections via sandbox integration", () => {
    const policies: PolicyRule[] = [
      {
        id: "allow-analytics",
        description: "Allow analytics",
        effect: "allow",
        actions: ["dataset:read"],
        resources: ["analytics"],
        obligations: [{ type: "audit-log" }]
      }
    ];
    const suite = new PolicyBenchmarkSuite(policies);
    const targetedEvents: PolicyEvaluationRequest[] = [
      {
        action: "dataset:read",
        resource: "analytics",
        context: {
          tenantId: "tenant-1",
          userId: "user-1",
          roles: ["developer"],
          region: "eu-west-1",
          attributes: {}
        }
      }
    ];
    const results = suite.runScenarios([
      { name: "baseline", events: targetedEvents },
      {
        name: "candidate",
        proposedPolicies: [
          ...policies,
          {
            id: "deny-analytics",
            description: "Deny analytics for regression",
            effect: "deny",
            actions: ["dataset:read"],
            resources: ["analytics"]
          }
        ],
        includeBenchmark: true,
        benchmarkIterations: 2,
        events: targetedEvents
      }
    ]);
    expect(results).toHaveLength(2);
    expect(results[1].diff?.decisionChanges).toBeGreaterThan(0);
  });
});
