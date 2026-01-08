#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import YAML from "js-yaml";
import { glob } from "glob";

const defaultComposeGlobs = [
  "docker-compose.yml",
  "docker-compose.dev.yml",
  "ops/compose/docker-compose.yml",
];

function parseArgs(argv) {
  const options = {
    composeFiles: [],
    runtime: false,
    output: "human",
    maxRetries: 5,
    waitSeconds: 20,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--compose":
      case "-c":
        if (argv[i + 1]) {
          options.composeFiles.push(argv[i + 1]);
          i += 1;
        }
        break;
      case "--json":
        options.output = "json";
        break;
      case "--runtime":
        options.runtime = true;
        break;
      case "--max-retries":
        options.maxRetries = Number(argv[i + 1] || options.maxRetries);
        i += 1;
        break;
      case "--wait-seconds":
        options.waitSeconds = Number(argv[i + 1] || options.waitSeconds);
        i += 1;
        break;
      default:
        break;
    }
  }

  return options;
}

async function collectComposeFiles(userProvided) {
  const files = new Set();
  if (userProvided.length > 0) {
    userProvided.forEach((file) => files.add(path.resolve(file)));
  } else {
    for (const pattern of defaultComposeGlobs) {
      const matches = await glob(pattern, { nodir: true });
      matches.forEach((file) => files.add(path.resolve(file)));
    }
  }
  return [...files];
}

function loadCompose(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = YAML.load(raw, { json: true });
  return parsed?.services ? parsed.services : {};
}

function isFirstPartyService(service) {
  if (service.build) return true;
  if (service.image && service.image.startsWith("node")) return true;
  if (Array.isArray(service.volumes)) {
    return service.volumes.some((volume) => String(volume).includes("/workspace"));
  }
  return false;
}

function findReferencedServices(service, serviceNames) {
  const referenced = new Set();
  const pools = [];
  if (service.environment) {
    pools.push(...Object.values(service.environment));
  }
  if (service.command) {
    pools.push(
      Array.isArray(service.command) ? service.command.join(" ") : String(service.command)
    );
  }
  if (service.extra_hosts) {
    pools.push(...service.extra_hosts);
  }
  const blob = pools.filter(Boolean).join(" ");
  serviceNames.forEach((candidate) => {
    if (candidate === service?.name) return;
    const pattern = new RegExp(`\\b${candidate}(?:[:/]|$)`);
    if (pattern.test(blob)) {
      referenced.add(candidate);
    }
  });
  return referenced;
}

function detectStaticRaces(services) {
  const serviceNames = new Set(Object.keys(services));
  const findings = [];

  Object.entries(services).forEach(([name, service]) => {
    const dependsOn = new Set(Object.keys(service.depends_on || {}));
    const referenced = findReferencedServices(service, serviceNames);
    const missingDepends = [...referenced].filter((ref) => !dependsOn.has(ref));
    if (missingDepends.length > 0) {
      findings.push({
        type: "missing-depends_on",
        service: name,
        detail: `References ${missingDepends.join(", ")} without depends_on gating`,
        severity: "high",
      });
    }

    const firstParty = isFirstPartyService(service);

    if (firstParty && !service.healthcheck) {
      findings.push({
        type: "missing-healthcheck",
        service: name,
        detail: "No healthcheck configured; port may be exposed before the service is ready",
        severity: "medium",
      });
    }

    const envMissing = Object.entries(service.environment || {})
      .filter(([, value]) => value === "" || value === null || typeof value === "undefined")
      .map(([key]) => key);
    if (envMissing.length > 0) {
      findings.push({
        type: "missing-env",
        service: name,
        detail: `Environment variables missing values: ${envMissing.join(", ")}`,
        severity: "medium",
      });
    }

    if (firstParty && service.ports && !service.healthcheck) {
      findings.push({
        type: "port-without-healthcheck",
        service: name,
        detail: "Ports are exposed before readiness is verified",
        severity: "high",
      });
    }

    if (isFirstPartyService(service) && service.healthcheck) {
      const test = Array.isArray(service.healthcheck.test)
        ? service.healthcheck.test.join(" ")
        : String(service.healthcheck.test || "");
      if (!/ready/.test(test)) {
        findings.push({
          type: "readiness-probe-missing",
          service: name,
          detail: "Healthcheck does not include readiness verification (/ready)",
          severity: "medium",
        });
      }
    }
  });

  return findings;
}

