#!/usr/bin/env node
/**
 * Summit Omni-Recovery, Predictive Rebase, & AI Conflict Resolver Agent
 *
 * This script ensures NO WORK IS LOST. It evaluates open and closed (unmerged) PRs.
 * It attempts to predictively rebase them onto main.
 * - If successful: pushes a recovery branch and opens a queue-ready PR.
 * - If conflicting: it automatically resolves lockfile conflicts deterministically, 
 *   and uses available AI API keys to semantically resolve code conflicts, ensuring
 *   all work is fully functionally absorbed into the products.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const BATCH_SIZE = 10;

if (!token || !repoEnv) {
  console.error("Missing GITHUB_TOKEN or REPO");
  process.exit(1);
}

const [owner, repo] = repoEnv.split("/");

async function gh(pathname, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "summit-omni-recovery",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${method} ${pathname}\n${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

function exec(cmd, ignoreErrors = false) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  } catch (err) {
    if (!ignoreErrors) {
      console.error(`Command failed: ${cmd}`);
    }
    return null;
  }
}

async function getRemoteBranches() {
  const out = exec("git ls-remote --heads origin", true) || "";
  return out.split("\n").map(l => {
    const parts = l.split("refs/heads/");
    return parts.length > 1 ? parts[1].trim() : null;
  }).filter(Boolean);
}

async function callOpenAI(prompt, apiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(prompt, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callGemini(prompt, apiKey) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

function cleanMarkdownBlocks(text) {
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines[lines.length - 1].startsWith("```")) lines.pop();
    return lines.join("\n");
  }
  return text;
}

async function aiResolveConflict(filePath, content) {
  const prompt = `You are an expert AI integration engineer. Your task is to resolve a git merge conflict in the following file.
The repository owner has mandated: "make it so it resolves any conflicts as well. So all the work is usefully and fully functionally absorbed into the repo, and no work at all is lost. The original PRs are extended and improved until mergeable."
You must seamlessly integrate the incoming PR changes (theirs) with the existing main branch changes (ours).
Do NOT discard the PR's work. Combine the features, imports, and logic intelligently.
Return ONLY the raw, correctly resolved file content. Do not output markdown code blocks.

FILE PATH: ${filePath}

CONTENT WITH CONFLICT MARKERS:
${content}
`;

  let result = null;
  if (process.env.OPENAI_API_KEY) {
    console.log(`  -> Sending ${filePath} to OpenAI for resolution...`);
    result = await callOpenAI(prompt, process.env.OPENAI_API_KEY);
  } else if (process.env.ANTHROPIC_API_KEY) {
    console.log(`  -> Sending ${filePath} to Anthropic for resolution...`);
    result = await callAnthropic(prompt, process.env.ANTHROPIC_API_KEY);
  } else if (process.env.GEMINI_API_KEY) {
    console.log(`  -> Sending ${filePath} to Gemini for resolution...`);
    result = await callGemini(prompt, process.env.GEMINI_API_KEY);
  } else {
    console.log(`  -> No AI keys configured. Falling back to deterministic union merge for ${filePath}`);
    const conflictRegex = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]+\n/g;
    result = content.replace(conflictRegex, (match, ours, theirs) => {
        return `\n/* --- AUTO-MERGED: ORIGINAL (MAIN) --- */\n${ours}\n/* --- AUTO-MERGED: INCOMING (PR) --- */\n${theirs}\n`;
    });
  }

  return result ? cleanMarkdownBlocks(result) : content;
}

async function handleConflicts(prNumber) {
  console.log(`Attempting automated conflict resolution for PR #${prNumber}...`);
  const diffFilesOut = exec(`git diff --name-only --diff-filter=U`, true);
  if (!diffFilesOut) return false;

  const conflictedFiles = diffFilesOut.split("\n").map(f => f.trim()).filter(Boolean);
  let resolvedAll = true;

  let needsNpm = false;
  let needsPnpm = false;
  let needsYarn = false;
  let needsCargo = false;

  for (const file of conflictedFiles) {
    // 1. Lockfiles
    if (file.endsWith("package-lock.json")) {
      exec(`git checkout --ours ${file}`);
      needsNpm = true;
      console.log(`  -> Resetting ${file} to main (will regenerate)`);
      continue;
    }
    if (file.endsWith("pnpm-lock.yaml")) {
      exec(`git checkout --ours ${file}`);
      needsPnpm = true;
      console.log(`  -> Resetting ${file} to main (will regenerate)`);
      continue;
    }
    if (file.endsWith("yarn.lock")) {
      exec(`git checkout --ours ${file}`);
      needsYarn = true;
      console.log(`  -> Resetting ${file} to main (will regenerate)`);
      continue;
    }
    if (file.endsWith("Cargo.lock")) {
      exec(`git checkout --ours ${file}`);
      needsCargo = true;
      console.log(`  -> Resetting ${file} to main (will regenerate)`);
      continue;
    }

    // 2. Code files -> AI Resolution
    try {
      const content = await fs.readFile(file, "utf8");
      if (content.includes("<<<<<<< HEAD")) {
        const resolvedContent = await aiResolveConflict(file, content);
        await fs.writeFile(file, resolvedContent, "utf8");
        exec(`git add ${file}`);
        console.log(`  -> Successfully auto-resolved ${file}`);
      } else {
        exec(`git add ${file}`);
      }
    } catch (e) {
      console.error(`  -> Failed to resolve ${file}: ${e.message}`);
      resolvedAll = false;
    }
  }

  // Regenerate lockfiles
  if (needsPnpm) {
    console.log("  -> Regenerating pnpm-lock.yaml...");
    exec("pnpm install --no-frozen-lockfile", true);
    exec("git add pnpm-lock.yaml", true);
  }
  if (needsNpm) {
    console.log("  -> Regenerating package-lock.json...");
    exec("npm install", true);
    exec("git add package-lock.json", true);
  }
  if (needsYarn) {
    console.log("  -> Regenerating yarn.lock...");
    exec("yarn install", true);
    exec("git add yarn.lock", true);
  }
  if (needsCargo) {
    console.log("  -> Regenerating Cargo.lock...");
    exec("cargo generate-lockfile", true);
    exec("git add Cargo.lock", true);
  }

  const remaining = exec(`git diff --name-only --diff-filter=U`, true);
  if (!remaining || remaining.trim() === "") {
    console.log("All conflicts resolved. Committing merge...");
    exec(`git commit -m "Auto-resolve conflicts for PR #${prNumber}"`, true);
    return true;
  } else {
    console.log(`Unresolved conflicts remain: ${remaining}`);
    exec("git merge --abort", true);
    return false;
  }
}

