#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const val = argv[i + 1];
    if (!key || !val) break;
    if (!key.startsWith("--")) continue;
    args[key.slice(2)] = val;
  }
  return args;
}

function requireFile(filePath, friendlyName) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing required ${friendlyName} at ${filePath}`);
    process.exit(2);
  }
}

const args = parseArgs(process.argv);

if (!args.sbom || !args.trivy || !args.out) {
  console.error(
    "Usage: generate-disclosure-pack.js --sbom <path> --trivy <path> --out <path> --product <name> --environment <env> --tenant <id> --build-id <sha>"
  );
  process.exit(2);
}

const now = new Date().toISOString();
const sbomPath = args.sbom;
const trivyPath = args.trivy;

requireFile(sbomPath, "SBOM");
requireFile(trivyPath, "Trivy report");

const product = args.product || "companyos-api";
const environment = args.environment || "dev";
const tenantId = args.tenant || "global";
const buildId = args["build-id"] || process.env.GITHUB_SHA || "unknown";

const sbomUri = `file://${path.resolve(sbomPath)}`;

let trivy;
try {
  const trivyRaw = fs.readFileSync(trivyPath, "utf8");
  trivy = JSON.parse(trivyRaw);
} catch (error) {
  console.error(`Failed to read or parse Trivy report: ${error.message}`);
  process.exit(2);
}

let critical = 0;
let high = 0;
let medium = 0;
let low = 0;

const results = trivy.Results ?? [];
for (const result of results) {
  const vulns = result.Vulnerabilities ?? [];
  for (const vuln of vulns) {
    switch (vuln.Severity) {
      case "CRITICAL":
        critical++;
        break;
      case "HIGH":
        high++;
        break;
      case "MEDIUM":
        medium++;
        break;
      case "LOW":
        low++;
        break;
      default:
        break;
    }
  }
}

const sloSummary = {
  period: "rolling_30d",
  availability_target: 0.99,
  availability_actual: null,
  latency_target_ms_p95: null,
  latency_actual_ms_p95: null
};

const disclosurePack = {
  id: `disclosure-${buildId}`,
  generated_at: now,
  generated_by: process.env.GITHUB_ACTOR || "ci",
  tenant_id: tenantId,
  product,
  environment,
  builds: [
    {
      build_id: buildId,
      sbom_uri: sbomUri,
      signed: true,
      vuln_summary: {
        critical,
        high,
        medium,
        low
      }
    }
  ],
  slo_summary: sloSummary
};

fs.writeFileSync(args.out, JSON.stringify(disclosurePack, null, 2), "utf8");
console.log(`✅ Wrote disclosure pack to ${args.out}`);
