#!/usr/bin/env node
/**
 * Deterministic Merge Train Dashboard
 * - no timestamps
 * - stable ordering
 * - purely derived from PR/queue state inputs
 *
 * Inputs:
 * - GITHUB_REPOSITORY, GH_TOKEN (via Actions)
 * Output:
 * - artifacts/merge-train-dashboard.md
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error("GITHUB_REPOSITORY missing");

  // Pull open PRs and summarize
  const prsJson = sh("gh", [
    "pr",
    "list",
    "--repo",
    repo,
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,title,author,labels,reviewDecision,isDraft,mergeable,headRefName,baseRefName"
  ]);
  const prs = JSON.parse(prsJson);

  const ready = [];
  const blocked = [];
  for (const pr of prs) {
    const labels = (pr.labels || []).map(l => l.name).sort(cmp);
    const isReady = labels.includes("queue:ready") && pr.reviewDecision === "APPROVED" && !pr.isDraft;
    const risk =
      labels.includes("risk:high") ? "high" :
      labels.includes("risk:low") ? "low" : "med";

    const entry = {
      number: pr.number,
      title: pr.title,
      author: pr.author?.login || "unknown",
      risk,
      labels
    };

    if (isReady) ready.push(entry);
    else blocked.push(entry);
  }

  ready.sort((a, b) => cmp(a.risk, b.risk) || (a.number - b.number));
  blocked.sort((a, b) => (a.number - b.number));

  // Render deterministic markdown
  const lines = [];
  lines.push(`# Merge Train Dashboard`);
  lines.push(``);
  lines.push(`Repository: \`${repo}\``);
  lines.push(``);
  lines.push(`## Ready for Queue`);
  lines.push(`Count: ${ready.length}`);
  lines.push(``);
  if (ready.length === 0) {
    lines.push(`(none)`);
  } else {
    for (const pr of ready) {
      lines.push(
        `- #${pr.number} [risk:${pr.risk}] ${pr.title} (by @${pr.author})`
      );
    }
  }

  lines.push(``);
  lines.push(`## Blocked`);
  lines.push(`Count: ${blocked.length}`);
  lines.push(``);
  if (blocked.length === 0) {
    lines.push(`(none)`);
  } else {
    for (const pr of blocked) {
      // keep it minimal; labels shown for debugging triage
      const labelStr = pr.labels.join(", ");
      lines.push(`- #${pr.number} [risk:${pr.risk}] ${pr.title} (labels: ${labelStr})`);
    }
  }

  const outDir = path.join("artifacts");
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, "merge-train-dashboard.md"), lines.join("\n") + "\n", "utf8");
}

main();
