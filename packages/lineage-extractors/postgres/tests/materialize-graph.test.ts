import test from "node:test";
import assert from "node:assert/strict";
import { materialize } from "../src/materialize-graph.js";
import { computeDiff } from "../src/diff-graph.js";

test("materialize produces deterministic nodes/edges", () => {
  const events = [
    {
      job: { namespace: "summit", name: "repo-sql-scan" },
      run: {
        facets: {
          "summit.postgres": { sqlHash: "b".repeat(64) },
          "summit.audit": { sourceSha: "0123456789abcdef0", policyHash: "a".repeat(64) },
          "summit.governanceVerdict": { verdict: "ALLOW" }
        }
      },
      inputs: [{ namespace: "public", name: "orders" }, { namespace: "public", name: "customers" }],
      outputs: [{ namespace: "analytics", name: "v_orders" }]
    }
  ];

  const g = materialize(events);
  assert.equal(g.version, 1);
  assert.ok(g.nodes.length >= 2);
  assert.ok(g.edges.length >= 2);

  // ensure stable IDs
  const nodeIds = g.nodes.map((n) => n.id);
  assert.ok(nodeIds.includes("job:summit.repo-sql-scan"));
  assert.ok(nodeIds.includes("dataset:analytics.v_orders"));
});

test("diff detects added nodes/edges", () => {
  const base = { version: 1, nodes: [], edges: [] };
  const cur = {
    version: 1,
    nodes: [{ id: "dataset:public.t", kind: "dataset", namespace: "public", name: "t" }],
    edges: []
  };
  const d = computeDiff(base as any, cur as any, true);
  assert.equal(d.node_added.length, 1);
});
