#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const { appendAuditEvent } = require("../agents/audit/logStub");

const DEFAULT_THRESHOLD = 8;
const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_SHA || "origin/main";
const headRef = process.env.HEAD_REF || process.env.GITHUB_SHA || "HEAD";
const threshold = Number(process.env.RISK_SCORE_THRESHOLD || DEFAULT_THRESHOLD);

function getChangedFiles(base, head) {
  const diffCommand = `git diff --name-only ${base}...${head}`;
  const output = execSync(diffCommand, { encoding: "utf8" });
  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

function scorePaths(files) {
  const categories = [
    { name: "core-server", match: /^server\/src\//, score: 3 },
    { name: "core-client", match: /^client\/src\//, score: 3 },
    { name: "infra", match: /^infra\//, score: 3 },
    { name: "workflows", match: /^\.github\/workflows\//, score: 3 },
    { name: "schemas", match: /^schemas\//, score: 2 },
    { name: "budget", match: /^agents\/budgets\//, score: 2 },
    { name: "agents", match: /^agents\//, score: 1 },
  ];

  let score = 0;
  const hits = new Set();

  files.forEach((file) => {
    categories.forEach((category) => {
      if (category.match.test(file)) {
        hits.add(category.name);
      }
    });
  });

  hits.forEach((hit) => {
    const category = categories.find((item) => item.name === hit);
    score += category.score;
  });

  return { score, hits: Array.from(hits).sort() };
}

function scoreVolume(files) {
  if (files.length > 30) return { score: 4, reason: "files>30" };
  if (files.length > 15) return { score: 2, reason: "files>15" };
  if (files.length > 8) return { score: 1, reason: "files>8" };
  return { score: 0, reason: "files<=8" };
}

function deriveTier(score) {
  if (score >= 9) return "critical";
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function main() {
  const files = getChangedFiles(baseRef, headRef);
  if (!files.length) {
    console.log("ℹ️ No changed files detected for risk evaluation.");
    appendAuditEvent({ event: "pr-risk", status: "passed", score: 0, tier: "low", files: [] });
    return;
  }

  const { score: pathScore, hits } = scorePaths(files);
  const { score: volumeScore, reason } = scoreVolume(files);
  const manifestDelta = files.some((file) => file.startsWith("agents/budgets/")) ? 2 : 0;
  const totalScore = pathScore + volumeScore + manifestDelta;
  const tier = deriveTier(totalScore);

  console.log("Risk evaluation:");
  console.log(`- Base ref: ${baseRef}`);
  console.log(`- Head ref: ${headRef}`);
  console.log(`- Changed files: ${files.length}`);
  console.log(`- Path categories: ${hits.join(", ") || "none"} (score ${pathScore})`);
  console.log(`- Volume reason: ${reason} (score ${volumeScore})`);
  if (manifestDelta) {
    console.log(`- Manifest change detected: +${manifestDelta}`);
  }
  console.log(`- Total score: ${totalScore}`);
  console.log(`- Tier: ${tier}`);

  appendAuditEvent({
    event: "pr-risk",
    status: tier === "critical" || totalScore > threshold ? "failed" : "passed",
    score: totalScore,
    tier,
    hits,
    files,
  });

  if (tier === "critical" || totalScore > threshold) {
    console.error(`PR risk is ${tier} (score ${totalScore}), exceeding threshold ${threshold}.`);
    process.exit(1);
  }
}

main();
