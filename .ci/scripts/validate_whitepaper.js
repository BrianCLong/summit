#!/usr/bin/env node
/**
 * GA gate validator for the Summit architecture whitepaper.
 *
 * Fails if:
 *  - The document is missing.
 *  - Required sections are missing.
 *  - Any section has empty or placeholder content.
 */

const fs = require("fs");
const path = require("path");

const WHITEPAPER_PATH = path.join(process.cwd(), "docs", "whitepaper", "summit-architecture.md");

const REQUIRED_SECTIONS = [
  "Executive Summary",
  "System Overview",
  "Governance by Design",
  "Security & Supply Chain Integrity",
  "Multi-Tenant Isolation & Safety",
  "LLM Governance & Cost Control",
  "Observability & Reliability",
  "Auditability & Evidence",
  "Operational Control Plane",
  "Threat Model & Limits",
  "Future Roadmap (Non-Speculative)",
];

const PLACEHOLDER_PATTERNS = [/TBD/i, /TODO/i, /lorem ipsum/i, /coming soon/i, /placeholder/i];

function fail(message) {
  console.error(`GA whitepaper validation failed: ${message}`);
  process.exit(1);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSectionContent(markdown, heading) {
  const headingPattern = new RegExp(`^#{1,6}\\s*${escapeRegExp(heading)}\\s*$`, "im");
  const match = markdown.match(headingPattern);
  if (!match || match.index === undefined) {
    return null;
  }

  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const nextHeadingIndex = rest.search(/^#{1,6}\s+/m);
  const sectionText = nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex);
  return sectionText.trim();
}

function main() {
  if (!fs.existsSync(WHITEPAPER_PATH)) {
    fail(`whitepaper missing at ${WHITEPAPER_PATH}`);
  }

  const content = fs.readFileSync(WHITEPAPER_PATH, "utf8");
  if (!content.trim()) {
    fail("whitepaper is empty");
  }

  if (content.trim().length < 500) {
    fail("whitepaper content too short to satisfy GA evidence requirements");
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) {
      fail(`whitepaper contains placeholder text matching ${pattern}`);
    }
  }

  const missing = [];
  const emptySections = [];

  for (const section of REQUIRED_SECTIONS) {
    const sectionContent = getSectionContent(content, section);
    if (sectionContent === null) {
      missing.push(section);
      continue;
    }

    if (sectionContent.length < 80) {
      emptySections.push(section);
      continue;
    }

    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(sectionContent)) {
        emptySections.push(section);
        break;
      }
    }
  }

  if (missing.length) {
    fail(`missing required sections: ${missing.join(", ")}`);
  }

  if (emptySections.length) {
    fail(`sections lack substantive content: ${emptySections.join(", ")}`);
  }

  console.log("GA whitepaper validation passed");
}

main();
