#!/usr/bin/env node
import { execSync } from "child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;

if (!token || !repoEnv) process.exit(1);

function gh(cmd) {
  try {
    return JSON.parse(execSync(`gh ${cmd}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }));
  } catch (e) { return []; }
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

function touchesGovernedPaths(files = []) {
  const governed = [".github/", "docs/governance/", "infra/", "scripts/pr/"];
  return files.some(f => governed.some(g => f.startsWith(governed)));
}

async function main() {
  console.log("Fetching open PRs for governance-aware classification...");
  const prs = gh(`pr list --repo ${repoEnv} --state open --limit 1000 --json number,title,body,mergeable,mergeStateStatus,labels,updatedAt,author,files`);

  const byNumber = new Map(prs.map(pr => [pr.number, pr]));
  
  // Pre-process clusters
  const concernClusters = new Map();
  for (const pr of prs) {
    pr.concern = parseConcern(pr.body || "");
    pr.supersedes = parseSupersedes(pr.body || "");
    pr.fileList = (pr.files || []).map(f => f.path);
    
    if (pr.concern) {
      if (!concernClusters.has(pr.concern)) concernClusters.set(pr.concern, []);
      concernClusters.get(pr.concern).push(pr);
    }
  }

  const canonicalByConcern = new Map();
  for (const [concern, cluster] of concernClusters.entries()) {
    const sorted = [...cluster].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt) || a.number - b.number);
    canonicalByConcern.set(concern, sorted[0].number);
  }

  for (const pr of prs) {
    const num = pr.number;
    const currentLabels = pr.labels.map(l => l.name);
    let targetLabel = "queue:blocked";

    // 1. Determine base state
    if (pr.mergeable === "MERGEABLE" && (pr.mergeStateStatus === "CLEAN" || pr.mergeStateStatus === "UNSTABLE")) {
      targetLabel = "queue:merge-now";
    } else if (pr.mergeStateStatus === "DIRTY" || pr.mergeStateStatus === "BEHIND") {
      targetLabel = "queue:needs-rebase";
    } else if (pr.mergeable === "CONFLICTING") {
      targetLabel = "queue:conflict";
    }

    // 2. Governed path check
    if (!pr.concern && touchesGovernedPaths(pr.fileList)) {
      console.log(`PR #${num} touches governed zones but has no /concern. Blocking.`);
      targetLabel = "queue:blocked";
    }

    // 3. Governance-aware supersedence
    if (pr.concern) {
      const canonical = canonicalByConcern.get(pr.concern);
      if (canonical && canonical !== num) {
        targetLabel = "queue:obsolete";
        console.log(`PR #${num} is non-canonical in /concern ${pr.concern}; canonical is #${canonical}`);
      }
    }

    // 4. Update Labels (Normalization to colon format)
    const queueLabels = ["queue:merge-now", "queue:needs-rebase", "queue:conflict", "queue:blocked", "queue:obsolete"];
    for (const l of currentLabels) {
      if (queueLabels.includes(l) && l !== targetLabel) {
        execSync(`gh pr edit ${num} --remove-label "${l}"`, { stdio: 'ignore' });
      }
    }
    if (!currentLabels.includes(targetLabel)) {
      execSync(`gh pr edit ${num} --add-label "${targetLabel}"`, { stdio: 'ignore' });
    }
  }
}

main().catch(console.error);
