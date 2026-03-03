#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((v,i,arr)=>{
  if (v.startsWith("--")) return [v.slice(2), arr[i+1] && !arr[i+1].startsWith("--") ? arr[i+1] : true];
  return [];
}).filter(Boolean));

const staticOnly = args['static-only'] === true;
const repoFullName = process.env.GITHUB_REPOSITORY || "BrianCLong/summit";
const [owner, repo] = repoFullName.split('/');
const sha = "main";
const outDir = "artifact";

fs.mkdirSync(outDir, { recursive: true });

function runGh(endpoint) {
  try {
    const cmd = `gh api repos/${owner}/${repo}/${endpoint}`;
    const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    return JSON.parse(out);
  } catch (err) {
    if (err.stderr) {
      console.error(`GitHub API error: ${err.stderr.toString()}`);
    }
    return null;
  }
}

// 1. Fetch Required Contexts
let REQUIRED_CONTEXTS = [];
console.log("Fetching required status checks...");
const protection = runGh(`branches/main/protection/required_status_checks`);

if (!protection) {
  console.error("\n[FATAL] Failed to read branch protection from GitHub API.");
  console.error("This usually means the GITHUB_TOKEN lacks 'administration: read' permissions, or branch protection is disabled.");
  console.error("The workflow MUST fail here to prevent silent passes.");
  console.error("Manual Fallback: Run this script locally with a Personal Access Token (PAT).");
  process.exit(1);
}

const legacyContexts = protection.contexts || [];
const modernChecks = (protection.checks || []).map(c => c.context);
REQUIRED_CONTEXTS = [...new Set([...legacyContexts, ...modernChecks])].sort();

if (REQUIRED_CONTEXTS.length === 0) {
  console.log("No required contexts found for branch 'main'.");
  process.exit(0);
}

// 2. Fetch Produced Contexts
let PRODUCED_CONTEXTS_DYNAMIC = new Set();
let PRODUCED_CONTEXTS_STATIC = new Set();

if (!staticOnly) {
  console.log(`Fetching dynamic check runs for ${sha}...`);
  const checkRuns = runGh(`commits/${sha}/check-runs`);
  if (checkRuns && checkRuns.check_runs) {
    checkRuns.check_runs.forEach(cr => PRODUCED_CONTEXTS_DYNAMIC.add(cr.name));
  }

  console.log(`Fetching dynamic statuses for ${sha}...`);
  const statuses = runGh(`commits/${sha}/statuses`);
  if (statuses && Array.isArray(statuses)) {
    statuses.forEach(st => PRODUCED_CONTEXTS_DYNAMIC.add(st.context));
  }
}

console.log("Parsing static workflow definitions...");
const workflowsDir = ".github/workflows";
if (fs.existsSync(workflowsDir)) {
  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
      let wfName = file;
      const lines = content.split('\n');
      let inJobs = false;
      let currentJobId = null;
      const jobs = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        if (line.match(/^name:/)) { wfName = trimmed.substring(5).trim().replace(/^['"]|['"]$/g, ''); continue; }
        if (line.match(/^jobs:/)) { inJobs = true; continue; }
        if (inJobs) {
          const jobMatch = line.match(/^  ([a-zA-Z0-9_-]+):/);
          if (jobMatch) {
            currentJobId = jobMatch[1];
            jobs[currentJobId] = { name: currentJobId };
            continue;
          }
          if (currentJobId && line.match(/^    name:/)) {
            jobs[currentJobId].name = trimmed.substring(5).trim().replace(/^['"]|['"]$/g, '');
          }
          if (line.match(/^[a-zA-Z0-9_-]+:/) && !line.startsWith('jobs:')) inJobs = false;
        }
      }
      for (const [jobId, job] of Object.entries(jobs)) {
        PRODUCED_CONTEXTS_STATIC.add(job.name);
        PRODUCED_CONTEXTS_STATIC.add(jobId);
        PRODUCED_CONTEXTS_STATIC.add(`${wfName} / ${job.name}`);
      }
    } catch (err) {
      console.error(`Error parsing ${file}: ${err.message}`);
    }
  }
}

const ALL_PRODUCED = new Set([...PRODUCED_CONTEXTS_DYNAMIC, ...PRODUCED_CONTEXTS_STATIC]);

// 3. Compare & Detect Drift
const missing = REQUIRED_CONTEXTS.filter(c => !ALL_PRODUCED.has(c));

missing.sort(); // Deterministic output

if (missing.length > 0) {
  console.error("\n=======================================================");
  console.error("[ERROR] Required-Check Drift Detected!");
  console.error("=======================================================\n");
  console.error("The following required contexts are missing from the produced contexts (static + dynamic):\n");

  const hints = missing.map(m => {
    let type = "External App/Status";
    let fix = "Confirm integration app (Codecov, CLA, etc.) is installed and configured.";

    if (m.includes("/") || m.includes(" ") || m.match(/^[A-Z]/)) {
      type = "Workflow / Job";
      fix = "Restore workflow/job names, ensure pull_request trigger, or fix skipped matrix jobs.";
    }

    return { context: m, type, fix };
  });

  hints.forEach(h => {
    console.error(`- ${h.context}`);
    console.error(`    Type: ${h.type}`);
    console.error(`    Fix:  ${h.fix}`);
  });

  console.error("\nPlease update .github/workflows or repository settings to resolve this drift.");

  fs.writeFileSync(path.join(outDir, "drift_report.json"), JSON.stringify({
    drift_detected: true,
    missing_contexts: hints.map(h => h.context),
    hints,
    total_required: REQUIRED_CONTEXTS.length
  }, null, 2));

  process.exit(1);
}

console.log("\n[SUCCESS] No required-check drift detected. All required contexts are accounted for.");
fs.writeFileSync(path.join(outDir, "drift_report.json"), JSON.stringify({
  drift_detected: false,
  missing_contexts: [],
  total_required: REQUIRED_CONTEXTS.length
}, null, 2));

process.exit(0);
