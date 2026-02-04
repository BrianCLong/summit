#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert";
import process from "node:process";
import { parse as YAML } from "yaml";

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

const manifest = YAML(
  fs.readFileSync(".github/required-checks.yml", "utf8")
);

const checks = manifest.required_checks;
assert(checks.length > 0, "No required checks defined");

async function getCheckRuns() {
  const res = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${GITHUB_SHA}/check-runs?per_page=100`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API failed: ${res.status}`);
  }
  return res.json();
}

const data = await getCheckRuns();
const present = new Set(
  (data.check_runs || []).map(c => c.name)
);

let missing = checks.filter(c => !present.has(c));

if (missing.length) {
  console.error("❌ Missing required checks:");
  missing.forEach(c => console.error(` - ${c}`));
  process.exit(1);
}

console.log("✅ All required checks present");
