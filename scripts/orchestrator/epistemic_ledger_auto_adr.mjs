#!/usr/bin/env node
/**
 * Summit Epistemic Ledger (Auto-ADR Engine)
 * 
 * SOTA Innovation:
 * AI agents generate perfectly functional code, but they don't leave human-readable 
 * paper trails explaining *why* they chose a specific structural pattern. In a year,
 * the repo becomes an unmaintainable black box ("Epistemic Rot").
 * 
 * This agent hooks into the `post-merge-sync` pipeline. If a merged PR is sufficiently 
 * large or touches structural components, it uses an LLM to deduce the Context, Decision, 
 * and Consequences of the change, and commits an immutable Architecture Decision Record (ADR)
 * into `docs/governance/decisions/`.
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const baseRef = process.env.BASE_REF || "HEAD~1";

if (!token || !repoEnv) process.exit(1);

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

async function main() {
  console.log("Waking up Epistemic Ledger (Auto-ADR Engine)...");

  const diff = exec(`git diff ${baseRef}...HEAD`, true);
  if (!diff || diff.length < 500) {
    console.log("Merge too small to warrant a formal ADR.");
    return;
  }
  if (diff.length > 50000) {
    console.log("Merge too massive. Skipping Auto-ADR due to token limits.");
    return;
  }

  // Get commit message / PR title to help provide context
  const commitLog = exec(`git log -1 --pretty=%B HEAD`, true) || "";

  const prompt = `You are the Summit Principal Architect. A major code change was just merged. 
To prevent "Epistemic Rot", you must mathematically deduce the intention behind this code and write a formal Architecture Decision Record (ADR).

Read the Git Diff and Commit Log below. 
Determine:
1. What was the Context/Problem?
2. What was the Decision made by the AI/Human?
3. What are the Consequences (trade-offs, new dependencies, structural changes)?

Format the response EXACTLY as a Markdown ADR:
# ADR-YYYYMMDD: [Short Title]

## Context
[Explain the problem]

## Decision
[Explain the technical decision]

## Consequences
[List trade-offs and impact]

--- COMMIT LOG ---
${commitLog}

--- GIT DIFF ---
${diff.substring(0, 15000)}
`;

  let adrText = null;
  if (process.env.ANTHROPIC_API_KEY) {
    adrText = await callAI(prompt, process.env.ANTHROPIC_API_KEY, "anthropic");
  } else if (process.env.OPENAI_API_KEY) {
    adrText = await callAI(prompt, process.env.OPENAI_API_KEY, "openai");
  }

  if (adrText && adrText.includes("## Decision")) {
    let cleanAdr = adrText;
    if (cleanAdr.startsWith("\`\`\`markdown")) {
        cleanAdr = cleanAdr.replace(/^\`\`\`markdown\n/, "").replace(/\n\`\`\`$/, "");
    }
    
    // Generate filename based on date and time
    const date = new Date();
    const timestamp = date.toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const fileName = `docs/governance/decisions/ADR-${timestamp}.md`;

    await fs.writeFile(fileName, cleanAdr);
    console.log(`\nSuccessfully inscribed new Epistemic Ledger: ${fileName}`);

    exec("git config --global user.name 'summit-epistemic-ledger[bot]'");
    exec("git config --global user.email 'summit-epistemic-ledger[bot]@users.noreply.github.com'");
    exec(`git add ${fileName}`);
    exec(`git commit -m "docs(governance): auto-inscribe ADR-${timestamp} [skip ci]"`, true);
    exec(`git push origin main`, true);
  } else {
    console.log("No significant architectural decisions detected. Skipping ADR.");
  }
}

main().catch(console.error);
