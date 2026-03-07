#!/usr/bin/env node

import fs from "node:fs/promises";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const strict = String(process.env.FRONTIER_STRICT || "true") === "true";

if (!token) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(1);
}
if (!repoEnv || !repoEnv.includes("/")) {
  console.error("Missing or invalid REPO");
  process.exit(1);
}

const [owner, repo] = repoEnv.split("/");

const L = {
  survivor: "canonical-survivor",
  superseded: "superseded",
  pending: "supersedence:pending-close",
  review: "supersedence:review",
  dns: "do-not-supersede",
  qNow: "queue:merge-now",
  qBlocked: "queue:blocked",
};

async function gh(pathname) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "summit-frontier-enforcer",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${pathname}\n${text}`);
  }
  return res.json();
}

async function paginate(pathPrefix, maxPages = 10) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = pathPrefix.includes("?") ? "&" : "?";
    const batch = await gh(`${pathPrefix}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

function labels(issue) {
  return (issue.labels || []).map(l => l.name);
}

function has(ls, name) {
  return ls.includes(name);
}

function invalidCombos(ls) {
  const errs = [];

  if (has(ls, L.survivor) && has(ls, L.superseded)) {
    errs.push(`${L.survivor} cannot coexist with ${L.superseded}`);
  }
  if (has(ls, L.survivor) && has(ls, L.pending)) {
    errs.push(`${L.survivor} cannot coexist with ${L.pending}`);
  }
  if (has(ls, L.survivor) && has(ls, L.review)) {
    errs.push(`${L.survivor} cannot coexist with ${L.review}`);
  }
  if (has(ls, L.superseded) && has(ls, L.dns)) {
    errs.push(`${L.superseded} cannot coexist with ${L.dns}`);
  }
  if (has(ls, L.qNow) && !has(ls, L.survivor)) {
    errs.push(`${L.qNow} requires ${L.survivor}`);
  }
  if (has(ls, L.qNow) && has(ls, L.qBlocked)) {
    errs.push(`${L.qNow} cannot coexist with ${L.qBlocked}`);
  }

  return errs;
}

function summarizeViolations(violations) {
  const lines = [];
  lines.push("# PR Frontier Enforcement");
  lines.push("");

  if (!violations.length) {
    lines.push("No frontier policy violations detected.");
    return lines.join("\n");
  }

  lines.push("The following frontier policy violations were detected:");
  lines.push("");

  for (const v of violations) {
    lines.push(`- PR #${v.pr}: ${v.message}`);
  }

  lines.push("");
  lines.push("Required fixes:");
  lines.push(`- only survivor PRs may carry \`${L.survivor}\``);
  lines.push(`- only survivor PRs may carry \`${L.qNow}\``);
  lines.push(`- remove conflicting supersedence labels`);
  lines.push(`- use \`${L.review}\` or \`${L.dns}\` for exceptions`);
  return lines.join("\n");
}

async function main() {
  const pulls = await paginate(`/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc`);
  const issues = await Promise.all(
    pulls.map(pr => gh(`/repos/${owner}/${repo}/issues/${pr.number}`))
  );

  const byPr = new Map();
  for (const issue of issues) byPr.set(issue.number, issue);

  const violations = [];
  const survivors = [];

  for (const pr of pulls) {
    const issue = byPr.get(pr.number);
    const ls = labels(issue);

    if (has(ls, L.survivor)) {
      survivors.push(pr.number);
    }

    for (const err of invalidCombos(ls)) {
      violations.push({ pr: pr.number, message: err });
    }
  }

  const survivorRatio = pulls.length ? survivors.length / pulls.length : 0;
  if (survivors.length > 25 || survivorRatio > 0.25) {
    violations.push({
      pr: "repo",
      message: `too many open PRs claim ${L.survivor} (${survivors.length}/${pulls.length}); frontier policy likely not being applied correctly`,
    });
  }

  const summary = summarizeViolations(violations);
  await fs.mkdir("artifacts", { recursive: true });
  await fs.writeFile("artifacts/pr-frontier-summary.md", `${summary}\n`);

  console.log(summary);

  if (violations.length && strict) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
