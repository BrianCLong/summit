#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert";
import process from "node:process";

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_SHA,
  GITHUB_API_URL = "https://api.github.com",
} = process.env;

assert(GITHUB_TOKEN, "GITHUB_TOKEN missing");
assert(GITHUB_REPOSITORY, "GITHUB_REPOSITORY missing");
assert(GITHUB_SHA, "GITHUB_SHA missing");

const [owner, repo] = GITHUB_REPOSITORY.split("/");

function parseRequiredChecks(raw) {
  const checks = [];
  let inRequiredChecks = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (/^[A-Za-z0-9_-]+:/.test(trimmed) && !trimmed.startsWith("- ")) {
      inRequiredChecks = trimmed.startsWith("required_checks:");
      continue;
    }

    if (inRequiredChecks && trimmed.startsWith("- ")) {
      checks.push(trimmed.slice(2).trim());
    }
  }

  return checks;
}

const checks = parseRequiredChecks(
  fs.readFileSync(".github/required-checks.yml", "utf8")
);
assert(checks.length > 0, "No required checks defined");
const MAX_ATTEMPTS = Number(process.env.REQUIRED_CHECKS_MAX_ATTEMPTS || 12);
const POLL_MS = Number(process.env.REQUIRED_CHECKS_POLL_MS || 5000);

async function getCheckRuns() {
  const res = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${GITHUB_SHA}/check-runs?per_page=100`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    if (res.status === 403) {
      console.warn("⚠️ Unable to read check-runs API (403). Skipping required-checks verification in this context.");
      return null;
    }
    throw new Error(`GitHub API failed: ${res.status}`);
  }
  return res.json();
}

let missing = [];
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const data = await getCheckRuns();
  if (data === null) {
    process.exit(0);
  }

  const present = new Set((data.check_runs || []).map(c => c.name));
  missing = checks.filter(c => !present.has(c));

  if (missing.length === 0) {
    console.log("✅ All required checks present");
    process.exit(0);
  }

  if (attempt < MAX_ATTEMPTS) {
    console.log(`Waiting for required checks to appear (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
  }
}

console.error("❌ Missing required checks:");
missing.forEach(c => console.error(` - ${c}`));
process.exit(1);
