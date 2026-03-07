#!/usr/bin/env node
/**
 * Summit Canonical Survivor Auto-Selector
 *
 * Automatically designates the best PR per concern cluster as the canonical survivor.
 * Uses quality scoring: recency, CI status, reviews, mergeable state.
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

function parseSupersedes(body = "") {
  const lines = body.split("\n");
  const out = new Set();
  for (const line of lines) {
    const m = line.match(/^\s*\/supersedes\s+(.+)\s*$/i);
    if (!m) continue;
    for (const ref of m[1].matchAll(/#(\d+)/g)) out.add(Number(ref[1]));
  }
  return [...out];
}

function qualityScore(pr) {
  let score = 0;

  // Recency: newer is better (max +0.3)
  const ageInDays = (Date.now() - new Date(pr.updatedAt)) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 0.3 - (ageInDays / 30) * 0.1);

  // Mergeable state (+0.4 if clean)
  if (pr.mergeable === "MERGEABLE") score += 0.4;

  // Not draft (+0.15)
  if (!pr.isDraft) score += 0.15;

  // Has reviews (+0.1)
  if (pr.reviews && pr.reviews.totalCount > 0) score += 0.1;

  // Not superseded by others (+0.05)
  const hasSupersededLabel = pr.labels.some(l => l.name === "superseded");
  if (!hasSupersededLabel) score += 0.05;

  return score;
}

async function main() {
  console.log("Fetching all open PRs for canonical survivor selection...");

  const prs = gh(`pr list --repo ${repoEnv} --state open --limit 1000 --json number,title,body,mergeable,isDraft,labels,updatedAt,reviews`);

  const concernClusters = new Map();

  for (const pr of prs) {
    pr.concern = parseConcern(pr.body || "");
    pr.supersedes = parseSupersedes(pr.body || "");
    pr.score = qualityScore(pr);

    if (pr.concern) {
      if (!concernClusters.has(pr.concern)) concernClusters.set(pr.concern, []);
      concernClusters.get(pr.concern).push(pr);
    }
  }

  console.log(`Found ${concernClusters.size} concern clusters.`);

  let promoted = 0;
  let demoted = 0;

  for (const [concern, cluster] of concernClusters.entries()) {
    if (cluster.length === 0) continue;

    // Sort by quality score descending
    const sorted = [...cluster].sort((a, b) => b.score - a.score);
    const canonical = sorted[0];
    const superseded = sorted.slice(1);

    console.log(`\nConcern: ${concern}`);
    console.log(`  Canonical: PR #${canonical.number} (score: ${canonical.score.toFixed(2)}) - ${canonical.title}`);

    // Label canonical as survivor
    const currentLabels = canonical.labels.map(l => l.name);
    if (!currentLabels.includes("canonical-survivor")) {
      exec(`gh pr edit ${canonical.number} --add-label "canonical-survivor"`, true);
      console.log(`  ✓ Labeled PR #${canonical.number} as canonical-survivor`);
      promoted++;
    }

    // Remove any conflicting labels from canonical
    if (currentLabels.includes("superseded")) {
      exec(`gh pr edit ${canonical.number} --remove-label "superseded"`, true);
    }
    if (currentLabels.includes("queue:obsolete")) {
      exec(`gh pr edit ${canonical.number} --remove-label "queue:obsolete"`, true);
    }

    // Promote canonical to merge-now if mergeable
    if (canonical.mergeable === "MERGEABLE" && !currentLabels.includes("queue:merge-now")) {
      // Remove other queue labels first
      ["queue:needs-rebase", "queue:conflict", "queue:blocked"].forEach(l => {
        if (currentLabels.includes(l)) {
          exec(`gh pr edit ${canonical.number} --remove-label "${l}"`, true);
        }
      });
      exec(`gh pr edit ${canonical.number} --add-label "queue:merge-now"`, true);
      console.log(`  ✓ Promoted PR #${canonical.number} to queue:merge-now`);
    }

    // Label superseded PRs
    for (const pr of superseded) {
      const labels = pr.labels.map(l => l.name);
      if (!labels.includes("superseded")) {
        exec(`gh pr edit ${pr.number} --add-label "superseded"`, true);
        console.log(`  → Marked PR #${pr.number} as superseded (score: ${pr.score.toFixed(2)})`);
        demoted++;
      }
      if (!labels.includes("queue:obsolete")) {
        // Remove other queue labels
        ["queue:merge-now", "queue:needs-rebase", "queue:conflict", "queue:blocked"].forEach(l => {
          if (labels.includes(l)) {
            exec(`gh pr edit ${pr.number} --remove-label "${l}"`, true);
          }
        });
        exec(`gh pr edit ${pr.number} --add-label "queue:obsolete"`, true);
      }
    }
  }

  console.log(`\nCanonical Survivor Selection Complete:`);
  console.log(`  ${promoted} PRs promoted to canonical-survivor`);
  console.log(`  ${demoted} PRs marked as superseded`);
  console.log(`  ${concernClusters.size} concern clusters processed`);
}

main().catch(console.error);
