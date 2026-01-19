#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function sh(args) {
  return execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
}

const out = arg("--out");
if (!out) {
  process.stderr.write("Usage: emit-provenance-metadata.mjs --out <path>\n");
  process.exit(2);
}

// Deterministic fields only: no timestamps, no random UUIDs.
const gitSha = process.env.GITHUB_SHA || sh(["git", "rev-parse", "HEAD"]);
const repo = process.env.GITHUB_REPOSITORY || sh(["git", "config", "--get", "remote.origin.url"]);

const meta = {
  schema: "summit.provenance-metadata/1.0",
  git: {
    sha: gitSha,
    repository: repo,
  },
  ci: {
    provider: process.env.GITHUB_ACTIONS ? "github-actions" : "unknown",
    run_id: process.env.GITHUB_RUN_ID || null,
    run_attempt: process.env.GITHUB_RUN_ATTEMPT || null,
    workflow: process.env.GITHUB_WORKFLOW || null,
    ref: process.env.GITHUB_REF || null,
  },
};

writeFileSync(out, JSON.stringify(meta, null, 2) + "\n", "utf8");
