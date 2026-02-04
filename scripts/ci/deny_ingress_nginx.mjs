#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ITEM_SLUG = "ingress-nginx-retirement";
const EVIDENCE_ID = "EVD-INGNGX-SEC-001";

const OVERRIDE = process.env.SUMMIT_ALLOW_INGRESS_NGINX === "1";
if (OVERRIDE) {
  console.log("Override enabled: SUMMIT_ALLOW_INGRESS_NGINX=1");
  process.exit(0);
}

const denyPatterns = [
  /ingress-nginx/i,
  /kubernetes\/ingress-nginx/i,
  /nginx\.ingress\.kubernetes\.io\//i,
];

const denyExtensions = new Set([".yml", ".yaml"]);

const excludedPrefixes = [
  ".archive/",
  ".github/",
  "backlog/",
  "docs/",
  "tests/fixtures/",
  "subsumption/",
  "evidence/",
  "scripts/ci/__fixtures__/",
];

const allowlistPath = path.join(
  "subsumption",
  ITEM_SLUG,
  "allowlist.json",
);
const allowlist = fs.existsSync(allowlistPath)
  ? JSON.parse(fs.readFileSync(allowlistPath, "utf8")).allowlist || []
  : [];
const allowlistSet = new Set(allowlist);

function isExcluded(filePath) {
  return excludedPrefixes.some((prefix) => filePath.startsWith(prefix));
}

function listTrackedFiles() {
  const output = execSync("git ls-files", {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  }).trim();
  if (!output) return [];
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

const files = listTrackedFiles().filter((filePath) => {
  if (isExcluded(filePath)) return false;
  if (allowlistSet.has(filePath)) return false;
  return denyExtensions.has(path.extname(filePath));
});

const hits = [];
for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Ignore lines that are comments (start with #)
    if (trimmed.startsWith("#")) return;

    denyPatterns.forEach((pattern) => {
      if (pattern.test(line)) {
        hits.push(`${filePath}:${index + 1}: ${trimmed}`);
      }
    });
  });
}

const outDir = path.join(
  "subsumption",
  ITEM_SLUG,
  "runs",
  "ci",
  EVIDENCE_ID,
);
fs.mkdirSync(outDir, { recursive: true });

const report = {
  claims: [{ backing: "ITEM:CLAIM-01", claim_id: "ITEM:CLAIM-01" }],
  decisions: [
    "Deny ingress-nginx references in tracked YAML manifests.",
    "Override requires SUMMIT_ALLOW_INGRESS_NGINX=1.",
  ],
  evidence_id: EVIDENCE_ID,
  generated_by: "scripts/ci/deny_ingress_nginx.mjs",
  item_slug: ITEM_SLUG,
  notes: hits.length > 0 ? ["deny_hits_detected"] : ["deny_gate_ok"],
};

const metrics = {
  evidence_id: EVIDENCE_ID,
  item_slug: ITEM_SLUG,
  metrics: {
    files_scanned: files.length,
    hit_count: hits.length,
  },
};

const stamp = {
  evidence_id: EVIDENCE_ID,
  item_slug: ITEM_SLUG,
  tool_versions: { node: process.version },
  timestamp: new Date().toISOString(),
};

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "stamp.json"), JSON.stringify(stamp, null, 2) + "\n");

if (hits.length > 0) {
  console.error("Denied ingress-nginx references detected:");
  hits.forEach((hit) => console.error(hit));
  process.exit(1);
}

console.log("OK: no ingress-nginx references detected.");
