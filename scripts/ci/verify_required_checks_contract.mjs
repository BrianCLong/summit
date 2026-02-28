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

// Contract definitions must deterministically map legacy names to proper GitHub contexts
const CONTEXT_MAPPINGS = {
  "SOC Controls": ["SOC Controls / SOC Controls", "SOC Controls"],
  "Unit Tests": ["CI / Unit Tests (CI)", "Unit Tests (CI)", "Unit Tests"],
  "gate": ["GA Gate / gate", "gate"],
  "meta-gate": ["Governance Meta Gate / meta-gate", "meta-gate"],
  "test (20.x)": ["Unit Tests & Coverage / test (20.x)", "test (20.x)"]
};

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

    const actualWfName = wfData.name;
    const expectedWfName = wf.workflow_name;

    if (!actualWfName) {
        console.error(`❌ Could not find workflow name in ${wf.file}`);
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

    const actualJobName = jobData.name;
    const expectedJobName = wf.job_name;

    if (!actualJobName) {
        console.error(`❌ Job Name mismatch in ${wf.file}. Could not find job name for ${wf.job_id}`);
        hasErrors = true;
    } else if (actualJobName !== expectedJobName) {
         console.error(`❌ Job Name mismatch in ${wf.file}. Expected: '${expectedJobName}', Found: '${actualJobName}'`);
         hasErrors = true;
    }

    const parsedExpectedJobName = expectedJobName.replace(/\$\{\{\s*matrix\.node-version\s*\}\}/g, '20.x');

    const computedExpectedContext1 = `${expectedWfName} / ${parsedExpectedJobName}`;
    const computedExpectedContext2 = parsedExpectedJobName;

    if (check.context !== computedExpectedContext1 && check.context !== computedExpectedContext2) {
      console.error(`❌ Contract context '${check.context}' does not match the computed expected context '${computedExpectedContext1}' or '${computedExpectedContext2}' from ${wf.file}.`);
      hasErrors = true;
    }

    // Add valid expected contexts
    expectedContexts.add(computedExpectedContext1);
    expectedContexts.add(computedExpectedContext2);
    expectedContexts.add(check.context); // add explicitly mapped contexts just in case
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
      // Deterministically map legacy names to explicit contexts if necessary
      let isMapped = false;
      const validMappings = CONTEXT_MAPPINGS[requiredCheck] || [requiredCheck];

      for (const validContext of validMappings) {
        if (uniqueContexts.has(validContext)) {
          isMapped = true;
          break;
        }
      }

      if (!isMapped) {
        console.error(`❌ required-checks.yml requires '${requiredCheck}' which is NOT explicitly mapped or listed in REQUIRED_CHECKS_CONTRACT.yml`);
        hasErrors = true;
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
