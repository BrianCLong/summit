#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { readYaml, explodeMatrix, hasConcurrency } from "./utils.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((v,i,arr)=>{
  if (v.startsWith("--")) return [v.slice(2), arr[i+1] && !arr[i+1].startsWith("--") ? arr[i+1] : true];
  return [];
}).filter(Boolean));

const root = args.root || ".github/workflows";
const outDir = args.out || "artifact";
const upstreamRef = args.upstream || "upstream/main";
const forkRef = args.fork || "HEAD";
const MATRIX_THRESHOLD = Number(process.env.MATRIX_THRESHOLD || 32);

fs.mkdirSync(outDir, { recursive: true });

function gitList(ref) {
  const out = execSync(`git ls-tree -r --name-only ${ref} -- ${root}`, {stdio: ["ignore","pipe","pipe"]}).toString().trim();
  return out ? out.split("\n").filter(Boolean) : [];
}

function gitShow(ref, file) {
  try {
    return execSync(`git show ${ref}:${file}`, {stdio: ["ignore","pipe","pipe"]}).toString("utf8");
  } catch { return null; }
}

const upstreamFiles = new Set(gitList(upstreamRef));
const forkFiles = new Set(gitList(forkRef));
const all = new Set([...upstreamFiles, ...forkFiles]);

const findings = [];
let high = 0, medium = 0, low = 0;

function readYamlString(s) {
  return yaml.parse(s);
}

for (const f of all) {
  const upstreamY = gitShow(upstreamRef, f);
  const forkY = gitShow(forkRef, f);

  // Only analyze files that exist in fork (we can still diff upstream→fork)
  if (!forkY) continue;

  let wf;
  try { wf = readYamlString(forkY); }
  catch { findings.push({file:f, level:"high", rule:"yaml-parse", msg:"Invalid YAML"}); high++; continue; }

  const hasConc = hasConcurrency(wf);
  if (!hasConc) { findings.push({file:f, level:"high", rule:"concurrency-missing", msg:"No concurrency set at workflow nor job level"}); high++; }

  // matrix checks
  if (wf?.jobs && typeof wf.jobs === "object") {
    for (const [jobId, job] of Object.entries(wf.jobs)) {
      const m = job?.strategy?.matrix;
      const size = explodeMatrix(m);
      if (size > MATRIX_THRESHOLD) {
        findings.push({file:f, level:"medium", rule:"matrix-overexpansion", msg:`Job '${jobId}' expands to ${size} runs (> ${MATRIX_THRESHOLD})`});
        medium++;
      }
    }
  }

  // If upstream exists, store raw diff for this file (for the patch generator)
  if (upstreamY) {
    fs.writeFileSync(path.join(outDir, `${path.basename(f)}.diff`),
      execSync(`git diff --no-color --unified=2 ${upstreamRef} ${forkRef} -- ${f}`).toString("utf8")
    );
  }
}

const summary = { high, medium, low, total: findings.length, generated_at: new Date().toISOString() };

// Simple finops proxy: duplicated minutes avoided ≈ (#missing concurrency) * avg_job_minutes (configurable)
const AVG_JOB_MIN = Number(process.env.AVG_JOB_MIN || 5);
const duplicated_minutes_avoided = high * AVG_JOB_MIN;

fs.writeFileSync(path.join(outDir,"report.json"), JSON.stringify({ findings, summary }, null, 2));
fs.writeFileSync(path.join(outDir,"metrics.json"), JSON.stringify({
  metric: "duplicated_minutes_avoided",
  value: duplicated_minutes_avoided,
  inputs: { missing_concurrency: high, avg_job_min: AVG_JOB_MIN }
}, null, 2));

// Produce suggested fixes + patch
execSync(`node scripts/ci/workflows_diff/suggest_fixes.mjs --root "${root}" --out "${outDir}"`);
execSync(`node scripts/ci/workflows_diff/generate_patch.mjs --out "${outDir}" --root "${root}" --upstream "${upstreamRef}" --fork "${forkRef}"`);

console.log("Analysis complete.");
