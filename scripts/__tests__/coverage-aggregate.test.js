import assert from "node:assert";
import { test } from "node:test";

import {
  aggregateCoverage,
  checkThresholds,
  workspaceFromPath,
  normalizePath,
} from "../coverage-aggregate.js";

test("workspaceFromPath derives stable workspace keys", () => {
  assert.strictEqual(workspaceFromPath("server/coverage/coverage-summary.json"), "server");
  assert.strictEqual(
    workspaceFromPath("packages/graph/coverage/coverage-summary.json"),
    "packages/graph"
  );
  assert.strictEqual(workspaceFromPath("coverage/coverage-summary.json"), "coverage");
  assert.strictEqual(workspaceFromPath(""), "root");
});

test("normalizePath always returns forward slashes", () => {
  const normalized = normalizePath("server/coverage/coverage-summary.json");
  assert.ok(!normalized.includes("\\"));
});

test("aggregateCoverage combines multiple coverage summaries deterministically", () => {
  const aggregated = aggregateCoverage([
    {
      total: {
        lines: { total: 10, covered: 8 },
        branches: { total: 4, covered: 3 },
        functions: { total: 2, covered: 1 },
        statements: { total: 10, covered: 8 },
      },
    },
    {
      total: {
        lines: { total: 5, covered: 5 },
        branches: { total: 2, covered: 2 },
        functions: { total: 1, covered: 1 },
        statements: { total: 5, covered: 5 },
      },
    },
  ]);

  assert.deepStrictEqual(aggregated.totals.lines, { total: 15, covered: 13 });
  assert.strictEqual(aggregated.percentages.lines.toFixed(2), "86.67");
  assert.strictEqual(aggregated.percentages.branches.toFixed(2), "83.33");
});

test("checkThresholds reports pass/fail per metric", () => {
  const thresholds = checkThresholds({
    lines: 90,
    branches: 60,
    functions: 80,
    statements: 82,
  });

  const lines = thresholds.results.find((item) => item.metric === "lines");
  const branches = thresholds.results.find((item) => item.metric === "branches");

  assert.strictEqual(lines.passed, true);
  assert.strictEqual(branches.passed, false);
  assert.strictEqual(thresholds.passed, false);
});
