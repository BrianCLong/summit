#!/usr/bin/env node
/**
 * Summit AI Tech Lead (Meta-Dispatcher)
 * 
 * Post-FAANG Innovation:
 * When PRs are fundamentally stuck (`queue:blocked`, `queue:manual`, or `sentinel-rejected`),
 * human intervention is the traditional bottleneck. 
 * 
 * The AI Tech Lead acts as the engineering manager. It sweeps stalled PRs, reads the CI logs, 
 * sentinel rejections, and code diffs, and synthesizes a precise, actionable implementation plan.
 * It then "dispatches" this task by emitting a structured JSON artifact that downstream worker
 * agents (Jules, Codex, Claude) automatically ingest to execute the repair in a new branch.
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;

if (!token || !repoEnv) {
  console.error("Missing GITHUB_TOKEN or REPO");
  process.exit(1);
}

const [owner, repo] = repoEnv.split("/");

async function callAI(prompt, apiKey, provider) {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.content[0].text;
  } else if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: prompt }]
      })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }
  return null;
}

function exec(cmd, ignoreErrors = false) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  } catch (err) {
    if (!ignoreErrors) console.error(`Command failed: ${cmd}`);
    return null;
  }
}

function cleanJSON(text) {
  const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
  return match ? match[1] : text.trim();
}

async function main() {
  console.log("AI Tech Lead waking up to review stalled operations...");

  // Fetch stalled PRs
  const query = `search/issues?q=repo:${repoEnv}+is:pr+is:open+label:queue:blocked,queue:manual,sentinel-rejected+no:assignee`;
  const stalledPrsData = exec(`gh api ${query}`);
  if (!stalledPrsData) return;

  const stalledPrs = JSON.parse(stalledPrsData).items;
  if (!stalledPrs || stalledPrs.length === 0) {
    console.log("No unassigned stalled PRs found. Factory floor is flowing smoothly.");
    return;
  }

  console.log(`Found ${stalledPrs.length} stalled PRs requiring technical leadership.`);

  const dispatchManifest = [];

  for (const pr of stalledPrs.slice(0, 3)) { // Process top 3 to respect rate limits
    console.log(`Tech Lead reviewing PR #${pr.number}: ${pr.title}`);
    
    // Fetch recent comments and diff
    const commentsOut = exec(`gh pr view ${pr.number} --repo ${repoEnv} --json comments --jq '.comments[].body'`, true);
    const diff = exec(`gh pr diff ${pr.number} --repo ${repoEnv}`, true);
    
    if (!diff) continue;

    const prompt = `You are the AI Tech Lead for a FAANG-scale autonomous engineering team.
A subordinate agent or contributor submitted a Pull Request that is now blocked, failed CI, or was rejected by the architectural sentinel.

Your job is to analyze the failure and write a precise, highly actionable task delegation spec for a Junior AI Agent to fix the PR.

--- PR TITLE ---
${pr.title}

--- RECENT COMMENTS / ERROR LOGS ---
${(commentsOut || "").substring(0, 2000)}

--- DIFF ---
${diff.substring(0, 3000)}

Output a valid JSON object matching this schema:
{
  "root_cause_analysis": "Briefly explain why this failed.",
  "actionable_instruction": "A strict, step-by-step prompt telling the worker agent exactly how to rewrite the code to fix the problem without losing the core intent."
}
`;

    let resultStr = null;
    if (process.env.ANTHROPIC_API_KEY) {
      resultStr = await callAI(prompt, process.env.ANTHROPIC_API_KEY, "anthropic");
    } else if (process.env.OPENAI_API_KEY) {
      resultStr = await callAI(prompt, process.env.OPENAI_API_KEY, "openai");
    }

    if (resultStr) {
      try {
        const analysis = JSON.parse(cleanJSON(resultStr));
        
        console.log(`  -> Diagnosed: ${analysis.root_cause_analysis}`);
        
        const delegation = {
          pr_number: pr.number,
          title: pr.title,
          diagnosis: analysis.root_cause_analysis,
          instructions: analysis.actionable_instruction,
          dispatched_at: new Date().toISOString()
        };
        
        dispatchManifest.push(delegation);

        // Assign the PR to a bot to indicate it is being worked on
        exec(`gh pr edit ${pr.number} --repo ${repoEnv} --add-assignee "@me"`, true);

        // Comment the plan on the PR for human visibility
        const commentBody = `👑 **AI Tech Lead Diagnosis**\n\n**Root Cause:** ${analysis.root_cause_analysis}\n\n**Action Plan:** An agent has been dispatched to execute the following repair:\n> ${analysis.actionable_instruction}\n\n*The Omni-Recovery agent will process this repair in the next cycle.*`;
        
        await fs.writeFile(`artifacts/comment-${pr.number}.md`, commentBody);
        exec(`gh pr comment ${pr.number} --repo ${repoEnv} --body-file artifacts/comment-${pr.number}.md`, true);

      } catch (e) {
        console.error(`Failed to parse Tech Lead analysis for PR #${pr.number}`, e.message);
      }
    }
  }

  if (dispatchManifest.length > 0) {
    // Append to the recovery queue so Omni-Recovery/Slicer can execute the instructions
    let existingRequests = [];
    try {
      existingRequests = JSON.parse(await fs.readFile("artifacts/recovery_requests.json", "utf8"));
    } catch(e) {}

    const updatedRequests = [...existingRequests, ...dispatchManifest.map(d => ({
      pr_number: d.pr_number,
      title: d.title,
      instruction: d.instructions,
      is_tech_lead_dispatch: true
    }))];

    await fs.mkdir("artifacts", { recursive: true });
    await fs.writeFile("artifacts/recovery_requests.json", JSON.stringify(updatedRequests, null, 2));
    console.log(`\nSuccessfully dispatched ${dispatchManifest.length} repair tasks to the agent pool.`);
  }
}

main().catch(console.error);
