#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`RUNNING: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  run("node scripts/ci/verify_subsumption_bundle.mjs");
  run("node scripts/ci/verify_narrative_ops_policy.mjs");
  run("node scripts/evals/run_narrative_ops_smoke.mjs");
  run("node scripts/monitoring/narrative-ops-detection-2026-01-28-drift.mjs");
  console.log("NAROPS_VERIFY_ALL_OK");
} catch (e) {
  console.error("NAROPS_VERIFY_FAILED");
  process.exit(1);
}
