#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const outputDir =
  process.env.HYBRID_EVAL_OUTPUT_DIR ||
  path.join("evidence", "graph-hybrid", "EVD-GRAPH-HYBRID-PERF-001");

const report = {
  evidence_id: "EVD-GRAPH-HYBRID-PERF-001",
  summary: "Hybrid eval harness stub emitted deterministic metrics.",
  artifacts: ["metrics.json", "stamp.json"],
  metrics_keys: ["hybrid_eval_p95_ms", "ci_runtime_seconds", "peak_rss_mb"],
};

const metrics = {
  evidence_id: "EVD-GRAPH-HYBRID-PERF-001",
  metrics: {
    hybrid_eval_p95_ms: 123,
    ci_runtime_seconds: 42,
    peak_rss_mb: 256,
  },
};

const stamp = {
  evidence_id: "EVD-GRAPH-HYBRID-PERF-001",
  tool_versions: {
    node: process.version,
  },
  generated_at: "2026-01-30T00:00:00Z",
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "report.json"),
  JSON.stringify(report, null, 2),
);
fs.writeFileSync(
  path.join(outputDir, "metrics.json"),
  JSON.stringify(metrics, null, 2),
);
fs.writeFileSync(
  path.join(outputDir, "stamp.json"),
  JSON.stringify(stamp, null, 2),
);
