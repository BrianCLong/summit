#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { appendAuditEvent } = require("../agents/audit/logStub");

const rootDir = path.join(__dirname, "..");
const agentsDir = path.join(rootDir, "agents");
const budgetDir = path.join(agentsDir, "budgets");
const schemaPath = path.join(rootDir, "schemas", "agent-budget-manifest.schema.json");

function loadSchema() {
  const schemaRaw = fs.readFileSync(schemaPath, "utf8");
  return JSON.parse(schemaRaw);
}

function listAgents() {
  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== "budgets" && entry.name !== "audit")
    .map((entry) => entry.name)
    .sort();
}

function validateNumber(value, allowZero) {
  if (Number.isInteger(value)) {
    return allowZero ? value >= 0 : value > 0;
  }
  return false;
}

function validateManifest(manifest, agentName, schema) {
  const errors = [];
  const expectedSchema = schema.properties.$schema.const;
  if (manifest.$schema !== expectedSchema) {
    errors.push(`$schema must equal ${expectedSchema}`);
  }
  if (manifest.agentId !== agentName) {
    errors.push(`agentId must match directory name (${agentName})`);
  }
  if (!manifest.schemaVersion || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.schemaVersion)) {
    errors.push("schemaVersion must be a YYYY-MM-DD string");
  }
  if (!manifest.owner || typeof manifest.owner !== "string") {
    errors.push("owner must be a non-empty string");
  }
  if (!manifest.description || typeof manifest.description !== "string") {
    errors.push("description must be a non-empty string");
  }

  const limits = manifest.deterministicLimits || {};
  const requiredLimits = [
    ["maxTokens", true],
    ["maxCallsPerRun", false],
    ["maxWallClockMs", false],
    ["maxConcurrentRuns", false],
    ["maxDailyRuns", false],
    ["maxNetworkKB", true],
  ];
  requiredLimits.forEach(([key, allowZero]) => {
    if (!validateNumber(limits[key], allowZero)) {
      errors.push(`deterministicLimits.${key} must be an integer ${allowZero ? ">= 0" : "> 0"}`);
    }
  });

  const risk = manifest.risk || {};
  const riskFields = ["inherent", "controlBaseline", "residual", "riskCeiling"];
  riskFields.forEach((key) => {
    if (!validateNumber(risk[key], true) || risk[key] > 10) {
      errors.push(`risk.${key} must be an integer between 0 and 10`);
    }
  });

  const riskTierAllowed = ["low", "medium", "high", "critical"];
  if (!riskTierAllowed.includes(risk.riskTier)) {
    errors.push(`risk.riskTier must be one of ${riskTierAllowed.join(", ")}`);
  }

  if (
    typeof risk.residual === "number" &&
    typeof risk.riskCeiling === "number" &&
    risk.residual > risk.riskCeiling
  ) {
    errors.push("risk.residual must not exceed risk.riskCeiling");
  }

  const telemetry = manifest.telemetry || {};
  if (!telemetry.auditLogPath || typeof telemetry.auditLogPath !== "string") {
    errors.push("telemetry.auditLogPath must be a non-empty string");
  }
  if (telemetry.emitBudgetEvents !== undefined && typeof telemetry.emitBudgetEvents !== "boolean") {
    errors.push("telemetry.emitBudgetEvents must be boolean when provided");
  }
  if (
    telemetry.sampleRate !== undefined &&
    (typeof telemetry.sampleRate !== "number" ||
      telemetry.sampleRate < 0 ||
      telemetry.sampleRate > 1)
  ) {
    errors.push("telemetry.sampleRate must be a number between 0 and 1 when provided");
  }

  if ("billing" in manifest) {
    errors.push(
      "billing is not allowed; budgets must be deterministic and not reference external billing"
    );
  }

  return errors;
}

function main() {
  if (!fs.existsSync(budgetDir)) {
    console.error("Budget manifest directory is missing: agents/budgets");
    appendAuditEvent({
      event: "agent-budget-validation",
      status: "failed",
      reason: "missing-budget-directory",
    });
    process.exit(1);
  }

  const schema = loadSchema();
  const agents = listAgents();
  const failures = [];

  agents.forEach((agentName) => {
    const manifestPath = path.join(budgetDir, `${agentName}.budget.json`);
    if (!fs.existsSync(manifestPath)) {
      failures.push(`Missing budget manifest for agent ${agentName}`);
      return;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const errors = validateManifest(manifest, agentName, schema);
      if (errors.length) {
        failures.push(`${agentName}: ${errors.join("; ")}`);
      }
    } catch (err) {
      failures.push(`${agentName}: invalid JSON (${err.message})`);
    }
  });

  if (failures.length) {
    failures.forEach((msg) => console.error(`❌ ${msg}`));
    appendAuditEvent({
      event: "agent-budget-validation",
      status: "failed",
      failures,
    });
    process.exit(1);
  }

  console.log("✅ Agent budget manifests are present and valid.");
  appendAuditEvent({
    event: "agent-budget-validation",
    status: "passed",
    agents,
  });
}

main();
