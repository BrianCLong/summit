#!/usr/bin/env node
/**
 * Summit Selective Test Impact Analysis (TIA) Engine
 * 
 * FAANG-Level Selective CI Router:
 * Running full e2e or unit test suites on 10,000 PRs/day will bankrupt CI budgets
 * and take hours per batch. TIA uses an LLM (or AST mapping) to analyze the files
 * changed in a specific PR or shadow branch, and outputs a dynamic matrix of 
 * ONLY the tests that could mathematically be affected.
 * 
 * Outputs a `matrix.json` artifact that GitHub Actions can consume dynamically.
 */

import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const prNumber = process.env.PR_NUMBER; // Optional: If running on a specific PR
const baseRef = process.env.BASE_REF || "origin/main"; // For integration branches

async function callAI(prompt, apiKey, provider) {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
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
  console.log("Engaging Test Impact Analysis (TIA) Engine...");

  // Get changed files
  let changedFilesStr = "";
  if (prNumber) {
    changedFilesStr = exec(`gh pr view ${prNumber} --json files --jq '.files[].path'`);
  } else {
    // If running on a push to an integration branch
    exec(`git fetch origin main`);
    changedFilesStr = exec(`git diff --name-only ${baseRef}...HEAD`);
  }

  const changedFiles = changedFilesStr.split("\n").filter(Boolean);

  if (changedFiles.length === 0) {
    console.log("No files changed. Bypassing CI.");
    await fs.writeFile("matrix.json", JSON.stringify({ run_tests: false, suites: [] }));
    return;
  }

  // If it's just docs or purely non-code files, skip entirely
  const onlyDocs = changedFiles.every(f => f.endsWith(".md") || f.endsWith(".txt") || f.startsWith("docs/"));
  if (onlyDocs) {
    console.log("Only docs changed. Bypassing CI execution.");
    await fs.writeFile("matrix.json", JSON.stringify({ run_tests: false, suites: [] }));
    return;
  }

  // Get a list of all available test suites (heuristic/mocked list for demonstration)
  // In a real repo, you might run `find . -name "*.test.ts"` or read a config.
  const allTestFiles = exec(`find . -name "*.test.ts" -o -name "*.spec.ts"`).split("\n").filter(Boolean);

  const prompt = `You are a FAANG-Level Test Impact Analyzer (TIA).
Given the following list of changed files in this Pull Request, and the list of available test files in the repository, determine exactly which test files are affected and MUST be run.
If a core/shared library is modified, you must run all downstream tests. 
If a specific component is modified, run only its related test.

CHANGED FILES:
${changedFiles.join("\n")}

AVAILABLE TEST FILES:
${allTestFiles.slice(0, 100).join("\n")}  // Truncated for context

Respond ONLY with a valid JSON object matching this schema:
{
  "run_tests": true | false,
  "suites": ["path/to/test1.spec.ts", "path/to/test2.test.ts"]
}
If NO tests are impacted (e.g. only CI yaml files changed), return "run_tests": false.
`;

  let resultStr = null;
  if (process.env.ANTHROPIC_API_KEY) {
    resultStr = await callAI(prompt, process.env.ANTHROPIC_API_KEY, "anthropic");
  } else if (process.env.OPENAI_API_KEY) {
    resultStr = await callAI(prompt, process.env.OPENAI_API_KEY, "openai");
  }

  if (resultStr) {
    try {
      const matrix = JSON.parse(cleanJSON(resultStr));
      console.log(`TIA Computed Matrix: ${JSON.stringify(matrix)}`);
      await fs.writeFile("matrix.json", JSON.stringify(matrix));
    } catch (e) {
      console.error("Failed to parse TIA JSON. Defaulting to run all tests.");
      await fs.writeFile("matrix.json", JSON.stringify({ run_tests: true, suites: ["ALL"] }));
    }
  } else {
    console.log("No AI key available. Defaulting to full CI run.");
    await fs.writeFile("matrix.json", JSON.stringify({ run_tests: true, suites: ["ALL"] }));
  }
}

main().catch(console.error);
