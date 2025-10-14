import assert from "node:assert/strict";

import {
  collectArtifactCatalog,
  computeWorkflowEstimates,
  planWhatIf,
  suggestBudgetActions,
  topologicalSort,
  validateWorkflow
} from "../src/index.ts";
import type {
  WorkflowDefinition,
  WorkflowValidationIssue
} from "common-types";

type TestFn = () => void;

function runTest(name: string, fn: TestFn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✖ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function createWorkflow(): WorkflowDefinition {
  return {
    workflowId: "wf_valid",
    tenantId: "tenant-1",
    name: "valid",
    version: 1,
    policy: {
      purpose: "engineering",
      retention: "standard-365d",
      licenseClass: "MIT-OK",
      pii: false
    },
    constraints: {
      latencyP95Ms: 900000,
      budgetUSD: 12,
      maxParallelism: 16
    },
    nodes: [
      {
        id: "n1",
        type: "git.clone",
        params: { repo: "vault://repo" },
        estimates: { latencyP95Ms: 60000, costUSD: 0.5 }
      },
      {
        id: "n2",
        type: "build.compile",
        params: { cacheKey: "main" },
        estimates: { latencyP95Ms: 180000, costUSD: 2.5 },
        produces: [{ name: "artifact", type: "generic" }]
      },
      {
        id: "n3",
        type: "test.junit",
        params: { pattern: "**/*.xml" },
        consumes: [{ name: "artifact", type: "generic" }],
        estimates: { latencyP95Ms: 120000, costUSD: 1.2, successRate: 0.98 }
      }
    ],
    edges: [
      { from: "n1", to: "n2", on: "success" },
      { from: "n2", to: "n3", on: "success" }
    ]
  };
}

runTest("validateWorkflow passes healthy graph", () => {
  const result = validateWorkflow(createWorkflow());
  assert.equal(result.analysis.issues.length, 0);
  assert.equal(result.analysis.suggestions.length, 0);
  assert.deepEqual(result.analysis.sources, ["n1"]);
  assert.deepEqual(result.analysis.sinks, ["n3"]);
  assert.ok(result.analysis.estimated.latencyP95Ms > 0);
});

runTest("policy retention enforced for PII", () => {
  const workflow = createWorkflow();
  workflow.policy.pii = true;
  workflow.policy.retention = "standard-365d";
  const result = validateWorkflow(workflow);
  const retentionIssue = result.analysis.issues.find(
    (issue: WorkflowValidationIssue) => issue.code === "policy.retention"
  );
  assert.ok(retentionIssue);
});

runTest("what-if planner adjusts estimates", () => {
  const workflow = createWorkflow();
  const original = computeWorkflowEstimates(workflow);
  const scenario = planWhatIf(workflow, {
    label: "halve cost",
    cacheHitRate: 0.5,
    parallelismMultiplier: 0.5,
    overrides: { n2: { latencyP95Ms: 60000 } }
  });
  assert.ok(scenario.latencyP95Ms < original.latencyP95Ms);
  assert.ok(scenario.costUSD <= original.costUSD);
});

runTest("budget suggestions trigger when near threshold", () => {
  const workflow = createWorkflow();
  const estimates = {
    latencyP95Ms: 1000,
    costUSD: 10,
    queueMs: 0,
    successRate: 0.9,
    criticalPath: ["n1", "n2", "n3"]
  };
  const suggestions = suggestBudgetActions(workflow, estimates, 0.8);
  assert.ok(suggestions.some((item) => item.code === "budget.watch"));
});

runTest("artifact catalog aggregates producer bindings", () => {
  const workflow = createWorkflow();
  const artifacts = collectArtifactCatalog(workflow);
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.type, "generic");
});

runTest("topological sort orders nodes", () => {
  const workflow = createWorkflow();
  const topology = topologicalSort(workflow);
  assert.deepEqual(topology.order, ["n1", "n2", "n3"]);
  assert.equal(topology.cycles.length, 0);
});

runTest("validateWorkflow flags cyclic graphs", () => {
  const workflow = createWorkflow();
  workflow.edges.push({ from: "n3", to: "n2", on: "success" });
  const result = validateWorkflow(workflow);
  const cycleIssue = result.analysis.issues.find(
    (issue: WorkflowValidationIssue) => issue.code === "topology.cycle"
  );
  assert.ok(cycleIssue);
  assert.equal(cycleIssue?.severity, "error");
});

runTest("topological sort surfaces cycles without infinite loop", () => {
  const workflow = createWorkflow();
  workflow.edges.push({ from: "n3", to: "n2", on: "success" });
  const topology = topologicalSort(workflow);
  assert.ok(topology.cycles.length > 0);
  assert.ok(topology.cycles.some((cycle) => cycle.includes("n2") && cycle.includes("n3")));
});

if (process?.env?.NODE_TEST) {
  const { test: nodeTest } = await import("node:test");
  nodeTest("validator vitest compatibility placeholder", () => {});
}

if (!process.exitCode) {
  console.log("All policy assertions passed.");
}
