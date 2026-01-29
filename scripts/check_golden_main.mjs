#!/usr/bin/env node

import { execSync } from 'child_process';

const REQUIRED_CHECKS = [
  "Config Preflight",
  "Lint & Typecheck",
  "Unit Tests",
  "Integration Tests",
  "Verification Suite",
  "Deterministic Build",
  "Governance / Docs Integrity",
  "Golden Path Smoke Test",
  "E2E Tests (Playwright)",
  "SOC Control Verification",
  "Governance / Branch Protection Drift",
  "CI Core Gate ✅"
];

function run(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    // gh api might fail if not auth'd or network issues
    throw new Error(`Command failed: ${command}\n${e.stderr || e.message}`);
  }
}

async function main() {
  try {
    // check if gh is installed
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch (e) {
      console.error("Error: 'gh' CLI is not installed or not in PATH.");
      process.exit(1);
    }

    console.log("Fetching last 3 commits from main...");

    // We use the current repo context.
    // If run from root, gh api automatically picks up the repo from git remote.
    // We fetch commits from the default branch (usually main)

    // First, verify we are in a git repo
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    } catch (e) {
      console.error("Error: Not a git repository.");
      process.exit(1);
    }

    // Get the default branch name or assume main?
    // We can just ask for commits from HEAD of 'main' if it exists remote.
    // Better to query the repo info to get default branch if we want to be generic, but task says 'main'.

    const commitsJson = run('gh api repos/{owner}/{repo}/commits?per_page=3&sha=main');
    const commits = JSON.parse(commitsJson);

    if (!commits || commits.length === 0) {
      console.error("No commits found on main.");
      process.exit(1);
    }

    let allGreen = true;

    for (const commit of commits) {
      const sha = commit.sha;
      const shortSha = sha.substring(0, 7);
      console.log(`\nChecking commit ${shortSha}...`);

      const checksJson = run(`gh api repos/{owner}/{repo}/commits/${sha}/check-runs?per_page=100`);
      const checksData = JSON.parse(checksJson);
      const runs = checksData.check_runs;

      for (const req of REQUIRED_CHECKS) {
        const match = runs.find(r => r.name === req);
        if (!match) {
          console.error(`❌ Missing check '${req}' on ${shortSha}`);
          allGreen = false;
        } else if (match.conclusion !== 'success') {
          console.error(`❌ Check '${req}' failed on ${shortSha} (status: ${match.status}, conclusion: ${match.conclusion})`);
          allGreen = false;
        } else {
          console.log(`✅ ${req}`);
        }
      }
    }

    if (allGreen) {
      console.log("\nGolden Main: ✅");
      process.exit(0);
    } else {
      console.log("\nGolden Main: ❌");
      process.exit(1);
    }

  } catch (error) {
    console.error("Error:", error.message);
    if (error.message.includes("gh auth login")) {
        console.error("Please run 'gh auth login' to authenticate.");
    }
    process.exit(1);
  }
}

main();
