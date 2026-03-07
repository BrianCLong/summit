#!/usr/bin/env node
/**
 * Summit CI Circuit Breaker (Auto-Revert Agent)
 * 
 * FAANG-Level "Broken Main" Protection:
 * At 10K PRs/day, if a flaky test or bad merge turns `main` red, the entire 
 * factory floor stops. This script runs immediately when a CI run on `main` fails.
 * 
 * Actions:
 * 1. Identifies the exact commit/PR that broke main.
 * 2. Instantly executes `git revert` on that merge commit.
 * 3. Pushes the revert to restore main to green.
 * 4. Comments on the offending PR, re-opens it, labels it `queue:conflict`, 
 *    and sends it back to the AI Slicer/Recovery agents.
 * 
 * Result: Zero human downtime.
 */

import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const failedCommitSha = process.env.FAILED_COMMIT_SHA;

if (!token || !repoEnv || !failedCommitSha) {
  console.error("Missing GITHUB_TOKEN, REPO, or FAILED_COMMIT_SHA");
  process.exit(1);
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
  console.log(`EMERGENCY: CI failed on main at commit ${failedCommitSha}. Engaging Circuit Breaker...`);

  // Setup git identity
  exec(`git config --global user.name "summit-circuit-breaker[bot]"`);
  exec(`git config --global user.email "summit-circuit-breaker[bot]@users.noreply.github.com"`);

  // Ensure we are on latest main
  exec(`git fetch origin main`);
  exec(`git checkout main`);
  exec(`git reset --hard origin/main`);

  console.log(`Reverting commit ${failedCommitSha}...`);
  
  // Revert the merge commit (assuming it's a merge commit, -m 1 picks mainline parent)
  // If it's a squash commit, standard revert works. Let's try standard first, fallback to -m 1
  let revertSuccess = exec(`git revert --no-edit ${failedCommitSha}`, true);
  if (!revertSuccess) {
    console.log("Standard revert failed (likely a merge commit). Attempting mainline revert (-m 1)...");
    exec("git revert --abort", true);
    revertSuccess = exec(`git revert -m 1 --no-edit ${failedCommitSha}`, true);
  }

  if (!revertSuccess) {
    console.error("CRITICAL: Circuit breaker failed to auto-revert. Human intervention required.");
    process.exit(1);
  }

  console.log("Revert successful. Pushing fix to restore main...");
  const pushSuccess = exec(`git push origin main`, true);

  if (!pushSuccess) {
    console.error("Failed to push revert to main.");
    process.exit(1);
  }

  console.log("Main branch has been restored to a green state.");

  // Find the PR associated with this commit to notify the author/agent
  const out = exec(`gh pr list --search "${failedCommitSha}" --state merged --json number --limit 1`, true);
  if (out) {
    const prs = JSON.parse(out);
    if (prs.length > 0) {
      const prNumber = prs[0].number;
      console.log(`Identifying offending PR #${prNumber}. Re-queueing for AI recovery...`);
      
      const comment = `🚨 **CI Circuit Breaker Triggered** 🚨\n\nThis PR broke the \`main\` branch CI post-merge. The Circuit Breaker has automatically reverted this commit to restore repository health.\n\nThis PR has been flagged with \`queue:conflict\` and sent back to the Omni-Recovery agents to slice, fix the broken tests, and attempt a safe re-integration.`;
      
      exec(`gh pr comment ${prNumber} --repo ${repoEnv} --body "${comment}"`);
      // Since it's merged, we can't just reopen it easily if the branch is deleted.
      // But we CAN add a label so the Omni-Recovery agent picks it up from the 'merged/failed' pile.
      exec(`gh pr edit ${prNumber} --repo ${repoEnv} --add-label "queue:conflict,reverted"`);
    }
  }
}

main().catch(console.error);
