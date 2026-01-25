#!/usr/bin/env node
import fs from "fs";
import path from "path";
import crypto from "crypto";

function sha256File(p) {
  const h = crypto.createHash("sha256");
  const fd = fs.openSync(p, "r");
  try {
    const buf = Buffer.alloc(1024 * 1024);
    while (true) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      h.update(buf.subarray(0, n));
    }
  } finally {
    fs.closeSync(fd);
  }
  return h.digest("hex");
}

function parseArgs(argv) {
  const out = { subjects: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.out = argv[++i];
    else if (a === "--subjects") out.subjects.push(argv[++i]);
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!out.out) throw new Error("Missing --out");
  if (out.subjects.length === 0) throw new Error("Missing --subjects");
  return out;
}

const args = parseArgs(process.argv);

const repo = process.env.GITHUB_REPOSITORY || "";
const sha = process.env.GITHUB_SHA || "";
const ref = process.env.GITHUB_REF || "";
const workflow = process.env.GITHUB_WORKFLOW || "";
const runId = process.env.GITHUB_RUN_ID || "";

const subjects = args.subjects
  .map((p) => ({
    name: p.replace(/\\/g, "/"),
    digest: { sha256: sha256File(p) },
  }))
  .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

const predicate = {
  buildDefinition: {
    buildType: `https://github.com/${repo}/.github/workflows/ci-core-gate.yml`,
    externalParameters: {
      repository: repo,
      ref,
      workflow,
    },
    internalParameters: {
      run_id: runId, // audit value; not used for determinism guarantees
    },
    resolvedDependencies: [],
  },
  runDetails: {
    builder: { id: "https://github.com/actions/runner" },
    metadata: {},
  },
};

const statement = {
  _type: "https://in-toto.io/Statement/v1",
  subject: subjects,
  predicateType: "https://slsa.dev/provenance/v1",
  predicate,
};

fs.writeFileSync(args.out, JSON.stringify(statement, null, 2));
