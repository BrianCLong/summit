#!/usr/bin/env node
/**
 * Gate: Reports must be generated ONLY from verified claims.
 * Enforces that no code path writes report artifacts by concatenating raw retrieval context.
 *
 * v0 is a static scan (fast) with explicit allowlist.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

// Restrict scan to common places where report generation/agents live.
const SCAN_DIRS = [
  "server/src",
  "packages",
  "agents",
  "scripts"
].filter(d => fs.existsSync(path.join(ROOT, d)));

// Disallow patterns associated with "context dump into report".
const DISALLOWED = [
  /retriev(ed|al)_context/i,
  /raw_context/i,
  /context_dump/i,
  /prompt_context/i,
  /report\s*\+\=/i,
  /reportText\s*\+\=/i,
  /sections?\s*:\s*.*retriev/i
];

// Allow these files to contain "context" legitimately (e.g. query dsl planner docs).
const ALLOWLIST = new Set([
  "docs/architecture/REPORTING_CONTRACT.md",
  "scripts/gates/enforce_report_from_claims.mjs",
  "packages/deepfake-detection/src/explainable/explainable-ai.ts",
  "scripts/endpoint-budget-checker.js",
  "scripts/repoos/package-boundary-check.ts",
  "scripts/security/run-drill.ts",
  "scripts/slo-pr-report.js"
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name === "node_modules") continue;
    if (ent.name === "dist") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function isTextFile(p) {
  return /\.(ts|tsx|js|mjs|md|json|yml|yaml)$/.test(p);
}

function rel(p) {
  return path.relative(ROOT, p);
}

let violations = [];

for (const d of SCAN_DIRS) {
  const abs = path.join(ROOT, d);
  for (const f of walk(abs)) {
    const r = rel(f);
    if (ALLOWLIST.has(r)) continue;
    if (!isTextFile(r)) continue;
    const txt = fs.readFileSync(f, "utf8");
    for (const pat of DISALLOWED) {
      if (pat.test(txt)) {
        violations.push({ file: r, pattern: String(pat) });
      }
    }
  }
}

if (violations.length) {
  console.error("enforce_report_from_claims: FAIL");
  for (const v of violations) {
    console.error(`- ${v.file} matched ${v.pattern}`);
  }
  process.exit(1);
}

console.log("enforce_report_from_claims: OK");
