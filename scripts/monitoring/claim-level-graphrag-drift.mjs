// scripts/monitoring/claim-level-graphrag-drift.mjs
import fs from "node:fs";
import path from "node:path";

// Mock drift detector. In production, this would read from historical metrics in S3/Database
// and compare with current run metrics.

const ITEM_SLUG = "claim-level-graphrag";
const root = process.cwd();

function main() {
  console.log(`Checking drift for ${ITEM_SLUG}...`);

  // Look for latest evidence
  const evidenceDir = path.join(root, "evidence", "subsumption", ITEM_SLUG);
  if (!fs.existsSync(evidenceDir)) {
    console.log("No evidence found. Skipping drift check.");
    return;
  }

  // Find latest evidence ID directory (lexicographically last usually works if IDs are timestamped or sequential)
  // But my IDs are static in this demo (EVD-CLGRAG-CI-001).
  const latestId = "EVD-CLGRAG-CI-001";
  const metricsPath = path.join(evidenceDir, latestId, "metrics.json");

  if (!fs.existsSync(metricsPath)) {
    console.log("No metrics found for latest evidence. Skipping.");
    return;
  }

  const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf-8"));

  // Mock check: assert verifier_ok is 1
  if (metrics.metrics.verifier_ok !== 1) {
    console.error("Drift detected: verifier_ok is not 1");
    process.exit(1);
  }

  console.log("No drift detected.");
}

main();
