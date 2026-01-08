#!/usr/bin/env node
"use strict";

const fetch = global.fetch;

function fail(message) {
  console.error(`::error::${message}`);
}

const tierOrder = ["agent:tier-1", "agent:tier-2", "agent:tier-3"];
const requiredLabelPrefixes = [
  {
    prefix: "area:",
    message: "Add at least one area:* label to describe the primary surface.",
  },
];

const pathTiers = [
  {
    tier: "agent:tier-3",
    reason: "Governance automation, workflows, or policy changes",
    patterns: [
      /^\.github\/workflows\//i,
      /^\.github\/policies\//i,
      /^policy\//i,
      /^docs\/governance\//i,
    ],
  },
  {
    tier: "agent:tier-2",
    reason: "Infrastructure or runtime-impacting changes",
    patterns: [
      /^infra\//i,
      /^k8s\//i,
      /^helm\//i,
      /^terraform\//i,
      /^ops\//i,
      /^services\//i,
      /^packages\//i,
      /^server\//i,
      /^client\//i,
      /^sdk\//i,
    ],
  },
];

function tierRank(label) {
  return tierOrder.indexOf(label);
}

async function fetchJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "governance-check",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API request failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

async function listChangedFiles(repo, prNumber, token) {
  const files = [];
  let page = 1;
  while (true) {
    const data = await fetchJson(
      `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
      token
    );
    files.push(...data.map((f) => f.filename));
    if (data.length < 100) break;
    page += 1;
  }
  return files;
}

function requiredTierForPath(filePath) {
  for (const entry of pathTiers) {
    if (entry.patterns.some((pattern) => pattern.test(filePath))) {
      return { tier: entry.tier, reason: entry.reason };
    }
  }
  return { tier: "agent:tier-1", reason: "General changes" };
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;

  if (!repo || !token || !prNumber) {
    throw new Error("Missing GITHUB_REPOSITORY, GITHUB_TOKEN, or PR_NUMBER environment variables.");
  }

  const pr = await fetchJson(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, token);
  const labelNames = pr.labels.map((label) => label.name);

  const errors = [];

  for (const requirement of requiredLabelPrefixes) {
    if (!labelNames.some((name) => name.startsWith(requirement.prefix))) {
      errors.push(requirement.message);
    }
  }

  const tierLabels = labelNames.filter((name) => name.startsWith("agent:tier-"));
  if (tierLabels.length === 0) {
    errors.push(
      "Missing agent tier label. Add exactly one of: agent:tier-1, agent:tier-2, agent:tier-3."
    );
  } else if (tierLabels.length > 1) {
    errors.push(`Conflicting agent tier labels detected: ${tierLabels.join(", ")}`);
  }

  const selectedTier = tierLabels[0];
  const selectedRank = tierRank(selectedTier);
  const files = await listChangedFiles(repo, prNumber, token);
  const escalations = new Map();

  for (const file of files) {
    const { tier, reason } = requiredTierForPath(file);
    if (tierRank(tier) > (selectedRank ?? -1)) {
      if (!escalations.has(tier)) {
        escalations.set(tier, new Set());
      }
      escalations.get(tier).add(`${file} (${reason})`);
    }
  }

  if (escalations.size) {
    const lines = [];
    for (const [tier, paths] of escalations.entries()) {
      lines.push(`${tier} required for: ${Array.from(paths).join(", ")}`);
    }
    errors.push(`Agent tier label is below required level. ${lines.join(" | ")}`);
  }

  if (errors.length) {
    errors.forEach((message) => fail(message));
    console.log("Governance validation failed. Resolve errors above to continue.");
    process.exit(1);
  }

  console.log("Governance validation passed. All required labels and tier restrictions satisfied.");
}

main().catch((error) => {
  fail(error.message);
  process.exit(1);
});
