#!/usr/bin/env node
/**
 * Summit Auto-Concern Detector
 *
 * Automatically detects and assigns /concern declarations to PRs that don't have them.
 * Uses heuristic analysis of title, body, and file paths.
 */

import { execSync } from "child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;

if (!token || !repoEnv) {
  console.error("Missing GITHUB_TOKEN or REPO");
  process.exit(1);
}

function gh(cmd) {
  try {
    return JSON.parse(execSync(`gh ${cmd}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }));
  } catch (e) {
    return [];
  }
}

function exec(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: silent ? "ignore" : ["pipe", "pipe", "pipe"] });
  } catch (e) {
    return null;
  }
}

function parseConcern(body = "") {
  const m = body.match(/(?:^|\n)\s*\/concern\s+([a-z0-9._/-]+)\s*(?:\n|$)/i);
  return m ? m[1].toLowerCase() : null;
}

function detectConcernFromContent(pr) {
  const title = (pr.title || "").toLowerCase();
  const body = (pr.body || "").toLowerCase();
  const files = (pr.files || []).map(f => f.path.toLowerCase());

  // Check for common patterns
  const patterns = [
    { keywords: ["agent", "agentic", "control-plane", "orchestration"], concern: "agent-control-plane" },
    { keywords: ["evidence", "governance", "audit", "compliance"], concern: "evidence-governance" },
    { keywords: ["workflow", "ci", "github-actions", "automation"], concern: "workflow-automation" },
    { keywords: ["auth", "authentication", "webauthn", "jwt", "security"], concern: "authentication" },
    { keywords: ["graph", "neo4j", "knowledge-graph", "entity"], concern: "knowledge-graph" },
    { keywords: ["epistemic", "epistemology", "immune-system"], concern: "epistemic-system" },
    { keywords: ["api", "endpoint", "route", "controller"], concern: "api" },
    { keywords: ["ui", "frontend", "component", "react"], concern: "frontend" },
    { keywords: ["database", "migration", "schema", "postgres"], concern: "database" },
    { keywords: ["test", "testing", "jest", "vitest"], concern: "testing" },
    { keywords: ["docs", "documentation", "readme"], concern: "documentation" },
    { keywords: ["performance", "optimization", "caching"], concern: "performance" },
    { keywords: ["ml", "machine-learning", "model", "training"], concern: "ml-platform" },
    { keywords: ["intel", "intelligence", "sigint", "osint"], concern: "intelligence-platform" },
  ];

  // Score each concern
  const scores = new Map();
  for (const pattern of patterns) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      if (title.includes(keyword)) score += 3;
      if (body.includes(keyword)) score += 1;
      if (files.some(f => f.includes(keyword))) score += 2;
    }
    if (score > 0) scores.set(pattern.concern, score);
  }

  // Return highest scoring concern
  if (scores.size === 0) {
    // Fallback: detect from file paths
    const firstFile = files[0] || "";
    if (firstFile.startsWith("packages/")) {
      const pkg = firstFile.split("/")[1];
      return pkg || "general";
    }
    if (firstFile.startsWith("services/")) {
      const svc = firstFile.split("/")[1];
      return svc || "general";
    }
    if (firstFile.startsWith("apps/")) {
      const app = firstFile.split("/")[1];
      return app || "general";
    }
    return "general";
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

async function main() {
  console.log("Fetching PRs without /concern declarations...");

  const prs = gh(`pr list --repo ${repoEnv} --state open --limit 1000 --json number,title,body`);

  console.log(`Fetched ${prs.length} total PRs`);

  const withoutConcern = prs.filter(pr => !parseConcern(pr.body));

  console.log(`Found ${withoutConcern.length} PRs without /concern declarations.`);

  let assigned = 0;

  for (const pr of withoutConcern) {
    // Fetch files for this PR
    const prDetails = gh(`pr view ${pr.number} --repo ${repoEnv} --json files`);
    pr.files = prDetails.files || [];

    const detectedConcern = detectConcernFromContent(pr);
    console.log(`PR #${pr.number}: Auto-detected concern = ${detectedConcern}`);

    // Update PR body with /concern declaration
    const newBody = `${pr.body || ""}\n\n/concern ${detectedConcern}\n/supersedes none\n`;

    try {
      execSync(`gh pr edit ${pr.number} --repo ${repoEnv} --body ${JSON.stringify(newBody)}`, {
        encoding: "utf8",
        stdio: "ignore"
      });
      console.log(`  ✓ Added /concern ${detectedConcern} to PR #${pr.number}`);
      assigned++;
    } catch (e) {
      console.error(`  ✗ Failed to update PR #${pr.number}`);
    }
  }

  console.log(`\nAuto-Concern Detection Complete: ${assigned} PRs updated`);
}

main().catch(console.error);
