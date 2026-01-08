#!/usr/bin/env node
import fs from "fs";
import { createHash } from "crypto";
import { execSync } from "child_process";
import path from "path";

function sha256(path) {
  const buf = fs.readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

// Helper to safely get git info
function getGitInfo() {
  try {
    const commit = process.env.GITHUB_SHA || execSync("git rev-parse HEAD").toString().trim();
    const branch =
      process.env.GITHUB_REF_NAME || execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    return { commit, branch };
  } catch (e) {
    return { commit: "unknown", branch: "unknown" };
  }
}

// Parse SHA256SUMS if available
function parseSha256Sums(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      // Basic parse: hash  filename
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return null;
      const sha256 = parts[0];
      const name = parts.slice(1).join(" ").replace(/^\*?/, ""); // Remove binary marker
      return { name, sha256 };
    })
    .filter(Boolean);
}

const sha256SumsPath = process.env.SHA256SUMS_PATH || "dist/release/SHA256SUMS";
const sha256Subjects = parseSha256Sums(sha256SumsPath);

const { commit, branch } = getGitInfo();

// Prepare Subjects
let subjects = [];
let legacyArtifacts = [];

if (sha256Subjects.length > 0) {
  subjects = sha256Subjects.map((s) => ({
    name: s.name,
    digest: { sha256: s.sha256 },
  }));
  legacyArtifacts = sha256Subjects.map((s) => ({ path: s.name, sha256: s.sha256 }));
} else {
  // Fallback to old behavior for legacy compatibility if SHA256SUMS is missing
  const files = [
    "package.json",
    "pnpm-lock.yaml",
    "dist/server/index.js",
    "dist/client/assets/index.js",
  ].filter((f) => fs.existsSync(f));

  legacyArtifacts = files.map((f) => ({ path: f, sha256: sha256(f) }));
  // Also populate subjects from these for forward compatibility
  subjects = legacyArtifacts.map((a) => ({
    name: a.path,
    digest: { sha256: a.sha256 },
  }));
}

const legacyManifest = {
  schema: "intelgraph.provenance/v1",
  createdAt: new Date().toISOString(),
  git: {
    commit,
    branch,
  },
  artifacts: legacyArtifacts,
};

const provenance = {
  schemaVersion: "1.1.0",
  type: "https://in-toto.io/Statement/v1",
  subject: subjects,
  predicateType: "https://slsa.dev/provenance/v1",
  predicate: {
    buildDefinition: {
      buildType: "local-gha-release-bundle",
      externalParameters: {
        gitCommit: commit,
        gitBranch: branch,
      },
      resolvedDependencies: [
        {
          uri: "git+https://github.com/intelgraph/intelgraph",
          digest: { sha1: commit },
        },
      ],
    },
    runDetails: {
      builder: { id: "github-actions" },
      metadata: {
        invocationId: process.env.GITHUB_RUN_ID
          ? `${process.env.GITHUB_RUN_ID}/${process.env.GITHUB_RUN_ATTEMPT || 1}`
          : "local-run",
        startedOn: new Date().toISOString(),
        finishedOn: new Date().toISOString(),
      },
    },
    environment: {
      runnerOs: process.env.RUNNER_OS || "unknown",
      nodeVersion: process.version,
    },
  },
  legacy: legacyManifest,
};

process.stdout.write(JSON.stringify(provenance, null, 2));
