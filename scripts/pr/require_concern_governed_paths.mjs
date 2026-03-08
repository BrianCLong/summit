#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const token = process.env.GITHUB_TOKEN;
const repoEnv = process.env.REPO;
const governedPathsRaw = process.env.GOVERNED_PATHS || "";

if (!token) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(1);
}
if (!repoEnv || !repoEnv.includes("/")) {
  console.error("Missing or invalid REPO");
  process.exit(1);
}

const [owner, repo] = repoEnv.split("/");

const GOVERNED_PATTERNS = governedPathsRaw
  .split("\n")
  .map(s => s.trim())
  .filter(Boolean);

async function gh(pathname, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "summit-require-concern-governed-paths",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${method} ${pathname}\n${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function paginate(pathPrefix, perPage = 100, maxPages = 10) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = await gh(
      `${pathPrefix}${pathPrefix.includes("?") ? "&" : "?"}per_page=${perPage}&page=${page}`
    );
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data);
    if (data.length < perPage) break;
  }
  return out;
}

function parseConcern(body = "") {
  const m = body.match(/^\s*\/concern\s+([a-z0-9][a-z0-9-]*)\s*$/im);
  return m ? m[1].trim() : null;
}

function escapeRegex(s) {
  return s.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(glob) {
  let rx = escapeRegex(glob);
  rx = rx.replace(/\\\*\\\*/g, "§DOUBLESTAR§");
  rx = rx.replace(/\\\*/g, "[^/]*");
  rx = rx.replace(/§DOUBLESTAR§/g, ".*");
  return new RegExp(`^${rx}$`);
}

const GOVERNED_REGEXES = GOVERNED_PATTERNS.map(p => ({
  pattern: p,
  regex: globToRegex(p),
}));

function matchingGovernedPatterns(file) {
  return GOVERNED_REGEXES
    .filter(({ regex }) => regex.test(file))
    .map(({ pattern }) => pattern);
}

function summarize(report) {
  const lines = [];
  lines.push("# Governed Path Concern Enforcement Summary");
  lines.push("");
  lines.push(`- Generated at: \`${report.generated_at}\``);
  lines.push(`- PR scanned: **#${report.pr.number}**`);
  lines.push(`- Concern declared: **${report.pr.concern || "none"}**`);
  lines.push(`- Files changed: **${report.pr.changed_files.length}**`);
  lines.push(`- Governed-path hits: **${report.governed_hits.length}**`);
  lines.push(`- Result: **${report.result.toUpperCase()}**`);
  lines.push("");

  if (report.governed_hits.length) {
    lines.push("## Governed path hits");
    lines.push("");
    lines.push("| File | Matching rule(s) |");
    lines.push("|---|---|");
    for (const hit of report.governed_hits) {
      lines.push(`| \`${hit.file}\` | ${hit.rules.join(", ")} |`);
    }
    lines.push("");
  }

  if (report.result === "fail") {
    lines.push("## Failure reason");
    lines.push("");
    lines.push("This PR changes governed paths but does not declare a `/concern` in the PR body.");
    lines.push("");
    lines.push("Add a line like:");
    lines.push("");
    lines.push("```text");
    lines.push("/concern ci-gate");
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("Missing GITHUB_EVENT_PATH");
  const event = JSON.parse(await fs.readFile(eventPath, "utf8"));
  const prNumber = event.pull_request?.number;

  if (!prNumber) {
    throw new Error("Could not determine pull request number from event context");
  }

  const pr = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  const files = await paginate(`/repos/${owner}/${repo}/pulls/${prNumber}/files`, 100, 10);

  const changedFiles = files.map(f => f.filename);
  const concern = parseConcern(pr.body || "");

  const governedHits = changedFiles
    .map(file => {
      const rules = matchingGovernedPatterns(file);
      return rules.length ? { file, rules } : null;
    })
    .filter(Boolean);

  const requiresConcern = governedHits.length > 0;
  const result = requiresConcern && !concern ? "fail" : "pass";

  const report = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    repository: `${owner}/${repo}`,
    governed_patterns: GOVERNED_PATTERNS,
    pr: {
      number: pr.number,
      title: pr.title,
      concern,
      changed_files: changedFiles,
      html_url: pr.html_url,
    },
    governed_hits: governedHits,
    requires_concern: requiresConcern,
    result,
  };

  const summary = summarize(report);

  await fs.mkdir(path.join(process.cwd(), "artifacts"), { recursive: true });
  await fs.writeFile("artifacts/governed-path-concern-report.json", `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile("artifacts/governed-path-concern-summary.md", `${summary}\n`);

  console.log(summary);

  if (result === "fail") {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
