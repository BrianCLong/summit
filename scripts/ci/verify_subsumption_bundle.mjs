#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function stableStringify(obj) {
  const allKeys = [];
  JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
  allKeys.sort();
  return JSON.stringify(obj, allKeys, 2) + "\n";
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, stableStringify(obj), "utf8");
}

function fail(msg, details = {}) {
  const outDir = "evidence/subsumption/ssdf-v1-2/verifier";
  writeJson(`${outDir}/report.json`, {
    evidence_id: "EVD-SSDF12-GATE-001",
    item_slug: "ssdf-v1-2",
    summary: "FAIL: verify_subsumption_bundle",
    claims: [],
    decisions: [msg],
    artifacts: []
  });
  writeJson(`${outDir}/metrics.json`, {
    evidence_id: "EVD-SSDF12-MET-002",
    metrics: { ok: 0 }
  });
  writeJson(`${outDir}/stamp.json`, {
    evidence_id: "EVD-SSDF12-GATE-001",
    generated_at: new Date().toISOString(),
    tool_versions: { node: process.version },
    git: {}
  });
  console.error(msg);
  if (Object.keys(details).length) console.error(details);
  process.exit(1);
}

function ok(summary, metrics = {}) {
  const outDir = "evidence/subsumption/ssdf-v1-2/verifier";
  writeJson(`${outDir}/report.json`, {
    evidence_id: "EVD-SSDF12-GATE-001",
    item_slug: "ssdf-v1-2",
    summary,
    claims: [],
    decisions: [],
    artifacts: [outDir]
  });
  writeJson(`${outDir}/metrics.json`, {
    evidence_id: "EVD-SSDF12-MET-002",
    metrics: { ok: 1, ...metrics }
  });
  writeJson(`${outDir}/stamp.json`, {
    evidence_id: "EVD-SSDF12-GATE-001",
    generated_at: new Date().toISOString(),
    tool_versions: { node: process.version }
  });
  process.exit(0);
}

async function loadYamlOrFail(filePath) {
  let YAML;
  try {
    YAML = await import("yaml");
  } catch {
    fail("Missing dependency: please add 'yaml' package or convert manifest to JSON.", {
      hint: "Dedicated PR: add dependency + deps_delta/ssdf-v1-2.md"
    });
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return YAML.parse(raw);
}

function assertFileExists(p, label) {
  if (!fs.existsSync(p)) fail(`Missing required ${label}: ${p}`);
}

function assertNoTimestampKeys(obj, where) {
  const badKeys = ["generated_at", "timestamp", "time", "created_at", "updated_at"];
  const s = JSON.stringify(obj);
  for (const k of badKeys) {
    if (s.includes(`"${k}"`)) {
      fail(`Non-determinism risk: '${k}' present in ${where} (report/metrics must not include timestamps).`);
    }
  }
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

(async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) fail("Usage: verify_subsumption_bundle.mjs <path-to-manifest.yaml>");

  assertFileExists(manifestPath, "manifest");
  const manifest = await loadYamlOrFail(manifestPath);

  // PR cap + lane constraints
  const prs = manifest?.prs || [];
  if (prs.length > 7) fail(`PR cap exceeded: ${prs.length} > 7`);
  const yellow = prs.filter(p => p.risk === "yellow").length;
  const red = prs.filter(p => p.risk === "red").length;
  if (yellow > 2) fail(`Too many yellow PRs: ${yellow} > 2`);
  if (red > 0) fail(`Red PRs not allowed: ${red}`);

  // Required docs exist
  const requiredDocs = manifest?.docs?.required || [];
  for (const d of requiredDocs) assertFileExists(d, "doc");

  // Evidence schemas exist
  assertFileExists("evidence/schemas/report.schema.json", "report schema");
  assertFileExists("evidence/schemas/metrics.schema.json", "metrics schema");
  assertFileExists("evidence/schemas/stamp.schema.json", "stamp schema");

  // Evidence index contains required IDs
  assertFileExists("evidence/index.json", "evidence index");
  const idx = loadJson("evidence/index.json");
  const requiredIds = manifest?.evidence?.required_ids || [];
  for (const id of requiredIds) {
    if (!idx.entries || !idx.entries[id]) fail(`Evidence index missing entry for ${id}`);
  }

  // Determinism checks on bundle-level evidence (if present)
  // Check index for path to artifacts for required IDs
  for (const id of requiredIds) {
      if (idx.entries[id]) {
          const reportPath = idx.entries[id].report;
          const metricsPath = idx.entries[id].metrics;

          if (reportPath && fs.existsSync(reportPath)) {
              assertNoTimestampKeys(loadJson(reportPath), reportPath);
          }
           if (metricsPath && fs.existsSync(metricsPath)) {
              assertNoTimestampKeys(loadJson(metricsPath), metricsPath);
          }
      }
  }

  ok("PASS: verify_subsumption_bundle", { pr_count: prs.length, required_docs: requiredDocs.length });
})().catch(err => fail("Unhandled error in verifier", { err: String(err) }));
