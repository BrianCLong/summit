#!/usr/bin/env node
/**
 * Summit Master Orchestrator
 *
 * Autonomous, self-healing orchestration engine that runs all 15 pillars
 * in the correct sequence for continuous PR processing.
 *
 * Execution Flow:
 * 1. Auto-Concern Detection (assign concerns to PRs)
 * 2. PR Classification (apply queue labels)
 * 3. Canonical Survivor Selection (designate frontiers)
 * 4. Omni-Recovery (resurrect/rebase conflicting PRs)
 * 5. Semantic Slicer (break apart complex PRs)
 * 6. Mass Harvest (batch merge ready PRs)
 * 7. Circuit Breaker (revert broken commits)
 * 8. SAFE Loop (learn from failures)
 * 9. Meta-Librarian (compress learnings)
 * 10. Architecture Mapper (update docs)
 * 11. Entropy Hunter (detect tech debt)
 * 12. AI Tech Lead (diagnose stuck PRs)
 * 13. Epistemic Ledger (generate ADRs)
 */

import { execSync } from "child_process";
import fs from "node:fs/promises";
import path from "node:path";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const DRY_RUN = process.env.DRY_RUN === "true";

if (!token || !repoEnv) {
  console.error("Missing GITHUB_TOKEN or REPO");
  process.exit(1);
}

function exec(script, description) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🤖 ${description}`);
  console.log(`${"=".repeat(80)}`);

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would execute: ${script}`);
    return { success: true, output: "[DRY RUN]" };
  }

  try {
    const start = Date.now();
    const output = execSync(`REPO="${repoEnv}" GITHUB_TOKEN="${token}" node ${script}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(output);
    console.log(`✅ Complete in ${duration}s\n`);
    return { success: true, output, duration };
  } catch (err) {
    console.error(`❌ Failed: ${err.message}`);
    console.error(err.stdout?.toString() || "");
    console.error(err.stderr?.toString() || "");
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║           🚀 SUMMIT MASTER ORCHESTRATOR - AUTONOMOUS CYCLE 🚀             ║
║                                                                           ║
║  "Make it so all work is usefully and fully functionally absorbed        ║
║   into the repo, and no work at all is lost."                            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

Repository: ${repoEnv}
Mode: ${DRY_RUN ? "DRY RUN" : "LIVE EXECUTION"}
Timestamp: ${new Date().toISOString()}
`);

  const results = {
    timestamp: new Date().toISOString(),
    repo: repoEnv,
    dryRun: DRY_RUN,
    phases: []
  };

  // Phase 1: Intake & Classification
  console.log("\n" + "█".repeat(80));
  console.log("PHASE 1: INTAKE & CLASSIFICATION");
  console.log("█".repeat(80));

  results.phases.push({
    phase: 1,
    name: "Intake & Classification",
    steps: [
      exec("scripts/orchestrator/auto_concern_detector.mjs", "Auto-Concern Detection"),
      exec("scripts/orchestrator/pr-classifier.mjs", "PR Classification & Queue Assignment"),
      exec("scripts/orchestrator/canonical_survivor_selector.mjs", "Canonical Survivor Selection")
    ]
  });

  // Phase 2: Recovery & Maturation
  console.log("\n" + "█".repeat(80));
  console.log("PHASE 2: RECOVERY & MATURATION");
  console.log("█".repeat(80));

  results.phases.push({
    phase: 2,
    name: "Recovery & Maturation",
    steps: [
      exec("scripts/orchestrator/omni_rebase_recovery.mjs", "Omni-Recovery & Predictive Rebase"),
      exec("scripts/orchestrator/semantic_slicer_maturer.mjs", "Semantic PR Slicer & Maturer")
    ]
  });

  // Phase 3: Integration
  console.log("\n" + "█".repeat(80));
  console.log("PHASE 3: INTEGRATION");
  console.log("█".repeat(80));

  results.phases.push({
    phase: 3,
    name: "Integration",
    steps: [
      exec("scripts/orchestrator/mass_harvest_train.mjs", "Mass Harvest Train")
    ]
  });

  // Phase 4: Self-Healing & Learning
  console.log("\n" + "█".repeat(80));
  console.log("PHASE 4: SELF-HEALING & LEARNING");
  console.log("█".repeat(80));

  results.phases.push({
    phase: 4,
    name: "Self-Healing & Learning",
    steps: [
      exec("scripts/orchestrator/circuit_breaker.mjs", "CI Circuit Breaker"),
      exec("scripts/orchestrator/autodidactic_feedback_engine.mjs", "SAFE Autodidactic Loop"),
      exec("scripts/orchestrator/meta_librarian.mjs", "Meta-Librarian Context Compression"),
      exec("scripts/orchestrator/ai_tech_lead.mjs", "AI Tech Lead Dispatcher")
    ]
  });

  // Phase 5: Maintenance & Documentation
  console.log("\n" + "█".repeat(80));
  console.log("PHASE 5: MAINTENANCE & DOCUMENTATION");
  console.log("█".repeat(80));

  results.phases.push({
    phase: 5,
    name: "Maintenance & Documentation",
    steps: [
      exec("scripts/orchestrator/architecture_mapper.mjs", "Architecture Auto-Mapper"),
      exec("scripts/orchestrator/entropy_hunter.mjs", "Entropy Hunter"),
      exec("scripts/orchestrator/epistemic_ledger_auto_adr.mjs", "Epistemic Ledger Auto-ADR")
    ]
  });

  // Generate Summary
  console.log("\n" + "═".repeat(80));
  console.log("ORCHESTRATION CYCLE COMPLETE");
  console.log("═".repeat(80));

  const totalSteps = results.phases.reduce((sum, p) => sum + p.steps.length, 0);
  const successfulSteps = results.phases.reduce((sum, p) =>
    sum + p.steps.filter(s => s.success).length, 0
  );
  const failedSteps = totalSteps - successfulSteps;

  console.log(`
Summary:
  Total Steps: ${totalSteps}
  ✅ Successful: ${successfulSteps}
  ❌ Failed: ${failedSteps}
  Success Rate: ${((successfulSteps / totalSteps) * 100).toFixed(1)}%
`);

  // Save results
  await fs.writeFile(
    "artifacts/orchestration-cycle.json",
    JSON.stringify(results, null, 2)
  );

  console.log("Results saved to: artifacts/orchestration-cycle.json\n");

  process.exit(failedSteps > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
