#!/usr/bin/env node
import fs from "node:fs";
import { execSync } from "node:child_process";

const sha = execSync("git rev-parse HEAD").toString().trim();
const outDir = `artifacts/ga-cloud-readiness/${sha}`;
fs.mkdirSync(outDir, { recursive: true });

// 1) Deployment status (stub hooks)
const deployments = [
  { env: "dev", version: process.env.DEV_VERSION || "unknown", healthy: true },
  { env: "stage", version: process.env.STAGE_VERSION || "unknown", healthy: true },
  { env: "prod", version: process.env.PROD_VERSION || "unknown", healthy: false },
];

// 2) IaC drift/diff (replace with `terraform plan -detailed-exitcode` or `pulumi preview`)
const iac = { drift: { dev: 0, stage: 0, prod: 3 }, blockers: ["prod_security_group_diff"] };

// 3) Env parity checks (config deltas between envs)
const parity = { dev_vs_stage: 0, stage_vs_prod: 2, keys_mismatched: ["REDIS_TTL", "RUNTIME_FLAGS"] };

// 4) Reliability SLO deltas (feed from your SLO exporter)
const slo = { apdex: { prod: 0.94, target: 0.95 }, error_rate: { prod: 0.021, budget: 0.01 } };

// Threshold policy (tune to your baseline)
const policy = {
  maxIaCDriftProd: 0,
  maxParityStageProd: 0,
  minApdex: 0.95,
  maxErrorRate: 0.01
};

const breaches = [];
if (iac.drift.prod > policy.maxIaCDriftProd) breaches.push("IaC drift in prod");
if (parity.stage_vs_prod > policy.maxParityStageProd) breaches.push("Stage≠Prod parity");
if (slo.apdex.prod < policy.minApdex) breaches.push("Apdex below target");
if (slo.error_rate.prod > policy.maxErrorRate) breaches.push("Error rate above budget");

const tracker = { sha, timestamp: new Date().toISOString(), deployments, iac, parity, slo, policy, breaches };
fs.writeFileSync(`${outDir}/tracker.json`, JSON.stringify(tracker, null, 2));

// Deterministic Markdown report (stable key order)
const report = [
  `# GA Cloud Readiness — ${sha}`,
  "",
  `**Breaches:** ${breaches.length ? breaches.join(", ") : "None"}`,
  "",
  "## Deployments",
  ...deployments.map(d => `- ${d.env}: ${d.version} (${d.healthy ? "healthy" : "unhealthy"})`),
  "",
  "## IaC Drift",
  `- dev:${iac.drift.dev} stage:${iac.drift.stage} prod:${iac.drift.prod}`,
  `- blockers: ${iac.blockers.join(", ") || "none"}`,
  "",
  "## Env Parity",
  `- dev↔stage: ${parity.dev_vs_stage}  stage↔prod: ${parity.stage_vs_prod}`,
  `- keys mismatched: ${parity.keys_mismatched.join(", ") || "none"}`,
  "",
  "## SLO Deltas",
  `- Apdex prod: ${slo.apdex.prod} (target ${slo.apdex.target})`,
  `- Error rate prod: ${slo.error_rate.prod} (budget ${slo.error_rate.budget})`,
  ""
].join("\n");
fs.writeFileSync(`${outDir}/report.md`, report);

// Exit code: non‑zero when breaches present (for required status)
if (breaches.length) process.exitCode = 2;
