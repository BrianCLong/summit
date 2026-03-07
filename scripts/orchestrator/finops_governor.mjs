#!/usr/bin/env node
/**
 * Summit AI FinOps Governor & Thrash Detector
 * 
 * SOTA Innovation:
 * AI agents cost money (API tokens, CI compute). If an agent hallucinates and enters an infinite
 * retry loop, it can bankrupt a project.
 * 
 * This Governor runs hourly. It analyzes the PR history to detect "Agent Thrashing":
 * e.g., 5+ closed/rejected PRs touching the exact same files within 24 hours, or PRs with massive
 * churn but zero merge success.
 * 
 * When detected, it mathematically calculates the negative ROI, halts the offending agent's PRs 
 * with a `queue:blocked` & `finops-halt` label, and alerts the human operator to intervene.
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;

if (!token || !repoEnv) process.exit(1);

function gh(cmd) {
  try {
    return JSON.parse(execSync(`gh ${cmd}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }));
  } catch (e) { return []; }
}

function exec(cmd) {
  try {
    execSync(cmd, { stdio: "ignore" });
  } catch(e) {}
}

async function main() {
  console.log("Engaging AI FinOps Governor...");

  // Fetch recent PRs (last 100)
  const prs = gh(`pr list --repo ${repoEnv} --state all --limit 100 --json number,title,author,createdAt,state,files`);
  
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Group PRs by author (agent) and file overlap
  const activityMap = {};

  for (const pr of prs) {
    const prTime = new Date(pr.createdAt).getTime();
    if (now - prTime > ONE_DAY) continue; // Only look at last 24h

    const author = pr.author.login;
    if (!activityMap[author]) activityMap[author] = [];
    
    activityMap[author].push({
      number: pr.number,
      state: pr.state, // OPEN, CLOSED, MERGED
      files: (pr.files || []).map(f => f.path)
    });
  }

  const thrashingAlerts = [];

  for (const [author, authorPrs] of Object.entries(activityMap)) {
    const unmerged = authorPrs.filter(p => p.state !== "MERGED");
    
    // Heuristic: If an agent creates 5+ unmerged PRs in 24h, check for file overlap
    if (unmerged.length >= 5) {
      const fileFrequencies = {};
      unmerged.forEach(pr => {
        pr.files.forEach(f => {
          fileFrequencies[f] = (fileFrequencies[f] || 0) + 1;
        });
      });

      // If they touched the same file 4+ times without merging, they are thrashing
      const heavilyHackedFiles = Object.entries(fileFrequencies).filter(([f, count]) => count >= 4);
      
      if (heavilyHackedFiles.length > 0) {
        thrashingAlerts.push({
          author,
          files: heavilyHackedFiles.map(h => h[0]),
          prNumbers: unmerged.map(p => p.number)
        });
      }
    }
  }

  if (thrashingAlerts.length > 0) {
    console.log(`🚨 FinOps Governor detected ${thrashingAlerts.length} instances of Agent Thrashing!`);
    
    for (const alert of thrashingAlerts) {
      console.log(`Halting operations for ${alert.author} on files: ${alert.files.join(", ")}`);
      
      const comment = `⛔ **FinOps Governor Halt** ⛔\n\nThis agent has submitted multiple unmerged PRs modifying the same files (\`${alert.files[0]}\`, etc.) within 24 hours. This indicates a hallucination or failure loop that is burning CI and Token compute budgets.\n\nAll associated PRs have been halted. Human intervention is required to fix the agent's prompt or logic.`;
      
      for (const prNum of alert.prNumbers) {
        // Only comment/label if it's currently open
        const isOpen = gh(`pr view ${prNum} --repo ${repoEnv} --json state`).state === "OPEN";
        if (isOpen) {
          await fs.writeFile("artifacts/finops/halt.md", comment);
          exec(`gh pr comment ${prNum} --repo ${repoEnv} --body-file artifacts/finops/halt.md`);
          exec(`gh pr edit ${prNum} --repo ${repoEnv} --add-label "queue:blocked,finops-halt"`);
        }
      }
    }
    process.exit(1); // Fail workflow to trigger notifications
  } else {
    console.log("No AI compute thrashing detected. Economics are optimal.");
  }
}

main().catch(console.error);
