#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

if (process.env.SUMMIT_DRIFT_MONITOR !== "1") {
  console.log("Drift monitor disabled. Set SUMMIT_DRIFT_MONITOR=1 to enable.");
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
];

const allowlistPath = path.join(
  "subsumption",
  "ingress-nginx-retirement",
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
    denyPatterns.forEach((pattern) => {
      if (pattern.test(line)) {
        hits.push(`${filePath}:${index + 1}: ${line.trim()}`);
      }
    });
  });
}

if (hits.length > 0) {
  console.error("Drift detected: ingress-nginx references found.");
  hits.forEach((hit) => console.error(hit));
  process.exit(1);
}

console.log("OK: no ingress-nginx drift detected.");
