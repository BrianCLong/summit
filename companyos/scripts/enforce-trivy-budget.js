#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");

function exitWithUsage() {
  console.error("Usage: enforce-trivy-budget.js <trivy-json-path>");
  process.exit(2);
}

if (process.argv.length < 3) {
  exitWithUsage();
}

const trivyReportPath = process.argv[2];

if (!fs.existsSync(trivyReportPath)) {
  console.error(`Unable to find Trivy report at ${trivyReportPath}`);
  process.exit(2);
}

let report;
try {
  const raw = fs.readFileSync(trivyReportPath, "utf8");
  report = JSON.parse(raw);
} catch (error) {
  console.error(`Failed to read or parse Trivy report: ${error.message}`);
  process.exit(2);
}

let critical = 0;
let high = 0;

const results = report.Results ?? [];
for (const result of results) {
  const vulns = result.Vulnerabilities ?? [];
  for (const vuln of vulns) {
    if (vuln.Severity === "CRITICAL") critical++;
    if (vuln.Severity === "HIGH") high++;
  }
}

console.log(`Trivy summary: CRITICAL=${critical}, HIGH=${high}`);

const CRITICAL_BUDGET = Number.parseInt(process.env.TRIVY_CRITICAL_BUDGET ?? "0", 10);
const HIGH_BUDGET = Number.parseInt(process.env.TRIVY_HIGH_BUDGET ?? "0", 10);

if (Number.isNaN(CRITICAL_BUDGET) || Number.isNaN(HIGH_BUDGET)) {
  console.error("Budget values must be numeric. Set TRIVY_CRITICAL_BUDGET/TRIVY_HIGH_BUDGET to integers.");
  process.exit(2);
}

if (critical > CRITICAL_BUDGET || high > HIGH_BUDGET) {
  console.error(
    `❌ CVE budget exceeded: CRITICAL=${critical} (max ${CRITICAL_BUDGET}), HIGH=${high} (max ${HIGH_BUDGET})`
  );
  process.exit(1);
}

console.log("✅ CVE budget within limits.");
process.exit(0);
