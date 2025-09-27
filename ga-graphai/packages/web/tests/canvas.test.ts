import assert from "node:assert/strict";

import type { AttributionBundle, WorkflowDefinition, WorkflowRunRecord } from "common-types";
import {
  advancePlayback,
  applyRunUpdate,
  autoLayout,
  computeWorkflowDiff,
  constraintAwareAutoLayout,
  createCanvasState,
  createObserverState
} from "../src/index.ts";
import { getHighImpactSources, buildHighlightedSegments } from "../src/pcar-highlighter.ts";

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

function buildWorkflow(): WorkflowDefinition {
  return {
    workflowId: "wf-web",
    tenantId: "tenant-x",
    name: "canvas",
    version: 1,
    policy: {
      purpose: "engineering",
      retention: "standard-365d",
      licenseClass: "MIT-OK",
      pii: false
    },
    constraints: { latencyP95Ms: 100000, budgetUSD: 15 },
    nodes: [
      { id: "source", type: "git.clone", params: {}, estimates: { latencyP95Ms: 1000 } },
      { id: "build", type: "build.compile", params: {}, estimates: { latencyP95Ms: 2000 } },
      { id: "test", type: "test.junit", params: {}, estimates: { latencyP95Ms: 3000 } }
    ],
    edges: [
      { from: "source", to: "build", on: "success" },
      { from: "build", to: "test", on: "success" }
    ]
  };
}

runTest("createCanvasState auto layouts critical path", () => {
  const state = createCanvasState(buildWorkflow());
  assert.equal(Object.keys(state.positions).length, 3);
  assert.equal(state.positions.source.column, 0);
  assert.equal(state.positions.build.column, 1);
  assert.equal(state.positions.test.column, 2);
  assert.equal(state.positions.source.lane, 0);
  assert.equal(state.criticalPath.length, 3);
});

runTest("autoLayout respects custom spacing", () => {
  const initial = createCanvasState(buildWorkflow());
  const updated = autoLayout(initial, { columnSpacing: 400, laneSpacing: 200 });
  assert.equal(updated.positions.build.x, 400);
  assert.equal(updated.positions.build.y, 0);
});

runTest("constraintAwareAutoLayout exposes helper", () => {
  const layout = constraintAwareAutoLayout(buildWorkflow(), { columnSpacing: 300 });
  assert.equal(layout.test.x, 600);
});

runTest("computeWorkflowDiff reports structural changes", () => {
  const current = buildWorkflow();
  const next = buildWorkflow();
  next.nodes.push({ id: "lint", type: "quality.lint", params: {} });
  next.edges.push({ from: "test", to: "lint", on: "success" });
  const diff = computeWorkflowDiff(current, next);
  assert.deepEqual(diff.addedNodes, ["lint"]);
  assert.equal(diff.removedNodes.length, 0);
  assert.equal(diff.addedEdges.length, 1);
});

runTest("observer state builds timeline from run", () => {
  const workflow = buildWorkflow();
  const run: WorkflowRunRecord = {
    runId: "run-1",
    workflowId: workflow.workflowId,
    version: workflow.version,
    status: "succeeded",
    stats: {
      latencyMs: 6000,
      costUSD: 4.2,
      criticalPath: ["source", "build", "test"]
    },
    nodes: [
      {
        nodeId: "source",
        status: "succeeded",
        startedAt: "2024-01-01T00:00:00Z",
        finishedAt: "2024-01-01T00:02:00Z"
      },
      {
        nodeId: "build",
        status: "succeeded",
        startedAt: "2024-01-01T00:02:00Z",
        finishedAt: "2024-01-01T00:03:00Z"
      }
    ]
  };

  const observer = createObserverState(run);
  assert.ok(observer.timeline.frames.length >= 3);
  const advanced = advancePlayback(observer, { step: 2 });
  assert.equal(advanced.currentIndex, 2);
  const looped = advancePlayback(observer, { direction: "backward", loop: true });
  assert.ok(looped.currentIndex >= 0);
});

runTest("applyRunUpdate overlays runtime statuses", () => {
  const state = createCanvasState(buildWorkflow());
  const run: WorkflowRunRecord = {
    runId: "run-2",
    workflowId: state.workflow.workflowId,
    version: state.workflow.version,
    status: "running",
    stats: {
      latencyMs: 0,
      costUSD: 0,
      criticalPath: []
    },
    nodes: [
      { nodeId: "build", status: "running" },
      { nodeId: "test", status: "queued" }
    ]
  };

  const withRuntime = applyRunUpdate(state, run);
  assert.equal(withRuntime.runtime.build.status, "running");
  assert.equal(withRuntime.runtime.test.status, "queued");
});

runTest("pcar highlighter surfaces high-impact spans", () => {
  const bundle: AttributionBundle = {
    version: "pcar.v1",
    bundleId: "bundle-1",
    createdAt: "2025-09-02T00:00:00.000Z",
    seed: 17,
    baselineHash: "abc123",
    signature: "signature",
    outputText: "Critical release summary with SOC2 controls and optional context.",
    tokens: [],
    sources: [
      {
        id: "soc2",
        type: "retrieval",
        label: "SOC2",
        score: 0.82,
        snippet: "SOC2 controls",
        methodContributions: [
          { method: "leave-one-out", delta: 0.75 },
          { method: "token-occlusion", delta: 0.65 }
        ],
        highlightSpans: [
          { start: 26, end: 39, text: "SOC2 controls" }
        ]
      },
      {
        id: "optional",
        type: "retrieval",
        label: "Optional",
        score: 0.18,
        snippet: "optional context",
        methodContributions: [
          { method: "leave-one-out", delta: 0.12 },
          { method: "token-occlusion", delta: 0.08 }
        ],
        highlightSpans: [
          { start: 44, end: 60, text: "optional context" }
        ]
      }
    ]
  };

  const highImpact = getHighImpactSources(bundle, 0.3);
  assert.equal(highImpact.length, 1);
  assert.equal(highImpact[0].sourceId, "soc2");

  const segments = buildHighlightedSegments(bundle, 0.3);
  const highlighted = segments.filter((segment) => segment.sourceIds.length > 0);
  assert.ok(highlighted.some((segment) => segment.sourceIds.includes("soc2")));
  const reconstructed = segments.reduce((acc, segment) => acc + segment.text, "");
  assert.equal(reconstructed, bundle.outputText);
});

if (!process.exitCode) {
  console.log("All web canvas assertions passed.");
}
