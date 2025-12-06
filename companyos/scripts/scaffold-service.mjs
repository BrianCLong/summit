#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";

if (process.argv.length < 3) {
  console.error("Usage: scaffold-service.mjs <service-name> [team-owner]");
  process.exit(1);
}

const svc = process.argv[2];
const owner = process.argv[3] || "companyos-team";

const servicesRoot = path.join("companyos", "services");
const svcDir = path.join(servicesRoot, svc);

if (fs.existsSync(svcDir)) {
  console.error(`Service directory already exists: ${svcDir}`);
  process.exit(1);
}

fs.mkdirSync(svcDir, { recursive: true });

// 1) service.yaml
const serviceYaml = `service: ${svc}
owner: ${owner}
description: >
  ${svc} service for CompanyOS.

runtime:
  language: node
  port: 0
  job_label: ${svc}

deploy:
  helm_chart: charts/${svc}
  canary_values_file: values-canary.yaml

slo_profile: companyos-default
environment:
  default_region: us
  tier: normal
`;
fs.writeFileSync(path.join(svcDir, "service.yaml"), serviceYaml);

// 2) basic Node template (you can reuse the api-svc template or a smaller one)
fs.mkdirSync(path.join(svcDir, "src"));
fs.mkdirSync(path.join(svcDir, "tests"));
fs.writeFileSync(
  path.join(svcDir, "src", "index.ts"),
  `console.log("${svc} starting...");\n`
);

// 3) TODO: copy shared package.json/tsconfig template (or link to existing)
console.log(`✅ Created skeleton for service ${svc} in ${svcDir}`);
console.log("Next: add package.json/tsconfig or use the golden Node template.");
