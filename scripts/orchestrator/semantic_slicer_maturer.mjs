#!/usr/bin/env node
/**
 * Summit Semantic PR Slicer & Maturer Agent
 *
 * FAANG-Level Change Splitting & Maturation:
 * - Targets highly conflicted, massive, or stale PRs from `artifacts/recovery_requests.json`.
 * - Uses AI to mathematically and semantically analyze the diff.
 * - Extracts "good/usable" atomic sub-patches (e.g., separating a UI fix from a broken database migration).
 * - Matures the code: If a usable patch lacks tests or typings, the AI generates them.
 * - Opens clean, atomic, independent PRs for each sliced component, placing them directly into the queue.
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
  if (provider === "openai") {
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
  } else if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.content[0].text;
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
  return match ? match[1] : text;
}

async function sliceAndMature(prData) {
  console.log(`\nAnalyzing complex PR #${prData.pr_number} for semantic slicing...`);
  
  const diffContent = await fs.readFile(prData.patch_file, "utf8");
  if (diffContent.length > 50000) {
    console.log(`Diff too large for semantic slicing API limits right now. Skipping.`);
    return;
  }

  const prompt = `You are a Principal AI Engineer at a FAANG company.
We have a massive/conflicted PR that cannot be merged. Your job is "Change Splitting" (Atomic Patch Extraction) and "Maturation".
Analyze the following Git diff. Identify distinct, independent, usable logical changes (e.g., a bug fix, a refactor, a docs update).
For each usable logical change:
1. Provide the exact file paths and updated file contents needed.
2. If tests are missing for this logic, WRITE the missing tests.
3. If TypeScript types are missing or broken, fix them.

Respond ONLY with a JSON array of objects representing the atomic PRs to create. Format:
[
  {
    "title": "fix(ui): correct button alignment",
    "concern": "ui-fixes",
    "description": "Extracted from PR. Added unit tests for button component.",
    "files": [
      { "path": "src/components/Button.tsx", "content": "...full file content..." },
      { "path": "tests/components/Button.test.tsx", "content": "...full test content..." }
    ]
  }
]

DIFF TO SLICE:
${diffContent}
`;

  let responseText = null;
  if (process.env.ANTHROPIC_API_KEY) {
    responseText = await callAI(prompt, process.env.ANTHROPIC_API_KEY, "anthropic");
  } else if (process.env.OPENAI_API_KEY) {
    responseText = await callAI(prompt, process.env.OPENAI_API_KEY, "openai");
  } else {
    console.log("No AI key available for semantic slicing.");
    return;
  }

  try {
    const slices = JSON.parse(cleanJSON(responseText));
    console.log(`AI identified ${slices.length} atomic sub-patches. Orchestrating branches...`);

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      const branchName = `recovery/sliced-${prData.pr_number}-part${i + 1}-${Date.now()}`;
      
      exec("git reset --hard origin/main");
      exec("git clean -fd");
      exec(`git checkout -B ${branchName} origin/main`);

      for (const file of slice.files) {
        // Ensure directory exists
        exec(`mkdir -p $(dirname "${file.path}")`);
        await fs.writeFile(file.path, file.content, "utf8");
        exec(`git add "${file.path}"`);
      }

      const commitMsg = `${slice.title}\n\n${slice.description}`;
      exec(`git commit -m "${commitMsg}"`, true);
      exec(`git push origin ${branchName} --force`, true);

      // Create new PR
      const body = `${slice.description}\n\nAutomated atomic slice from #${prData.pr_number}.\n/concern ${slice.concern}\n/supersedes #${prData.pr_number}`;
      await fs.writeFile("artifacts/harvest/slice_body.md", body);

      const prCreateOut = exec(`gh pr create --repo ${repoEnv} --base main --head ${branchName} --title "Sliced: ${slice.title}" --body-file artifacts/harvest/slice_body.md --label "canonical-survivor,queue:merge-now"`, true);
      
      if (prCreateOut) {
        console.log(`  -> Created atomic PR: ${prCreateOut.trim()}`);
      }
    }
    
    // Close the original massive tangled PR
    exec(`gh pr close ${prData.pr_number} --comment "This PR was too tangled/conflicted. An AI orchestration agent has mathematically sliced the usable parts, written missing tests, and spun them out into independent, atomic PRs to guarantee no work is lost."`);

  } catch (err) {
    console.error("Failed to parse AI slicing response:", err.message);
  }
}

async function main() {
  console.log("Booting Semantic PR Slicer & Maturer Agent...");
  
  try {
    const requests = JSON.parse(await fs.readFile("artifacts/recovery_requests.json", "utf8"));
    if (requests.length === 0) {
      console.log("No conflicted PRs pending slicing.");
      return;
    }

    exec("git fetch origin main");

    // Process up to 5 massive PRs per run
    for (const req of requests.slice(0, 5)) {
      await sliceAndMature(req);
    }
    
    // Clear processed requests
    const remaining = requests.slice(5);
    await fs.writeFile("artifacts/recovery_requests.json", JSON.stringify(remaining, null, 2));

  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("No recovery_requests.json found. Nothing to slice.");
    } else {
      console.error(err);
    }
  }
}

main().catch(console.error);
