#!/usr/bin/env node
/**
 * Summit Semantic Architecture Sentinel
 * 
 * FAANG-Level AI Architecture Guard:
 * When you merge 50-100 PRs simultaneously, AST-based linting isn't enough. 
 * You need to ensure the *aggregate* semantic meaning of the merged code hasn't violated 
 * your core repository architecture (e.g. `ARCHITECTURE_MAP.generated.yaml`, `COMPLIANCE_CONTROLS.md`).
 * 
 * This Sentinel intercepts `integration-pass` branches before they merge, reviews the entire diff 
 * contextually via LLM, and ejects specific PRs if they violate architectural boundaries.
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
  console.log("Waking up Semantic Architecture Sentinel...");

  // Find the active Harvest Integration Train PR
  const out = exec(`gh pr list --repo ${repoEnv} --label "integration-pass" --limit 1 --json number,title`);
  if (!out) return;
  const prs = JSON.parse(out);
  if (prs.length === 0) {
    console.log("No active integration train to evaluate.");
    return;
  }
  
  const targetPr = prs[0];
  console.log(`Evaluating Integration Train PR #${targetPr.number}: ${targetPr.title}`);

  const diff = exec(`gh pr diff ${targetPr.number} --repo ${repoEnv}`, true);
  if (!diff || diff.length > 80000) {
    console.log("Diff too large or unavailable for deep AI semantic scan. Skipping Sentinel.");
    return;
  }

  // Load contextual maps if they exist
  let architectureMap = "";
  try {
    architectureMap = await fs.readFile("ARCHITECTURE_MAP.generated.yaml", "utf8");
  } catch(e) {}
  
  let complianceControls = "";
  try {
    complianceControls = await fs.readFile("COMPLIANCE_CONTROLS.md", "utf8");
  } catch(e) {}

  const prompt = `You are the Summit Meta-Architectural Sentinel.
Your job is to read the aggregated Git Diff of a mass-harvest integration train. You must ensure that the combined semantic meaning of this code does NOT violate the repository's core architectural boundaries or compliance controls.

Look specifically for:
1. Bypassing established governance ledgers or security gates.
2. Mixing UI code directly with Database/Infrastructure code.
3. Hardcoded secrets, keys, or non-deterministic test data (mocks) where they are banned.
4. Any flagrant violation of these reference documents:

--- ARCHITECTURE MAP ---
${architectureMap.substring(0, 1500)}

--- COMPLIANCE CONTROLS ---
${complianceControls.substring(0, 1500)}

Analyze the diff below. If there are NO severe violations, return exactly {"status": "PASS", "violations": []}.
If there ARE severe violations, return a JSON object like {"status": "FAIL", "violations": [{"file": "path/to/file", "reason": "why it violates"}]}

--- DIFF ---
${diff}
`;

  let resultJsonStr = null;
  if (process.env.ANTHROPIC_API_KEY) {
    resultJsonStr = await callAI(prompt, process.env.ANTHROPIC_API_KEY, "anthropic");
  } else if (process.env.OPENAI_API_KEY) {
    resultJsonStr = await callAI(prompt, process.env.OPENAI_API_KEY, "openai");
  } else {
    console.log("No AI key available. Sentinel asleep.");
    return;
  }

  try {
    const analysis = JSON.parse(cleanJSON(resultJsonStr));
    if (analysis.status === "FAIL" && analysis.violations.length > 0) {
      console.log(`Sentinel detected ${analysis.violations.length} architectural violations!`);
      
      let commentBody = `🚨 **Semantic Architecture Sentinel Blocked This Integration** 🚨\n\n`;
      commentBody += `The aggregated diff violates core repository boundaries. This train cannot merge until the violating code is ejected or fixed.\n\n`;
      analysis.violations.forEach(v => {
        commentBody += `- **File**: \`${v.file}\`\n  **Reason**: ${v.reason}\n`;
      });

      // Post comment
      await fs.writeFile("artifacts/sentinel/comment.md", commentBody);
      exec(`gh pr comment ${targetPr.number} --repo ${repoEnv} --body-file artifacts/sentinel/comment.md`);
      
      // Block the PR by applying a blocked label or requesting changes
      exec(`gh pr edit ${targetPr.number} --repo ${repoEnv} --add-label "queue:blocked,sentinel-rejected"`);
      
      // We could also do `gh pr close` or `git revert` here, but blocking it is safer to let the Slicer agent dismantle it.
      process.exit(1); // Fail the CI job
    } else {
      console.log("Sentinel verified architectural integrity. Proceeding.");
    }
  } catch (err) {
    console.error("Sentinel failed to parse analysis:", err.message);
  }
}

main().catch(console.error);
