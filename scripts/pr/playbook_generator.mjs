#!/usr/bin/env node
/**
 * Minimum Merge Set (MMS) Playbook Generator
 * 
 * Purpose:
 * - Identify "root" PRs that control the largest clusters
 * - Generate a step-by-step merge order for backlog collapse
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

async function run() {
    console.log("Generating Minimum Merge Set Playbook...");

    // Use existing prs.json if available, else fetch
    let prs;
    try {
        prs = JSON.parse(await fs.readFile("artifacts/supersedence-report.json", "utf8")).clusters;
    } catch (e) {
        console.log("Supersedence report not found. Run planner first.");
        return;
    }

    // Sort by cluster size (most impact first)
    const sorted = prs.sort((a, b) => b.losers.length - a.losers.length);

    let playbook = `# Summit Merge Playbook: Backlog Collapse\n\n`;
    playbook += `This playbook identifies the **Minimum Merge Set (MMS)** required to eliminate the largest portion of the PR backlog through supersedence.\n\n`;

    playbook += `## Phase 1: High-Impact Root Merges\n\n`;
    playbook += `Merge these PRs first to automatically obsolete their clusters.\n\n`;

    for (const cluster of sorted.slice(0, 10)) {
        playbook += `### Root PR #${cluster.survivor}\n`;
        playbook += `- **Total Collapse Potential**: ${cluster.losers.length} PRs\n`;
        playbook += `- **Obsoletes**: ${cluster.losers.map(l => `#${l.pr}`).join(", ")}\n`;
        playbook += `\n`;
    }

    playbook += `## Phase 2: Mass Closure\n\n`;
    playbook += `Once Phase 1 merges are confirmed, close the ${sorted.reduce((acc, c) => acc + c.losers.length, 0)} identified obsolete PRs.\n`;

    await fs.writeFile("artifacts/merge_playbook.md", playbook);
    console.log("Playbook generated: artifacts/merge_playbook.md");
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