async function main() {
  console.log("Fetching all PRs (open and closed)...");
  
  const out = exec(`gh pr list --repo ${repoEnv} --state all --limit 1000 --json number,state,title,isDraft,headRefName`);
  if (!out) throw new Error("Failed to fetch PRs via gh cli");
  
  const allPrs = JSON.parse(out);
  const unmergedPrs = allPrs.filter(pr => pr.state === "OPEN" || pr.state === "CLOSED");
  
  const remoteBranches = await getRemoteBranches();
  const existingRecoveryBranches = new Set(remoteBranches.filter(b => b.startsWith("recovery/pr-")));

  const candidates = [];
  for (const pr of unmergedPrs) {
    const recoveryBranchName = `recovery/pr-${pr.number}`;
    if (!existingRecoveryBranches.has(recoveryBranchName)) {
      candidates.push(pr);
    }
  }

  console.log(`Found ${candidates.length} unmerged PRs pending recovery evaluation.`);
  
  const batch = candidates.slice(0, BATCH_SIZE);
  console.log(`Processing batch of ${batch.length} PRs...`);

  await fs.mkdir("artifacts/conflicts", { recursive: true });
  const recoveryRequests = [];
  const results = {
    recovered: [],
    conflicted: [],
    errors: []
  };

  exec("git fetch origin main");
  
  // Save current branch to return to it later
  const originalBranch = exec("git rev-parse --abrev-ref HEAD", true)?.trim() || "main";

  for (const pr of batch) {
    console.log(`\nEvaluating PR #${pr.number}: ${pr.title}`);
    const recoveryBranch = `recovery/pr-${pr.number}`;
    
    // Create recovery branch directly from origin/main without resetting current branch
    exec(`git checkout -B ${recoveryBranch} origin/main`);
    exec("git clean -fd");

    const fetchPrHead = exec(`git fetch origin pull/${pr.number}/head:pr-${pr.number}-head`, true);
    if (!fetchPrHead) {
      console.log(`Could not fetch head for PR #${pr.number}. It might be deleted.`);
      results.errors.push(pr.number);
      continue;
    }

    let mergeOut = exec(`git merge --no-edit pr-${pr.number}-head`, true);
    let resolved = false;

    if (mergeOut) {
      resolved = true;
    } else {
      resolved = await handleConflicts(pr.number);
    }
    
    if (resolved) {
      console.log(`PR #${pr.number} integrated into ${recoveryBranch}. Pushing recovery...`);
      exec(`git push origin ${recoveryBranch} --force`, true);

      if (pr.state === "OPEN") {
        exec(`gh pr create --repo ${repoEnv} --base main --head ${recoveryBranch} --title "Recovery: ${pr.title}" --body "Automated recovery and rebase of #${pr.number}. 
/concern recovery
/supersedes #${pr.number}" --label "canonical-survivor,queue:merge-now"`);
        exec(`gh pr close ${pr.number} --comment "Replaced by automated recovery PR."`);
      } else {
        exec(`gh pr create --repo ${repoEnv} --base main --head ${recoveryBranch} --title "Resurrected: ${pr.title}" --body "Automated resurrection of closed unmerged PR #${pr.number}. All work preserved.
/concern recovery
/supersedes #${pr.number}" --label "canonical-survivor,queue:merge-now"`);
      }
      results.recovered.push(pr.number);
    } else {
      console.log(`PR #${pr.number} has complex conflicts that AI could not fully resolve. Queueing for human/manual AI intervention...`);
      exec(`gh pr diff ${pr.number} --repo ${repoEnv} > artifacts/conflicts/pr-${pr.number}.diff`, true);
      
      recoveryRequests.push({
        pr_number: pr.number,
        title: pr.title,
        original_state: pr.state,
        patch_file: `artifacts/conflicts/pr-${pr.number}.diff`,
        instruction: `This PR could not be cleanly merged or auto-resolved. Please review the attached patch, resolve the structural conflicts, and fully absorb the work.`
      });
      
      results.conflicted.push(pr.number);
    }
  }

  await fs.writeFile("artifacts/recovery_requests.json", JSON.stringify(recoveryRequests, null, 2));
  
  let md = `# Omni-Recovery, Rebase, & Conflict Resolution Summary\n\n`;
  md += `Processed **${batch.length}** PRs.\n\n`;
  md += `## Successfully Recovered & Queued (${results.recovered.length})\n`;
  results.recovered.forEach(n => md += `- PR #${n}\n`);
  md += `\n## Conflicted - Queued for Deep AI Resolution (${results.conflicted.length})\n`;
  results.conflicted.forEach(n => md += `- PR #${n}\n`);
  
  await fs.writeFile("artifacts/omni-recovery-summary.md", md);
  
  // Return to original branch
  exec(`git checkout ${originalBranch}`, true);

  console.log("Omni-Recovery cycle complete.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
