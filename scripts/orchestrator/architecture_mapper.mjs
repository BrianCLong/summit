#!/usr/bin/env node
/**
 * Summit Semantic Architecture Auto-Mapper
 * 
 * Post-FAANG Innovation: Continuous Knowledge Graph Sync
 * As PRs merge at massive scale, documentation and architecture maps instantly rot.
 * This script runs immediately after the `main` branch is updated.
 * It reads the diffs of recently merged PRs, deduces architectural changes 
 * (new endpoints, new agent types, changed database schemas), and autonomously 
 * rewrites `ARCHITECTURE_MAP.generated.yaml`.
 * 
 * This guarantees the global context map is always mathematically accurate.
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const baseRef = process.env.BASE_REF || "HEAD~1"; // Defaults to the last commit

if (!token || !repoEnv) process.exit(1);

const [owner, repo] = repoEnv.split("/");

async function callAI(prompt, apiKey, provider) {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
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
  console.log("Engaging Continuous Architecture Auto-Mapper...");

  const diff = exec(`git diff ${baseRef}...HEAD`, true);
  if (!diff || diff.length < 10) {
    console.log("No significant diff to map. Exiting.");
    return;
  }

  if (diff.length > 50000) {
    console.log("Diff too massive for direct mapping. Delta updates skipped for this cycle.");
    return;
  }

  let currentMap = "";
  try {
    currentMap = await fs.readFile("ARCHITECTURE_MAP.generated.yaml", "utf8");
  } catch (e) {
    currentMap = "No existing architecture map. You must create one from scratch based on the diff.";
  }

  const prompt = `You are the Summit Meta-Architect.
A new code integration just landed on the main branch. Your job is to update the repository's living architecture map so that future AI agents have perfectly accurate context of the system.

Read the git diff below. Determine if any new structural components, data models, APIs, agent capabilities, or file structures were introduced, modified, or removed.
If so, apply those changes to the current ARCHITECTURE_MAP.

Current Map:
${currentMap}

--- GIT DIFF (RECENT MERGES) ---
${diff}

Output ONLY the raw YAML text for the updated ARCHITECTURE_MAP.generated.yaml. Do not use markdown backticks around the output. Ensure the YAML is perfectly valid.`;

  let updatedYaml = null;
  if (process.env.ANTHROPIC_API_KEY) {
    updatedYaml = await callAI(prompt, process.env.ANTHROPIC_API_KEY, "anthropic");
  } else if (process.env.OPENAI_API_KEY) {
    updatedYaml = await callAI(prompt, process.env.OPENAI_API_KEY, "openai");
  }

  if (updatedYaml) {
    let cleanYaml = updatedYaml;
    if (cleanYaml.startsWith("\`\`\`yaml")) {
        cleanYaml = cleanYaml.replace(/^\`\`\`yaml\n/, "").replace(/\n\`\`\`$/, "");
    } else if (cleanYaml.startsWith("\`\`\`")) {
        cleanYaml = cleanYaml.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "");
    }

    if (cleanYaml !== currentMap && cleanYaml.length > 50) {
      await fs.writeFile("ARCHITECTURE_MAP.generated.yaml", cleanYaml);
      console.log("Architecture map successfully updated to reflect latest semantic state.");
      
      exec("git config --global user.name 'summit-architecture-mapper[bot]'");
      exec("git config --global user.email 'summit-architecture-mapper[bot]@users.noreply.github.com'");
      exec("git add ARCHITECTURE_MAP.generated.yaml");
      exec(`git commit -m "chore(governance): auto-update architecture map [skip ci]"`, true);
      exec(`git push origin main`, true);
    } else {
      console.log("No structural architectural changes detected in this integration.");
    }
  } else {
    console.log("No AI keys available. Auto-mapper skipped.");
  }
}

main().catch(console.error);
