#!/usr/bin/env node
/**
 * AI Copilot Canary Check
 *
 * Validates that all required operational artifacts exist and are properly configured:
 * - SLO configuration
 * - Alert policies
 * - Runbook documentation
 */

const fs = require("fs");
const yaml = require("js-yaml");

const requiredFiles = [
  "slo/ai-copilot.yaml",
  "ALERT_POLICIES.yaml",
  "RUNBOOKS/ai-copilot-service.md",
];

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing required file: ${filePath}`);
    process.exit(1);
  }
  console.log(`✓ Found: ${filePath}`);
}

function validateSloConfig() {
  console.log("\nValidating SLO configuration...");
  const contents = fs.readFileSync("slo/ai-copilot.yaml", "utf8");
  const docs = [];
  yaml.loadAll(contents, (doc) => {
    if (doc) {
      docs.push(doc);
    }
  });

  const hasService = docs.some((doc) => doc?.spec?.service === "ai-copilot");
  if (!hasService) {
    console.error("SLO config does not declare service: ai-copilot");
    process.exit(1);
  }

  const hasAvailability = docs.some((doc) => doc?.metadata?.name === "ai-copilot-availability");
  const hasLatency = docs.some((doc) => doc?.metadata?.name === "ai-copilot-latency");

  if (!hasAvailability) {
    console.error("Missing availability SLO");
    process.exit(1);
  }
  if (!hasLatency) {
    console.error("Missing latency SLO");
    process.exit(1);
  }

  console.log("✓ SLO configuration valid");
}

function validateAlertPolicies() {
  console.log("\nValidating alert policies...");

  if (!fs.existsSync("ALERT_POLICIES.yaml")) {
    console.log("⚠ ALERT_POLICIES.yaml not found, skipping alert validation");
    return;
  }

  const contents = fs.readFileSync("ALERT_POLICIES.yaml", "utf8");
  if (!contents.includes("service: ai-copilot")) {
    console.error("Alert policies missing ai-copilot service labels");
    process.exit(1);
  }

  console.log("✓ Alert policies contain ai-copilot service");
}

function validateRunbook() {
  console.log("\nValidating runbook...");
  const contents = fs.readFileSync("RUNBOOKS/ai-copilot-service.md", "utf8");

  const requiredSections = [
    "AI Copilot Service Runbook",
    "Ownership",
    "SLOs",
    "Alerts",
    "Triage Checklist",
    "Mitigation Steps",
    "Escalation",
  ];

  for (const section of requiredSections) {
    if (!contents.includes(section)) {
      console.error(`Runbook is missing required section: ${section}`);
      process.exit(1);
    }
  }

  console.log("✓ Runbook contains all required sections");
}

function runCanary() {
  console.log("AI Copilot Canary: Validating operational artifacts\n");
  console.log("Checking required files...");

  requiredFiles.forEach(assertFileExists);

  validateSloConfig();
  validateAlertPolicies();
  validateRunbook();

  console.log("\n✅ AI Copilot canary passed: all artifacts present and valid");
}

runCanary();
