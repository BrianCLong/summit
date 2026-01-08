#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const AGENTS_MD = path.join(__dirname, "..", "AGENTS.md");

if (!fs.existsSync(AGENTS_MD)) {
  console.error("AGENTS.md missing!");
  process.exit(1);
}

const content = fs.readFileSync(AGENTS_MD, "utf8");

const requiredSections = [
  "## Agent Roles & Permissions",
  "### Role: Jules",
  "**Permissions**",
  "**Stop Conditions**",
  "**Escalation**",
];

const missing = requiredSections.filter((s) => !content.includes(s));

if (missing.length > 0) {
  console.error("AGENTS.md is missing required governance sections:", missing);
  process.exit(1);
}

console.log("Governance check passed: AGENTS.md complies with schema.");
