#!/usr/bin/env node
import fs from "fs";
import path from "path";

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

const outDir = req("EVIDENCE_OUT_DIR");
const bundlePath = req("EVIDENCE_BUNDLE_PATH");
const provenancePath = req("EVIDENCE_PROVENANCE_PATH");

// These must be provided by your pipeline deterministically (from the run metadata / attestation),
// not from local wall clock inside this script.
const runId = req("RUN_ID");
const branch = req("RUN_BRANCH");
const runEndTime = req("RUN_END_TIME");     // ISO8601
const buildTime = req("EVIDENCE_BUILD_TIME"); // ISO8601
const verified = req("EVIDENCE_VERIFIED") === "true";

// Optional: set expected=false for docs-only workflows
const expected = (process.env.EVIDENCE_EXPECTED ?? "true") === "true";

fs.mkdirSync(outDir, { recursive: true });

const summary = {
  run: { id: runId, branch, endTime: runEndTime },
  expected,
  evidence: {
    verified,
    bundlePath,
    provenancePath,
    buildTime
  }
};

fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
