#!/usr/bin/env node
import assert from "node:assert";
import process from "node:process";

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_API_URL = "https://api.github.com",
} = process.env;

assert(GITHUB_TOKEN, "GITHUB_TOKEN missing");
assert(GITHUB_REPOSITORY, "GITHUB_REPOSITORY missing");

const [owner, repo] = GITHUB_REPOSITORY.split("/");

async function gh(path) {
  const res = await fetch(`${GITHUB_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${path} failed: ${res.status}`);
  }
  return res.json();
}

const branches = ["main"];

let violations = [];

for (const branch of branches) {
  const bp = await gh(
    `/repos/${owner}/${repo}/branches/${branch}/protection`
  );

  if (!bp.enforce_admins?.enabled) {
    violations.push(`${branch}: enforce_admins disabled`);
  }

  if (!bp.required_linear_history?.enabled) {
    violations.push(`${branch}: linear history not enforced`);
  }

  if (!bp.required_pull_request_reviews?.required_approving_review_count ||
      bp.required_pull_request_reviews.required_approving_review_count < 2) {
    violations.push(`${branch}: <2 required reviewers`);
  }

  if (!bp.required_status_checks?.strict) {
    violations.push(`${branch}: strict status checks disabled`);
  }
}

if (violations.length) {
  console.error("❌ Branch protection violations:");
  violations.forEach(v => console.error(` - ${v}`));
  process.exit(1);
}

console.log("✅ Branch protection verified");
