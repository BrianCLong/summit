#!/usr/bin/env node
/**
 * Summit Proactive Entropy Hunter (Codebase Immune System)
 * 
 * SOTA Innovation:
 * 10,000 micro-PRs merging daily will inevitably cause architectural drift and "Spaghetti Code",
 * even if every single test passes. Code gets duplicated, APIs get deprecated, and files grow too large.
 * 
 * The Entropy Hunter does not wait for PRs. It runs weekly to proactively scan the `main` branch.
 * It uses AI to identify code duplication, cyclomatic complexity, or dead code.
 * It then automatically dispatches Refactor Tasks to the AI Tech Lead's queue, or spins up
 * refactor PRs itself.
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;

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
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch (err) {
    if (!ignoreErrors) console.error(`Command failed: ${cmd}`);
    return "";
  }
}

function cleanJSON(text) {
  const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
  return match ? match[1] : text.trim();
}

async function main() {
  console.log("Waking up Proactive Entropy Hunter...");

  // 1. Find the largest or most frequently changed files (hotspots for entropy)
  // We'll approximate this by finding the largest TS/JS files in scripts/ or src/
  const largeFilesStr = exec(`find scripts -type f -name "*.ts" -o -name "*.js" -o -name "*.mjs" -exec wc -c {} + | sort -nr | head -n 3`);
  if (!largeFilesStr) return;

  const filesToScan = largeFilesStr.split("\n").map(line => {
    const parts = line.trim().split(" ");
    return parts.length > 1 ? parts[1] : null;
  }).filter(Boolean);

  if (filesToScan.length === 0) {
    console.log("No files selected for entropy scan.");
    return;
  }

  const entropyDispatches = [];

  for (const file of filesToScan) {
    console.log(`Scanning Hotspot File for Entropy: ${file}`);
    const content = await fs.readFile(file, "utf8");

    if (content.length > 30000) {
      console.log(`File ${file} too large for immediate context window. Skipping this cycle.`);
      continue;
    }

    const prompt = `You are the Summit Proactive Entropy Hunter. 
Your job is to identify technical debt, spaghetti code, duplicated logic, or dead code in the following file.

--- FILE: ${file} ---
${content}

If the file is well-structured, return EXACTLY: {"status": "CLEAN", "refactoring_task": null}
If the file suffers from high entropy, return a JSON object with a specific, actionable refactoring task for a subordinate AI agent. Format:
{
  "status": "ENTROPY_DETECTED",
  "reason": "Brief explanation of the debt",
  "refactoring_task": "Strict, step-by-step instructions on how an agent should refactor this file to reduce complexity."
}`;

    let resultStr = null;
    if (process.env.ANTHROPIC_API_KEY) {
      resultStr = await callAI(prompt, process.env.ANTHROPIC_API_KEY, "anthropic");
    } else if (process.env.OPENAI_API_KEY) {
      resultStr = await callAI(prompt, process.env.OPENAI_API_KEY, "openai");
    }

    if (resultStr) {
      try {
        const analysis = JSON.parse(cleanJSON(resultStr));
        if (analysis.status === "ENTROPY_DETECTED" && analysis.refactoring_task) {
          console.log(`  -> Entropy Detected! Reason: ${analysis.reason}`);
          entropyDispatches.push({
            pr_number: "PROACTIVE_REFACTOR", // No PR number, it's a new task
            title: `Proactive Entropy Refactor: ${path.basename(file)}`,
            instruction: `FILE TO REFACTOR: ${file}\n\n${analysis.refactoring_task}`,
            is_tech_lead_dispatch: true
          });
        } else {
          console.log(`  -> File is clean.`);
        }
      } catch (e) {
        console.error("Failed to parse Entropy Hunter response.");
      }
    }
  }

  if (entropyDispatches.length > 0) {
    // Append to the recovery queue so Omni-Recovery/Slicer can pick it up as a "new feature" request
    let existingRequests = [];
    try {
      existingRequests = JSON.parse(await fs.readFile("artifacts/recovery_requests.json", "utf8"));
    } catch(e) {}

    const updatedRequests = [...existingRequests, ...entropyDispatches];

    await fs.mkdir("artifacts", { recursive: true });
    await fs.writeFile("artifacts/recovery_requests.json", JSON.stringify(updatedRequests, null, 2));
    console.log(`\nSuccessfully dispatched ${entropyDispatches.length} proactive refactoring tasks to the agent pool.`);
  }
}

main().catch(console.error);