function inspectService(name) {
  const output = execSync(`docker inspect ${name}`, { encoding: "utf8" });
  const parsed = JSON.parse(output);
  return parsed[0];
}

function detectRuntimeRaces(services, options) {
  const findings = [];
  const dependencies = Object.entries(services).reduce((acc, [name, service]) => {
    acc[name] = new Set(Object.keys(service.depends_on || {}));
    return acc;
  }, {});

  Object.keys(services).forEach((serviceName) => {
    let inspection;
    try {
      inspection = inspectService(serviceName);
    } catch (error) {
      findings.push({
        type: "runtime-inspection-failed",
        service: serviceName,
        detail: `Unable to inspect container: ${error.message}`,
        severity: "high",
      });
      return;
    }

    const health = inspection.State?.Health;
    if (!health) {
      findings.push({
        type: "runtime-health-missing",
        service: serviceName,
        detail: "No runtime health information available",
        severity: "medium",
      });
      return;
    }

    const unhealthyAttempts =
      health.Log?.filter((entry) => entry.Status === "unhealthy").length || 0;
    if (unhealthyAttempts > options.maxRetries) {
      findings.push({
        type: "runtime-retries-exceeded",
        service: serviceName,
        detail: `Healthcheck reported ${unhealthyAttempts} failures (limit ${options.maxRetries})`,
        severity: "high",
      });
    }

    const latestHealthy = [...(health.Log || [])]
      .reverse()
      .find((entry) => entry.Status === "healthy");
    const healthyAt = latestHealthy ? new Date(latestHealthy.End || latestHealthy.Start) : null;

    dependencies[serviceName].forEach((dependency) => {
      try {
        const dependencyInspection = inspectService(dependency);
        const dependencyHealth = dependencyInspection.State?.Health;
        const dependencyHealthyLog = [...(dependencyHealth?.Log || [])]
          .reverse()
          .find((entry) => entry.Status === "healthy");
        const dependencyHealthyAt = dependencyHealthyLog
          ? new Date(dependencyHealthyLog.End || dependencyHealthyLog.Start)
          : null;

        if (healthyAt && dependencyHealthyAt && healthyAt < dependencyHealthyAt) {
          findings.push({
            type: "readiness-before-dependency",
            service: serviceName,
            detail: `${serviceName} reported healthy before ${dependency} finished initializing`,
            severity: "high",
          });
        }
      } catch (error) {
        findings.push({
          type: "runtime-dependency-missing",
          service: serviceName,
          detail: `Unable to verify dependency ${dependency}: ${error.message}`,
          severity: "medium",
        });
      }
    });
  });

  return findings;
}

function formatFindings(findings, header) {
  if (findings.length === 0) return `${header}: none found`;
  const lines = [`${header}:`];
  findings.forEach((finding) => {
    lines.push(`- [${finding.severity}] ${finding.service}: ${finding.detail}`);
  });
  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const composeFiles = await collectComposeFiles(options.composeFiles);
  if (composeFiles.length === 0) {
    console.error("No docker compose files found.");
    process.exit(1);
  }

  const combinedServices = composeFiles.reduce((acc, file) => {
    const services = loadCompose(file);
    Object.entries(services).forEach(([name, config]) => {
      acc[name] = config;
    });
    return acc;
  }, {});

  const staticFindings = detectStaticRaces(combinedServices);
  let runtimeFindings = [];

  if (options.runtime) {
    try {
      runtimeFindings = detectRuntimeRaces(combinedServices, options);
    } catch (error) {
      runtimeFindings.push({
        type: "runtime-error",
        service: "stack",
        detail: error.message,
        severity: "high",
      });
    }
  }

  const allFindings = [...staticFindings, ...runtimeFindings];

  if (options.output === "json") {
    console.log(
      JSON.stringify(
        {
          composeFiles,
          staticFindings,
          runtimeFindings,
        },
        null,
        2
      )
    );
  } else {
    console.log(formatFindings(staticFindings, "Static startup race scan"));
    if (options.runtime) {
      console.log("\n" + formatFindings(runtimeFindings, "Runtime readiness scan"));
    }
  }

  if (allFindings.some((finding) => finding.severity === "high")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Startup race scan failed:", error);
  process.exit(1);
});
