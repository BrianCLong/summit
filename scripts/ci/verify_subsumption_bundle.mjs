#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const argv = new Map(process.argv.slice(2).flatMap((v, i, a) => v.startsWith("--") ? [[v.replace(/^--/, ""), a[i+1]]] : []));
const item = argv.get("item") || "item-unknown";
const root = process.cwd();
const localMode = process.argv.includes("--local");

// If running in test mode with custom root, respect it (simplistic injection for testing)
const targetRoot = process.env.TEST_ROOT || root;

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(`ℹ️ ${msg}`);
}

const manifestPath = path.join(targetRoot, `subsumption/${item}/manifest.yaml`);
if (!fs.existsSync(manifestPath)) {
  die(`missing manifest: ${manifestPath}`);
}

// Simple regex-based check for required fields in manifest if needed.
// For now, we rely on the file existence checks.

const requiredFiles = [
  `docs/standards/${item}.md`,
  `docs/security/data-handling/${item}.md`,
  `docs/ops/runbooks/${item}.md`,
  `evidence/index.json`,
  `evidence/schemas/report.schema.json`,
  `evidence/schemas/metrics.schema.json`,
  `evidence/schemas/stamp.schema.json`
];

let failed = false;

for (const p of requiredFiles) {
  const fullPath = path.join(targetRoot, p);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing required target: ${p}`);
    failed = true;
  }
}

// Deterministic Evidence Generation
const evidenceDir = path.join(targetRoot, `evidence/runs/subsumption-verify`);
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const report = {
  evidence_id: "EVD-subsumption-verify-GOV-001",
  item_slug: item,
  claims: [],
  decisions: failed ? [{id: "DEC-001", summary: "Verification failed"}] : [{id: "DEC-001", summary: "Verification passed"}]
};

// Stable stringify for determinism? JSON.stringify is usually stable for keys in same order, but we can enforce if needed.
// For now, just standard stringify.

const metrics = {
  evidence_id: "EVD-subsumption-verify-MET-001",
  metrics: {
    verifier_runtime_ms: 0, // Placeholder
    bundle_targets_required: requiredFiles.length,
    bundle_targets_present: failed ? 0 : requiredFiles.length
  }
};

const stamp = {
  evidence_id: "EVD-subsumption-verify-STM-001",
  tool_versions: { node: process.version },
  created_at: new Date().toISOString()
};

fs.writeFileSync(path.join(evidenceDir, "report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(evidenceDir, "metrics.json"), JSON.stringify(metrics, null, 2));
fs.writeFileSync(path.join(evidenceDir, "stamp.json"), JSON.stringify(stamp, null, 2));

if (failed) {
  die("Bundle verification failed.");
} else {
  console.log(`✅ Verified bundle scaffold for ${item}`);
}
