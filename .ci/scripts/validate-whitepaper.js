#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const pathArg = args.find((arg) => arg.startsWith("--path="));
const whitepaperPath = path.resolve(
  process.cwd(),
  pathArg ? pathArg.replace("--path=", "") : "docs/whitepaper/summit-architecture.md"
);

if (!fs.existsSync(whitepaperPath)) {
  console.error(`❌ Whitepaper not found at ${whitepaperPath}`);
  process.exit(1);
}

const content = fs.readFileSync(whitepaperPath, "utf8");
const checks = [
  {
    name: "Governance by Design section",
    patterns: [/## Governance by Design/, /required-gates/, /CODEOWNERS/],
  },
  {
    name: "Security & Supply Chain Integrity section",
    patterns: [/## Security & Supply Chain Integrity/, /SBOM/i, /Cosign|provenance/i],
  },
  {
    name: "Observability & Reliability section",
    patterns: [
      /## Observability & Reliability/,
      /SLO|SLOs|error budgets/i,
      /Prometheus|Grafana|Alertmanager/i,
    ],
  },
  {
    name: "GA validation evidence",
    patterns: [/GA Validation/i, /release candidate/i, /evidence bundle/i],
  },
  {
    name: "Threat model and limits section",
    patterns: [/## Threat Model/i, /guardrail|kill switch|residency/i],
  },
];

const failures = [];
checks.forEach((check) => {
  const missing = check.patterns.filter((pattern) => !pattern.test(content));
  if (missing.length) {
    failures.push(`${check.name}: missing patterns ${missing.map((p) => p.toString()).join(", ")}`);
  }
});

if (failures.length) {
  console.error("❌ GA whitepaper validation failed:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

const sections = content.match(/^## /gm) || [];
if (sections.length < 5) {
  console.error(`❌ Expected at least 5 second-level sections, found ${sections.length}.`);
  process.exit(1);
}

console.log("✅ GA whitepaper validation passed.");
