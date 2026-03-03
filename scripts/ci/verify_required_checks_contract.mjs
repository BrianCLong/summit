#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import assert from "node:assert";
import yaml from "js-yaml";

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_API_URL = "https://api.github.com",
} = process.env;

if (!GITHUB_TOKEN) {
  console.log("⚠️ GITHUB_TOKEN missing, skipping live branch protection verification.");
}
if (!GITHUB_REPOSITORY) {
  console.log("⚠️ GITHUB_REPOSITORY missing, skipping live branch protection verification.");
}

async function fetchBranchProtectionChecks() {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) return [];
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  try {
    const res = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/branches/main/protection/required_status_checks`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 403) {
         console.warn(`⚠️ Unable to read branch protection API (${res.status}). Skipping remote check.`);
         return [];
      }
      throw new Error(`GitHub API failed: ${res.status}`);
    }
    const data = await res.json();
    return data.contexts || [];
  } catch (error) {
    console.error("Failed to fetch branch protection checks:", error);
    return [];
  }
}

export async function run() {
  const contractContent = fs.readFileSync("docs/governance/REQUIRED_CHECKS_CONTRACT.yml", "utf8");
  const contractData = yaml.load(contractContent);
  const contractChecks = contractData.required_checks || [];

  let hasErrors = false;

  const contexts = contractChecks.map(c => c.context);
  const sortedContexts = [...contexts].sort((a, b) => a.localeCompare(b));
  if (JSON.stringify(contexts) !== JSON.stringify(sortedContexts)) {
    console.error("❌ Contract entries are not sorted alphabetically by context.");
    console.error(`Found: ${JSON.stringify(contexts)}`);
    console.error(`Expected: ${JSON.stringify(sortedContexts)}`);
    hasErrors = true;
  }
  const uniqueContexts = new Set(contexts);
  if (uniqueContexts.size !== contexts.length) {
    console.error("❌ Contract contains duplicate contexts.");
    hasErrors = true;
  }

  // Parse workflows to compute expected contexts
  const expectedContexts = new Set();

  for (const check of contractChecks) {
    if (check.type !== "workflow") continue;

    const wf = check.workflow;
    if (!fs.existsSync(wf.file)) {
      console.error(`❌ Contract lists file '${wf.file}' which does not exist.`);
      hasErrors = true;
      continue;
    }

    const wfContent = fs.readFileSync(wf.file, "utf8");
    const wfData = yaml.load(wfContent);

    if (wf.triggers && wf.triggers.includes("pull_request")) {
      const hasPullRequest = wfData.on && (
        wfData.on === "pull_request" ||
        Array.isArray(wfData.on) && wfData.on.includes("pull_request") ||
        typeof wfData.on === "object" && wfData.on.pull_request !== undefined
      );

      if (!hasPullRequest) {
        console.error(`❌ Contract marks '${check.context}' as runnable on pull_request, but ${wf.file} does not have pull_request trigger.`);
        hasErrors = true;
      }
    }

    // Workflows and jobs default to their filename or job_id if 'name:' is missing.
    const expectedWfName = wf.workflow_name;
    const actualWfName = wfData.name || (wf.file.split('/').pop().replace('.yml', '').replace('.yaml', ''));

    if (!actualWfName) {
        console.error(`❌ Could not resolve workflow name in ${wf.file}`);
        hasErrors = true;
    } else if (actualWfName !== expectedWfName) {
        console.error(`❌ Workflow name mismatch in ${wf.file}. Expected: '${expectedWfName}', Found: '${actualWfName}'`);
        hasErrors = true;
    }

    const jobData = wfData.jobs && wfData.jobs[wf.job_id];
    if (!jobData) {
        console.error(`❌ Job ID '${wf.job_id}' not found in ${wf.file}`);
        hasErrors = true;
        continue;
    }

    const expectedJobName = wf.job_name;
    const actualJobName = jobData.name || wf.job_id; // Default to job_id if name is absent

    if (!actualJobName) {
        console.error(`❌ Job Name mismatch in ${wf.file}. Could not resolve job name for ${wf.job_id}`);
        hasErrors = true;
    } else if (actualJobName !== expectedJobName) {
         console.error(`❌ Job Name mismatch in ${wf.file}. Expected: '${expectedJobName}', Found: '${actualJobName}'`);
         hasErrors = true;
    }

    // Replace GitHub Actions matrix/dynamic variables with regex matcher
    // e.g. "test (${{ matrix.node-version }})" -> "test (.*?)"
    let regexStr = expectedJobName.replace(/\$\{\{\s*.*?\s*\}\}/g, '(.*?)');
    // Escape special characters except the generated .*?
    regexStr = regexStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Unescape the (.*?) we just made
    regexStr = regexStr.replace(/\\\(\\\.\\\*\\\?\\\)/g, '(.*?)');

    const expectedJobRegex = new RegExp(`^${regexStr}$`);

    const computedExpectedContext1Regex = new RegExp(`^${expectedWfName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} / ${regexStr}$`);
    const computedExpectedContext2Regex = expectedJobRegex;

    if (!computedExpectedContext1Regex.test(check.context) && !computedExpectedContext2Regex.test(check.context)) {
      console.error(`❌ Contract context '${check.context}' does not match the computed expected context pattern from ${wf.file}.`);
      hasErrors = true;
    }

    // Add valid expected contexts
    expectedContexts.add(check.context); // The contract context itself is the verified truth
  }

  // Check live branch protection
  const liveChecks = await fetchBranchProtectionChecks();
  if (liveChecks.length > 0) {
    for (const requiredCheck of liveChecks) {
      if (!uniqueContexts.has(requiredCheck) && !expectedContexts.has(requiredCheck)) {
        console.error(`❌ Branch protection requires '${requiredCheck}' which is NOT listed in REQUIRED_CHECKS_CONTRACT.yml`);
        hasErrors = true;
      }
    }
  } else {
    // Fallback to local file if API cannot be reached
    const requiredChecksContent = fs.readFileSync(".github/required-checks.yml", "utf8");
    const localData = yaml.load(requiredChecksContent);
    const branchRequiredChecks = localData.required_checks || [];
    for (const requiredCheck of branchRequiredChecks) {
      if (!uniqueContexts.has(requiredCheck)) {
        // Find if any contract context implicitly satisfies this (if required checks is an alias or old name)
        let found = false;
        for (const context of uniqueContexts) {
          if (context.includes(requiredCheck) || requiredCheck.includes(context)) {
             found = true;
             break;
          }
        }

        if (!found) {
          console.error(`❌ required-checks.yml requires '${requiredCheck}' which is NOT explicitly mapped or listed in REQUIRED_CHECKS_CONTRACT.yml`);
          hasErrors = true;
        }
      }
    }
  }

  if (hasErrors) {
    throw new Error("REQUIRED_CHECKS_CONTRACT verification failed.");
  } else {
    console.log("✅ REQUIRED_CHECKS_CONTRACT verified successfully.");
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
