#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const item = "graph-hybrid";
const manifestPath =
  process.env.SUBSUMPTION_MANIFEST_PATH ||
  path.join("subsumption", item, "manifest.yaml");

const docsTargets = [
  "docs/standards/graph-hybrid-interop.md",
  "docs/security/data-handling/graph-hybrid.md",
  "docs/ops/runbooks/graph-hybrid.md",
  "docs/decisions/graph-hybrid.md",
];

const evidenceSchemaPaths = [
  "evidence/schema/report.schema.json",
  "evidence/schema/metrics.schema.json",
  "evidence/schema/stamp.schema.json",
  "evidence/index.json",
];

const evidenceOutputDir = path.join(
  "evidence",
  "graph-hybrid",
  "EVD-GRAPH-HYBRID-GOV-002",
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requirePath(targetPath, message) {
  if (!fs.existsSync(targetPath)) {
    fail(message ?? `missing required path: ${targetPath}`);
  }
}

requirePath(manifestPath, `missing manifest: ${manifestPath}`);
for (const schemaPath of evidenceSchemaPaths) {
  requirePath(schemaPath, `missing evidence schema/index: ${schemaPath}`);
}
for (const docPath of docsTargets) {
  requirePath(docPath, `missing docs target: ${docPath}`);
}
requirePath("policy/graphrag/policy.yaml", "missing policy/graphrag/policy.yaml");
requirePath(
  "policy/graphrag/fixtures/deny",
  "missing policy/graphrag/fixtures/deny",
);

fs.mkdirSync(evidenceOutputDir, { recursive: true });
const report = {
  evidence_id: "EVD-GRAPH-HYBRID-GOV-002",
  summary: "Subsumption bundle verifier completed with required files present.",
  artifacts: ["metrics.json", "stamp.json"],
  checked_paths: [manifestPath, ...docsTargets, ...evidenceSchemaPaths],
};
const metrics = {
  evidence_id: "EVD-GRAPH-HYBRID-GOV-002",
  metrics: {
    required_paths_checked: report.checked_paths.length,
  },
};
const stamp = {
  evidence_id: "EVD-GRAPH-HYBRID-GOV-002",
  tool_versions: {
    node: process.version,
  },
  generated_at: "2026-01-30T00:00:00Z",
};
fs.writeFileSync(
  path.join(evidenceOutputDir, "report.json"),
  JSON.stringify(report, null, 2),
);
fs.writeFileSync(
  path.join(evidenceOutputDir, "metrics.json"),
  JSON.stringify(metrics, null, 2),
);
fs.writeFileSync(
  path.join(evidenceOutputDir, "stamp.json"),
  JSON.stringify(stamp, null, 2),
);
