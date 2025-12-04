#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const [key, val] = arg.replace(/^--/, "").split("=");
      if (val !== undefined) {
        args[key] = val;
      } else {
        args[key] = argv[i + 1];
        i++;
      }
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readTemplate(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    console.warn(`⚠️ Template not found: ${relPath}, skipping.`);
    return null;
  }
  return fs.readFileSync(full, "utf8");
}

function writeFileSafe(relPath, content) {
  const full = path.join(ROOT, relPath);
  ensureDir(path.dirname(full));
  if (fs.existsSync(full)) {
    console.warn(`⚠️ File already exists, not overwriting: ${relPath}`);
    return;
  }
  fs.writeFileSync(full, content, "utf8");
  console.log(`📄 Created ${relPath}`);
}

function upperCamel(svc) {
  return svc
    .split(/[-_]/g)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function renderTemplate(tpl, vars) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`{{\\s*${k}\\s*}}`, "g");
    out = out.replace(re, String(v));
  }
  // Special-case for {{ service | upperCamel }}
  out = out.replace(/{{\s*service\s*\|\s*upperCamel\s*}}/g, vars.upperCamel);
  return out;
}

function validateServiceName(name) {
  if (!name) return "Service name is required.";
  if (!/^[a-z0-9-]+$/.test(name)) {
    return "Service name must be kebab-case (lowercase letters, numbers, and dashes).";
  }
  return null;
}

function parsePort(portInput) {
  if (portInput === undefined) return 0;
  const parsed = Number(portInput);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function scaffoldService(args) {
  const name = args.name || args.service || args._[1];
  const nameError = validateServiceName(name);
  if (nameError) {
    console.error(
      `${nameError}\nUsage: companyos-cli.mjs new-service --name <service-name> [--owner <owner>] [--port <port>] [--tier <tier>] [--description <desc>]`
    );
    process.exit(1);
  }

  const owner = args.owner || "companyos-team";
  const port = parsePort(args.port);
  if (port === null) {
    console.error("Port must be a non-negative integer.");
    process.exit(1);
  }
  const tier = args.tier || "normal";
  const description =
    args.description || `${name} service for CompanyOS.`; // brief

  const jobLabel = name; // Prom job label
  const svcDir = path.join("companyos", "services", name);

  if (fs.existsSync(path.join(ROOT, svcDir))) {
    console.error(`❌ Service directory already exists: ${svcDir}`);
    process.exit(1);
  }

  console.log(`🔧 Scaffolding CompanyOS service: ${name}`);

  // 1) service.yaml manifest
  const serviceYaml = `service: ${name}
owner: ${owner}
description: >
  ${description}

runtime:
  language: node
  port: ${port}
  job_label: ${jobLabel}

deploy:
  helm_chart: charts/${name}
  canary_values_file: values-canary.yaml

slo_profile: companyos-default
environment:
  default_region: us
  tier: ${tier}
`;
  writeFileSafe(path.join(svcDir, "service.yaml"), serviceYaml);

  // 2) simple Node service skeleton
  ensureDir(path.join(svcDir, "src"));
  ensureDir(path.join(svcDir, "tests"));

  const indexTs = `import pino from "pino";
import express from "express";

const logger = pino();
const app = express();
const port = Number(process.env.PORT ?? ${port || 4000});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "${name}", time: new Date().toISOString() });
});

app.listen(port, () => {
  logger.info({ port }, "${name} listening");
});
`;

  const readme = `# ${name}

Generated via CompanyOS CLI.

## Dev

\`\`\`bash
pnpm --filter @companyos/${name} dev
\`\`\`
`;

  const testsReadme = `# Tests

This directory is reserved for ${name} tests.

Suggested quickstart:

1. Add a local test runner (e.g., Vitest or Jest) and supporting config files.
2. Start with a healthcheck test that exercises "/health" from src/index.ts.
3. Expand with integration tests for your handlers as they ship.
`;

  writeFileSafe(path.join(svcDir, "src", "index.ts"), indexTs);
  writeFileSafe(path.join(svcDir, "README.md"), readme);
  writeFileSafe(path.join(svcDir, "tests", "README.md"), testsReadme);

  // 3) SLO file from template
  const sloTpl = readTemplate(
    "observability/slo/templates/default.slo.tpl.yaml"
  );
  if (sloTpl) {
    const rendered = renderTemplate(sloTpl, {
      service: name,
      owner,
      description,
      job_label: jobLabel,
      upperCamel: upperCamel(name)
    });
    writeFileSafe(
      path.join("observability", "slo", "generated", `${name}.slo.yaml`),
      rendered
    );
  }

  // 4) Prometheus recording rules
  const recTpl = readTemplate(
    "observability/prometheus/templates/svc-recording-rules.tpl.yaml"
  );
  if (recTpl) {
    const rendered = renderTemplate(recTpl, {
      service: name,
      job_label: jobLabel,
      upperCamel: upperCamel(name)
    });
    writeFileSafe(
      path.join(
        "observability",
        "prometheus",
        "generated",
        `${name}-recording-rules.yaml`
      ),
      rendered
    );
  }

  const alertTpl = readTemplate(
    "observability/prometheus/templates/svc-alert-rules.tpl.yaml"
  );
  if (alertTpl) {
    const rendered = renderTemplate(alertTpl, {
      service: name,
      job_label: jobLabel,
      upperCamel: upperCamel(name)
    });
    writeFileSafe(
      path.join(
        "observability",
        "prometheus",
        "generated",
        `${name}-alert-rules.yaml`
      ),
      rendered
    );
  }

  // 5) CI workflow stub that uses the shared template
  const workflowName = `.github/workflows/${name}.yml`;
  const workflow = `name: ${name}

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  ${name}:
    uses: ./.github/workflows/companyos-service-template.yml
    with:
      service: ${name}
      helm_chart: charts/${name}
      job_label: ${jobLabel}
`;
  writeFileSafe(workflowName, workflow);

  // 6) ADR stub
  const adrPath = path.join(
    "companyos",
    "adr",
    `ADR-${new Date()
      .toISOString()
      .slice(0, 10)}-${name}-service-created.md`
  );
  const adr = `# ADR – Create service ${name}

## Status

Accepted

## Context

A new CompanyOS service \`${name}\` is being created using the golden path CLI.

## Decision

- Use Node/Express runtime.
- Adopt standard SLO profile \`companyos-default\`.
- Use \`${jobLabel}\` as Prometheus job label.
- Use \`charts/${name}\` Helm chart with canary support.

## Consequences

- Service participates in standard SLO/error-budget and canary gating.
- CI workflow \`${workflowName}\` is responsible for build/deploy.
`;
  writeFileSafe(adrPath, adr);

  console.log("✅ Done. Next steps:");
  console.log(`  - Add package.json/tsconfig for ${name} (or copy from companyos-api).`);
  console.log(`  - Implement real handlers in ${svcDir}/src.`);
  console.log(
    `  - Ensure Helm chart exists at charts/${name} and Prom rules are loaded.`
  );
}

function main() {
  const args = parseArgs(process.argv);
  const cmd = args._[0];

  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    console.log(`CompanyOS CLI

Usage:
  node companyos/scripts/companyos-cli.mjs new-service --name <service-name> [--owner <owner>] [--port <port>] [--tier <tier>] [--description "<desc>"]
`);
    process.exit(0);
  }

  if (cmd === "new-service") {
    scaffoldService(args);
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

main();
