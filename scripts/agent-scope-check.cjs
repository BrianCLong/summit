#!/usr/bin/env node
const { execSync } = require("child_process");

// Zones definition matching AGENTS.md
const ZONES = {
  server: /^server\//,
  webapp: /^apps\/web\//,
  client: /^client\//,
  docs: /^docs\//,
  packages: /^packages\//,
  infra: /^(infra|k8s|helm|terraform)\//,
  scripts: /^scripts\//,
  root: /^[^\/]+$/, // Files in root
};

function getChangedFiles() {
  try {
    const output = execSync("git diff --name-only origin/main...HEAD", { encoding: "utf-8" });
    return output.split("\n").filter(Boolean);
  } catch (error) {
    // If not in a git repo or no upstream, try staged files
    try {
      const output = execSync("git diff --name-only --cached", { encoding: "utf-8" });
      return output.split("\n").filter(Boolean);
    } catch (e) {
      console.warn("⚠️ Could not determine changed files.");
      return [];
    }
  }
}

function analyzeScope() {
  const files = getChangedFiles();
  if (files.length === 0) {
    console.log("ℹ️ No files changed.");
    return;
  }

  const touchedZones = new Set();

  files.forEach((file) => {
    let matched = false;
    for (const [zone, regex] of Object.entries(ZONES)) {
      if (regex.test(file)) {
        touchedZones.add(zone);
        matched = true;
        break;
      }
    }
    if (!matched) touchedZones.add("other");
  });

  const zones = Array.from(touchedZones);
  console.log(`🔍 Agent Scope Analysis: Touched Zones -> [${zones.join(", ")}]`);

  // Simple heuristic for "Safe Agent Scope"
  // Agents should ideally touch 1 zone, or (Zone + Shared/Docs/Scripts)
  // Touching Server + Client simultaneously is a warning

  const primaryZones = ["server", "webapp", "client", "infra"];
  const touchedPrimary = zones.filter((z) => primaryZones.includes(z));

  if (touchedPrimary.length > 1) {
    console.warn(
      "⚠️ WARNING: Multi-zone change detected! You are touching:",
      touchedPrimary.join(" + ")
    );
    console.warn("   Ensure this cross-boundary change is intentional and strictly coupled.");
  } else {
    console.log("✅ Scope looks focused.");
  }

  if (touchedZones.has("packages")) {
    console.log(
      "ℹ️ Note: Changes in 'packages/' may affect multiple consumers. Verify downstream impacts."
    );
  }
}

analyzeScope();
