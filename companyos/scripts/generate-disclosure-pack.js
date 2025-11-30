#!/usr/bin/env node
import fs from "fs";

const buildId = process.env.BUILD_ID || `build-${Date.now()}`;
const tenantId = process.env.TENANT_ID || "demo-tenant";
const product = process.env.PRODUCT || "demo-product";
const environment = process.env.ENVIRONMENT || "dev";
const sbomUri = process.env.SBOM_URI || "https://example.com/sbom.json";
const outputPath = process.env.OUTPUT_PATH || "disclosure-pack.json";
const residencyRegion = process.env.RESIDENCY_REGION || "us";

const critical = Number(process.env.VULN_CRITICAL ?? 0);
const high = Number(process.env.VULN_HIGH ?? 0);
const medium = Number(process.env.VULN_MEDIUM ?? 0);
const low = Number(process.env.VULN_LOW ?? 0);

const sloSummary = {
  period: process.env.SLO_PERIOD ?? null,
  availability_target: process.env.SLO_AVAILABILITY_TARGET
    ? Number(process.env.SLO_AVAILABILITY_TARGET)
    : null,
  availability_actual: process.env.SLO_AVAILABILITY_ACTUAL
    ? Number(process.env.SLO_AVAILABILITY_ACTUAL)
    : null,
  latency_target_ms_p95: process.env.SLO_LATENCY_TARGET_MS_P95
    ? Number(process.env.SLO_LATENCY_TARGET_MS_P95)
    : null,
  latency_actual_ms_p95: process.env.SLO_LATENCY_ACTUAL_MS_P95
    ? Number(process.env.SLO_LATENCY_ACTUAL_MS_P95)
    : null
};

const now = new Date().toISOString();

const disclosurePack = {
  id: `disclosure-${buildId}`,
  generated_at: now,
  generated_by: process.env.GITHUB_ACTOR || "ci",
  tenant_id: tenantId,
  product,
  environment,
  residency_region: residencyRegion,
  builds: [
    {
      build_id: buildId,
      sbom_uri: sbomUri,
      signed: true,
      vuln_summary: { critical, high, medium, low }
    }
  ],
  slo_summary: sloSummary
};

fs.writeFileSync(outputPath, JSON.stringify(disclosurePack, null, 2));
console.log(`disclosure pack written to ${outputPath}`);
