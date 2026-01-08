#!/usr/bin/env node

/**
 * analyze-dependency-conflicts.js
 *
 * Scans open PRs to detect potential dependency conflicts.
 * specifically looks for multiple PRs modifying the same package.json files,
 * which often leads to "merge hell" with lockfiles.
 */

const { execSync } = require("child_process");

// Configuration
const PACKAGE_JSON_PATTERN = /package\.json$/;
const LOCKFILE_PATTERN = /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/;

function run(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch (e) {
    return null;
  }
}

function getOpenPRs() {
  console.log("Fetching open PRs...");
  const json = run("gh pr list --state open --limit 50 --json number,title,author,url,mergeable");
  return json ? JSON.parse(json) : [];
}

function getChangedFiles(prNumber) {
  const output = run(`gh pr diff ${prNumber} --name-only`);
  return output ? output.split("\n").filter(Boolean) : [];
}

function analyze() {
  const prs = getOpenPRs();
  const packageJsonMap = new Map(); // filepath -> [prNumber]
  const lockfileMap = new Map(); // filepath -> [prNumber]

  console.log(`Analyzing ${prs.length} open PRs...`);

  for (const pr of prs) {
    if (pr.mergeable === "CONFLICTING") {
      console.log(`⚠️  PR #${pr.number} "${pr.title}" has git conflicts.`);
    }

    const files = getChangedFiles(pr.number);

    for (const file of files) {
      if (PACKAGE_JSON_PATTERN.test(file)) {
        if (!packageJsonMap.has(file)) packageJsonMap.set(file, []);
        packageJsonMap.get(file).push(pr.number);
      }
      if (LOCKFILE_PATTERN.test(file)) {
        if (!lockfileMap.has(file)) lockfileMap.set(file, []);
        lockfileMap.get(file).push(pr.number);
      }
    }
  }

  console.log("\n=== Dependency Conflict Report ===\n");

  let conflictFound = false;

  packageJsonMap.forEach((prNumbers, file) => {
    if (prNumbers.length > 1) {
      conflictFound = true;
      console.log(`🔥 CONFLICT RISK: ${file}`);
      console.log(`   Modified by PRs: ${prNumbers.map((n) => "#" + n).join(", ")}`);
      // Future: Parse actual dependency lines to see if they conflict semantically
    }
  });

  if (!conflictFound) {
    console.log("✅ No direct package.json collisions detected between open PRs.");
  } else {
    console.log("\nRecommendation: Merge PRs sequentially or rebase one on top of the other.");
  }

  // Also report lockfile churn
  console.log("\n=== Lockfile Churn ===");
  lockfileMap.forEach((prNumbers, file) => {
    if (prNumbers.length > 1) {
      console.log(
        `DATA RACE: ${file} is being modified by PRs ${prNumbers.map((n) => "#" + n).join(", ")}`
      );
    }
  });
}

analyze();
