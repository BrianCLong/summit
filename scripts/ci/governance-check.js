// scripts/ci/governance-check.js
// Enforces governance tiers based on PR labels and changed files.
// Usage: node scripts/ci/governance-check.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ----------------------------------------------------------------------------
// Configuration: Governance Definitions
// ----------------------------------------------------------------------------

const TIERS = {
  0: { label: "agent:tier-0", paths: ["docs/", "**/*.md", "**/*.png", "**/*.jpg"], risk: "low" },
  1: {
    label: "agent:tier-1",
    paths: ["apps/web/", "client/", "tests/", "scripts/dev/"],
    risk: "moderate",
  },
  2: { label: "agent:tier-2", paths: ["server/src/", "db/migrations/", "packages/"], risk: "high" },
  3: {
    label: "agent:tier-3",
    paths: ["server/src/auth/", "server/src/payment/", "server/src/crypto/"],
    risk: "critical",
  },
  4: {
    label: "agent:tier-4",
    paths: ["policy/", ".github/", "terraform/", "docs/governance/", "scripts/ci/"],
    risk: "existential",
  },
};

const REQUIRED_AREA_LABEL_PREFIX = "area:";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function getChangedFiles() {
  // In GitHub Actions, we can use git diff.
  // Assuming checkout with fetch-depth: 0 or sufficient history.
  // For PRs, we want diff against target branch.
  try {
    const baseRef = process.env.GITHUB_BASE_REF || "main";
    const headRef = process.env.GITHUB_HEAD_REF || "HEAD";

    // Fetch base if not available (shallow clone issue)
    // In deep clone actions, this might be fine. In shallow, we might need to fetch.
    // We assume the action setup handles checkout correctly.

    // Using a simpler approach: get list from the GitHub Event JSON if available
    // which avoids git history issues in some shallow environments.
    if (process.env.GITHUB_EVENT_PATH) {
      // This is harder because the event doesn't contain all files for large PRs.
      // Falling back to git command which is more reliable if fetch-depth is set.
      const cmd = `git diff --name-only origin/${baseRef}...HEAD`;
      const output = execSync(cmd, { encoding: "utf-8" });
      return output.split("\n").filter(Boolean);
    }

    return [];
  } catch (e) {
    console.error("Error getting changed files via git:", e.message);
    // Fallback or fail
    process.exit(1);
  }
}

function getPRLabels() {
  if (!process.env.GITHUB_EVENT_PATH) {
    console.warn("No GITHUB_EVENT_PATH, assuming local test or no labels.");
    return [];
  }
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const labels = (event.pull_request && event.pull_request.labels) || [];
  return labels.map((l) => l.name);
}

function matchPath(filePath, patterns) {
  // Simple glob-like matching implementation to avoid external dependencies

  for (const pattern of patterns) {
    if (pattern.endsWith("/**")) {
      const prefix = pattern.slice(0, -3);
      if (filePath.startsWith(prefix)) return true;
    } else if (pattern.startsWith("**/*")) {
      const suffix = pattern.slice(4);
      if (filePath.endsWith(suffix)) return true;
    } else if (pattern.endsWith("/")) {
      if (filePath.startsWith(pattern)) return true;
    } else {
      if (filePath === pattern) return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------------
// Main Logic
// ----------------------------------------------------------------------------

function main() {
  console.log("Starting Governance Check...");

  const labels = getPRLabels();
  console.log("PR Labels:", labels);

  const changedFiles = getChangedFiles();
  console.log(`Checking ${changedFiles.length} changed files.`);

  // 1. Check for Tier Label
  const tierLabels = labels.filter((l) => l.startsWith("agent:tier-"));
  if (tierLabels.length === 0) {
    console.error("❌ FAILURE: Missing required 'agent:tier-*' label.");
    process.exit(1);
  }
  if (tierLabels.length > 1) {
    console.error("❌ FAILURE: Multiple 'agent:tier-*' labels found. Please use exactly one.");
    process.exit(1);
  }

  const currentTierLabel = tierLabels[0];
  const currentTierLevel = parseInt(currentTierLabel.split("-")[1], 10);
  console.log(`Detected Tier: ${currentTierLevel} (${currentTierLabel})`);

  // 2. Check for Area Label
  const areaLabels = labels.filter((l) => l.startsWith(REQUIRED_AREA_LABEL_PREFIX));
  if (areaLabels.length === 0) {
    console.error("❌ FAILURE: Missing required 'area:*' label.");
    process.exit(1);
  }

  // 3. Validate Files against Tier
  const violations = [];

  for (const file of changedFiles) {
    let requiredTier = 0; // Default to lowest

    // Find the highest required tier for this file
    // Iterate from Tier 4 down to 0
    for (let t = 4; t >= 0; t--) {
      if (matchPath(file, TIERS[t].paths)) {
        requiredTier = t;
        break;
      }
    }

    // Check: is currentTierLevel >= requiredTier?
    if (currentTierLevel < requiredTier) {
      violations.push({ file, required: requiredTier, current: currentTierLevel });
    }
  }

  if (violations.length > 0) {
    console.error("❌ FAILURE: Governance violations detected!");
    console.error("The following files require a higher Tier label than currently assigned:");
    violations.forEach((v) => {
      console.error(` - ${v.file} (Requires Tier ${v.required}, PR is Tier ${v.current})`);
    });
    console.error("\nPlease upgrade the PR label to match the sensitivity of the modified files.");
    process.exit(1);
  }

  console.log("✅ SUCCESS: All governance checks passed.");
}

main();
