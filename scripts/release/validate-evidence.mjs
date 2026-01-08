#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const options = {
  evidence: { type: "string" },
};

const { values } = parseArgs({ options, strict: false });

if (!values.evidence) {
  console.error("❌ Error: --evidence <path> is required.");
  process.exit(1);
}

const EVIDENCE_FILE = values.evidence;
console.log(`🔍 Validating Evidence File: ${EVIDENCE_FILE}`);

if (!existsSync(EVIDENCE_FILE)) {
  console.error(`❌ Evidence file not found: ${EVIDENCE_FILE}`);
  process.exit(1);
}

try {
  const evidence = JSON.parse(readFileSync(EVIDENCE_FILE, "utf8"));
  let errors = [];

  // 1. Check for bundle object
  if (!evidence.bundle) {
    errors.push('Missing required "bundle" object');
  } else {
    // 2. Validate bundle fields
    if (evidence.bundle.algorithm !== "sha256") {
      errors.push(
        `Invalid bundle.algorithm: expected "sha256", got "${evidence.bundle.algorithm}"`
      );
    }
    if (evidence.bundle.source !== "SHA256SUMS") {
      errors.push(`Invalid bundle.source: expected "SHA256SUMS", got "${evidence.bundle.source}"`);
    }
    if (!evidence.bundle.digest) {
      errors.push("Missing bundle.digest");
    } else if (!/^[a-f0-9]{64}$/.test(evidence.bundle.digest)) {
      errors.push(
        `Invalid bundle.digest format: expected 64 hex characters, got "${evidence.bundle.digest}"`
      );
    }
  }

  if (errors.length > 0) {
    console.error("❌ Evidence validation failed:");
    errors.forEach((e) => console.error(` - ${e}`));
    process.exit(1);
  } else {
    console.log("✅ Evidence validation passed (schema compliance)");
    console.log(`   Algorithm: ${evidence.bundle.algorithm}`);
    console.log(`   Source:    ${evidence.bundle.source}`);
    console.log(`   Digest:    ${evidence.bundle.digest.substring(0, 8)}...`);
  }
} catch (e) {
  console.error(`❌ Failed to parse evidence file: ${e.message}`);
  process.exit(1);
}
