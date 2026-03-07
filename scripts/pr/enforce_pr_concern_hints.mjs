#!/usr/bin/env node

import fs from "node:fs/promises";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const strict = String(process.env.CONCERN_STRICT || "true") === "true";
const requireDeclaration =
  String(process.env.CONCERN_REQUIRE_DECLARATION || "true") === "true";
const warnOnDuplicateOpen =
  String(process.env.CONCERN_WARN_ON_DUPLICATE_OPEN || "true") === "true";

if (!token) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(1);
}
if (!repoEnv || !repoEnv.includes("/")) {
  console.error("Missing or invalid REPO");
  process.exit(1);
}

const [owner, repo] = repoEnv.split("/");

async function gh(pathname) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "summit-pr-concern-enforcer",
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

function parseConcern(body = "") {
  const m = body.match(/^\s*\/concern\s+([a-z0-9][a-z0-9-]*)\s*$/im);
  return m ? m[1].trim() : null;
}

function parseSupersedes(body = "") {
  const none = body.match(/^\s*\/supersedes\s+none\s*$/im);
  if (none) return [];
  const m = body.match(/^\s*\/supersedes\s+(.+)\s*$/im);
  if (!m) return null;
  return [...m[1].matchAll(/#(\d+)/g)].map(x => Number(x[1]));
}

function labels(issue) {
  return (issue.labels || []).map(l => l.name);
}

function has(ls, name) {
  return ls.includes(name);
}

function summarize(violations, warnings) {
  const lines = [];
  lines.push("# PR Concern Hint Enforcement");
  lines.push("");

  if (!violations.length && !warnings.length) {
    lines.push("No concern-hint violations detected.");
    return lines.join("\n");
  }

  if (violations.length) {
    lines.push("## Violations");
    lines.push("");
    for (const v of violations) {
      lines.push(`- PR #${v.pr}: ${v.message}`);
    }
    lines.push("");
  }

  if (warnings.length) {
    lines.push("## Warnings");
    lines.push("");
    for (const w of warnings) {
      lines.push(`- PR #${w.pr}: ${w.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const pulls = await paginate(`/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc`);
  const issues = await Promise.all(
    pulls.map(pr => gh(`/repos/${owner}/${repo}/issues/${pr.number}`))
  );

  const byPr = new Map();
  for (const issue of issues) byPr.set(issue.number, issue);

  const concernMap = new Map();
  const violations = [];
  const warnings = [];

  for (const pr of pulls) {
    const concern = parseConcern(pr.body || "");
    const supersedes = parseSupersedes(pr.body || "");
    const ls = labels(byPr.get(pr.number));

    if (requireDeclaration && !concern) {
      violations.push({
        pr: pr.number,
        message: "missing required `/concern <key>` declaration",
      });
      continue;
    }

    if (concern) {
      const arr = concernMap.get(concern) || [];
      arr.push({
        number: pr.number,
        labels: ls,
        title: pr.title,
        supersedes,
      });
      concernMap.set(concern, arr);
    }

    if (supersedes === null) {
      warnings.push({
        pr: pr.number,
        message: "missing `/supersedes ...` declaration",
      });
    }
  }

  const summary = summarize(violations, warnings);
  await fs.mkdir("artifacts", { recursive: true });
  await fs.writeFile("artifacts/pr-concern-hints-summary.md", `${summary}\n`);

  console.log(summary);

  if (violations.length && strict) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
