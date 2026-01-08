#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const MATRIX_FILE = "docs/GTM_CLAIMS_MATRIX.md";
const REPO_ROOT = process.cwd();

async function main() {
  console.log("🔍 Verifying GTM Claims against Codebase...");

  if (!fs.existsSync(MATRIX_FILE)) {
    console.error(`❌ Matrix file not found: ${MATRIX_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(MATRIX_FILE, "utf8");
  const lines = content.split("\n");
  let errors = 0;
  let verified = 0;

  for (const line of lines) {
    // Basic markdown table parsing
    if (!line.startsWith("|") || line.includes("GTM Claim") || line.includes("---")) continue;

    const parts = line
      .split("|")
      .map((p) => p.trim())
      .filter((p) => p);
    if (parts.length < 3) continue;

    const claim = parts[0];
    const proofPath = parts[2].replace(/`/g, ""); // Remove backticks

    const fullPath = path.resolve(REPO_ROOT, proofPath);

    if (fs.existsSync(fullPath)) {
      console.log(`✅ Verified: "${claim}" -> ${proofPath}`);
      verified++;
    } else {
      console.error(`❌ FAILED: "${claim}" -> Proof not found: ${proofPath}`);
      errors++;
    }
  }

  console.log("---");
  console.log(`Summary: ${verified} Verified, ${errors} Failed`);

  if (errors > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
