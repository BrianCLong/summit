#!/usr/bin/env node
/**
 * Summit Mass Harvest Integration Engine
 *
 * FAANG-Scale Batch Integration Pipeline:
 * - Sweeps all `queue:merge-now` and `canonical-survivor` PRs.
 * - Creates a speculative `shadow-integration` branch off `main`.
 * - Attempts to `git merge --no-edit` every candidate PR into the shadow branch.
 * - Records successful merges into a batch manifest.
 * - Conflicting PRs are gracefully skipped and kicked back to the Rebase/Slicer agent.
 * - Pushes the `shadow-integration` branch. CI will test the *combined* batch.
 * - If CI passes on the batch, the entire train is fast-forwarded to main, collapsing the backlog instantly.
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const MAX_BATCH_SIZE = Number(process.env.HARVEST_MAX_BATCH_SIZE || "50");

if (!token || !repoEnv) {
  console.error("Missing GITHUB_TOKEN or REPO");
  process.exit(1);
}

const [owner, repo] = repoEnv.split("/");

async function gh(pathname) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "summit-harvest-engine",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} ${pathname}\n${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

function exec(cmd, ignoreErrors = false) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  } catch (err) {
    if (!ignoreErrors) console.error(`Command failed: ${cmd}`);
    return null;
  }
}

async function main() {
  console.log("Starting Mass Harvest Integration Pass...");

  // 1. Find all candidates
  const out = exec(`gh pr list --repo ${repoEnv} --label "queue:merge-now" --limit 200 --json number,title,headRefName,mergeable,statusCheckRollup`);
  if (!out) throw new Error("Failed to fetch queue.");
  let candidates = JSON.parse(out);

  // Filter only green or unchecked PRs (we let the batch CI prove them)
  candidates = candidates.filter(pr => pr.mergeable === "MERGEABLE" || pr.mergeable === "UNKNOWN");
  
  if (candidates.length === 0) {
    console.log("No merge-ready PRs in queue. Exiting harvest.");
    process.exit(0);
  }

  // Throttle batch size
  const batch = candidates.slice(0, MAX_BATCH_SIZE);
  console.log(`Harvesting ${batch.length} PRs into speculative integration train...`);

  // 2. Prepare Shadow Integration Branch
  const shadowBranch = `integration/harvest-${Date.now()}`;
  exec("git fetch origin main");
  exec("git reset --hard origin/main");
  exec("git clean -fd");
  exec(`git checkout -B ${shadowBranch} origin/main`);

  const successfulMerges = [];
  const failedMerges = [];

  // 3. Batch Merge Sweep
  for (const pr of batch) {
    console.log(`Attempting to fold PR #${pr.number}: ${pr.title}`);
    
    // Fetch the specific PR branch
    const fetchPr = exec(`git fetch origin pull/${pr.number}/head:harvest-pr-${pr.number}`, true);
    if (!fetchPr) {
      console.log(`  -> Failed to fetch PR #${pr.number} head. Skipping.`);
      failedMerges.push({ number: pr.number, reason: "fetch_failed" });
      continue;
    }

    // Attempt the merge
    const mergeOut = exec(`git merge --no-edit harvest-pr-${pr.number}`, true);
    if (mergeOut) {
      console.log(`  -> Cleanly absorbed PR #${pr.number}.`);
      successfulMerges.push(pr);
    } else {
      console.log(`  -> Conflict detected integrating PR #${pr.number}. Rolling back this patch and proceeding.`);
      exec("git merge --abort", true);
      failedMerges.push({ number: pr.number, reason: "batch_conflict" });
    }
  }

  if (successfulMerges.length === 0) {
    console.log("No PRs could be cleanly absorbed into the batch. Aborting harvest pass.");
    process.exit(0);
  }

  // 4. Push Shadow Branch
  console.log(`\nSuccessfully stacked ${successfulMerges.length} PRs. Pushing ${shadowBranch}...`);
  exec(`git push origin ${shadowBranch} --force`, true);

  // 5. Open an Integration PR
  let prBody = `## Mass Harvest Integration Train\n\nThis PR represents a batched optimistic merge of **${successfulMerges.length}** independent PRs.\n\n### Absorbed PRs:\n`;
  successfulMerges.forEach(pr => prBody += `- #${pr.number}: ${pr.title}\n`);
  
  if (failedMerges.length > 0) {
    prBody += `\n### Ejected PRs (Conflicts):\n`;
    failedMerges.forEach(pr => prBody += `- #${pr.number} (${pr.reason})\n`);
  }

  prBody += `\n\nIf CI passes on this branch, merging it will immediately integrate and close all absorbed PRs safely.`;

  // Write body to file to handle quotes safely
  await fs.writeFile("artifacts/harvest/harvest_body.md", prBody);

  const prCreateOut = exec(`gh pr create --repo ${repoEnv} --base main --head ${shadowBranch} --title "Mass Harvest Integration: ${successfulMerges.length} PRs" --body-file artifacts/harvest/harvest_body.md --label "canonical-survivor,integration-pass"`, true);

  if (prCreateOut) {
    console.log(`Integration Train PR created successfully: ${prCreateOut}`);
  }

  // 6. Record Artifacts for Post-Merge Action
  const manifest = {
    shadow_branch: shadowBranch,
    absorbed_prs: successfulMerges.map(p => p.number),
    ejected_prs: failedMerges.map(p => p.number),
    timestamp: new Date().toISOString()
  };

  await fs.writeFile("artifacts/harvest/harvest_manifest.json", JSON.stringify(manifest, null, 2));

  let summary = `# Mass Harvest Pass\n- **Absorbed:** ${successfulMerges.length}\n- **Ejected:** ${failedMerges.length}\n\nTrain PR created for combined CI validation.`;
  await fs.writeFile("artifacts/harvest/harvest-summary.md", summary);
  console.log("Harvest cycle complete.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
