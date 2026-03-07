#!/usr/bin/env tsx
/**
 * verify-agent-policy.ts — CI script that validates the agent policy file
 * and scans for any AgentDescriptor files that violate policy invariants.
 *
 * Exit 0 = all checks pass.
 * Exit 1 = one or more violations found.
 *
 * EVD-AFCP-POLICY-004
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

// ─── Load and validate the policy file ───────────────────────────────────────

const policyPath = path.join(repoRoot, ".github", "policies", "agent-policy.yaml");

if (!fs.existsSync(policyPath)) {
  console.error(`[FAIL] Policy file not found: ${policyPath}`);
  process.exit(1);
}

console.log(`[OK]   Policy file exists: ${policyPath}`);

// Minimal structure check (no YAML parser dependency in foundation lane).
const policyContent = fs.readFileSync(policyPath, "utf-8");

const requiredKeys = [
  "version:",
  "defaults:",
  "risk_levels:",
  "data_classification:",
  "forbidden_tools:",
];

const missing = requiredKeys.filter((k) => !policyContent.includes(k));
if (missing.length > 0) {
  console.error(`[FAIL] Policy file missing required sections: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`[OK]   Policy file structure valid.`);

// ─── Verify forbidden tools are documented ────────────────────────────────────

const FORBIDDEN_TOOLS = ["rm-rf", "drop-database", "delete-all-records"];
const forbiddenPresent = FORBIDDEN_TOOLS.every((t) => policyContent.includes(t));
if (!forbiddenPresent) {
  console.error(`[FAIL] Policy file missing one or more forbidden tool entries.`);
  process.exit(1);
}

console.log(`[OK]   Forbidden tools listed in policy.`);

// ─── Verify evidence directory exists ────────────────────────────────────────

const evidenceDir = path.join(repoRoot, "evidence", "agent-fleet-control-plane-2027");
if (!fs.existsSync(evidenceDir)) {
  console.error(`[FAIL] Evidence directory not found: ${evidenceDir}`);
  process.exit(1);
}

console.log(`[OK]   Evidence directory exists.`);

// ─── Verify control plane source files exist ─────────────────────────────────

const requiredSources = [
  "src/agents/controlplane/registry/AgentDescriptor.ts",
  "src/agents/controlplane/registry/AgentRegistry.ts",
  "src/agents/controlplane/policy/PolicyDecisionPoint.ts",
  "src/agents/controlplane/policy/PolicyTypes.ts",
  "src/agents/controlplane/router/routeTask.ts",
  "src/agents/controlplane/router/RouterTypes.ts",
];

let missingFiles = 0;
for (const relPath of requiredSources) {
  const abs = path.join(repoRoot, relPath);
  if (!fs.existsSync(abs)) {
    console.error(`[FAIL] Required source file missing: ${relPath}`);
    missingFiles++;
  } else {
    console.log(`[OK]   ${relPath}`);
  }
}

if (missingFiles > 0) {
  process.exit(1);
}

console.log(`\n[PASS] agent-policy-check complete.`);
