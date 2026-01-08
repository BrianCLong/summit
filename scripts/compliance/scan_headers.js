#!/usr/bin/env node

/**
 * scripts/compliance/scan_headers.js
 *
 * Scans source files for copyright/license headers.
 *
 * Usage: node scripts/compliance/scan_headers.js [dir]
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.argv[2] || ".";
const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  "target",
  "vendor",
  "tmp",
  "logs",
  "generated",
  "artifacts",
  "out",
  "test-results",
  "playwright-report",
  "venv",
  ".venv",
];
const EXTENSIONS = [".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java"];

// Simple heuristic for header detection
const HEADER_PATTERNS = [
  /Copyright/i,
  /License/i,
  /SPDX-License-Identifier/i,
  /IntelGraph/i, // Project name in header
];

function scanDir(dir) {
  let files = fs.readdirSync(dir);
  let missingHeaderCount = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        missingHeaderCount += scanDir(fullPath);
      }
    } else {
      const ext = path.extname(file);
      if (EXTENSIONS.includes(ext)) {
        if (!checkHeader(fullPath)) {
          console.log(`Missing header: ${fullPath}`);
          missingHeaderCount++;
        }
      }
    }
  }
  return missingHeaderCount;
}

function checkHeader(filepath) {
  try {
    const content = fs.readFileSync(filepath, "utf8");
    // Check first 10 lines (approx 1000 chars)
    const headerBlock = content.substring(0, 1000);

    // Skip empty files
    if (content.trim().length === 0) return true;

    return HEADER_PATTERNS.some((pattern) => pattern.test(headerBlock));
  } catch (err) {
    console.warn(`Could not read ${filepath}: ${err.message}`);
    return false;
  }
}

console.log(`Scanning for license headers in ${path.resolve(ROOT_DIR)}...`);
const missing = scanDir(ROOT_DIR);

if (missing > 0) {
  console.log(`\nFound ${missing} files missing headers.`);
  // Don't exit with error yet, just report. The user can enforce strictness later.
  process.exit(0);
} else {
  console.log("All checked files have headers.");
  process.exit(0);
}
