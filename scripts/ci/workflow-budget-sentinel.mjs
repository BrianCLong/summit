#!/usr/bin/env node
/**
 * Workflow Budget Sentinel
 *
 * Enforces CI workflow discipline to prevent sprawl regression:
 * 1. Enforces maximum active workflow count (excluding .archive/)
 * 2. Validates all workflows (except pr-gate) use path filtering
 * 3. Fails CI if budget is exceeded or path filtering is missing
 *
 * Run: node scripts/ci/workflow-budget-sentinel.mjs
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// Configuration
const WORKFLOW_BUDGET = 12; // Max active workflows (currently 8, room for 4 more)
const WORKFLOWS_DIR = ".github/workflows";
const EXEMPT_FROM_PATH_FILTERING = [
  "pr-gate",
  "main-validation",
  "release-ga",
  "Release GA Pipeline", // release-ga.yml workflow name
];

// ANSI colors
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

function log(color, ...args) {
  console.log(`${color}${args.join(" ")}${RESET}`);
}

function getActiveWorkflows() {
  const files = readdirSync(WORKFLOWS_DIR);
  return files.filter((f) => {
    return (
      f.endsWith(".yml") &&
      !f.startsWith(".") &&
      !f.startsWith("_") // Skip reusable workflows
    );
  });
}

function validateWorkflow(filename) {
  const filepath = join(WORKFLOWS_DIR, filename);
  const content = readFileSync(filepath, "utf8");

  // Extract workflow name from YAML (simple regex)
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const workflowName = nameMatch
    ? nameMatch[1].trim()
    : filename.replace(".yml", "");

  // Check if exempt from path filtering
  if (EXEMPT_FROM_PATH_FILTERING.includes(workflowName)) {
    return { valid: true };
  }

  // Check for path filtering (simple regex search)
  // Look for "paths:" or "paths-ignore:" under pull_request or push triggers
  const hasPaths =
    /^\s+paths:/m.test(content) || /^\s+paths-ignore:/m.test(content);

  if (!hasPaths) {
    return {
      valid: false,
      reason: `Missing 'paths' or 'paths-ignore' filter (not exempt: ${EXEMPT_FROM_PATH_FILTERING.join(", ")})`,
    };
  }

  return { valid: true };
}

function main() {
  log(BLUE, "\n=== Workflow Budget Sentinel ===\n");

  const activeWorkflows = getActiveWorkflows();
  const workflowCount = activeWorkflows.length;

  log(BLUE, `Budget: ${workflowCount}/${WORKFLOW_BUDGET} workflows`);
  log(BLUE, `Directory: ${WORKFLOWS_DIR}/\n`);

  // Check 1: Budget enforcement
  let budgetExceeded = false;
  if (workflowCount > WORKFLOW_BUDGET) {
    log(
      RED,
      `❌ BUDGET EXCEEDED: ${workflowCount} workflows > ${WORKFLOW_BUDGET} limit`
    );
    budgetExceeded = true;
  } else {
    log(GREEN, `✅ Budget OK: ${workflowCount}/${WORKFLOW_BUDGET}`);
  }

  // Check 2: Path filtering validation
  log(BLUE, "\n=== Path Filtering Validation ===\n");

  const violations = [];
  for (const filename of activeWorkflows) {
    const result = validateWorkflow(filename);
    if (!result.valid) {
      violations.push({ filename, reason: result.reason });
      log(RED, `❌ ${filename}: ${result.reason}`);
    } else {
      log(GREEN, `✅ ${filename}`);
    }
  }

  // Summary
  log(BLUE, "\n=== Summary ===\n");

  if (budgetExceeded) {
    log(RED, `Budget Status: EXCEEDED (${workflowCount}/${WORKFLOW_BUDGET})`);
    log(YELLOW, `\nTo fix: Move workflows to ${WORKFLOWS_DIR}/.archive/`);
    log(
      YELLOW,
      `Or justify increase by updating WORKFLOW_BUDGET in this script.\n`
    );
  } else {
    log(GREEN, `Budget Status: OK (${workflowCount}/${WORKFLOW_BUDGET})`);
  }

  if (violations.length > 0) {
    log(RED, `Path Filtering: ${violations.length} violations`);
    log(YELLOW, `\nTo fix: Add 'paths' or 'paths-ignore' to pull_request/push triggers`);
    log(
      YELLOW,
      `Exempt workflows: ${EXEMPT_FROM_PATH_FILTERING.join(", ")}\n`
    );
  } else {
    log(GREEN, `Path Filtering: All workflows compliant`);
  }

  // Exit status
  const failed = budgetExceeded || violations.length > 0;
  if (failed) {
    log(RED, "\n❌ Workflow Budget Sentinel: FAILED\n");
    process.exit(1);
  } else {
    log(GREEN, "\n✅ Workflow Budget Sentinel: PASSED\n");
    process.exit(0);
  }
}

main();
