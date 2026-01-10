#!/usr/bin/env node
/**
 * scripts/ci/check_artifact_size.js
 *
 * Checks the size of a directory or file against a budget.
 * Usage: node scripts/ci/check_artifact_size.js <path> <max_mb>
 */

const fs = require('fs');
const path = require('path');

const targetPath = process.argv[2];
const maxMb = parseFloat(process.argv[3] || '50');

if (!targetPath) {
  console.error('Usage: node scripts/ci/check_artifact_size.js <path> <max_mb>');
  process.exit(1);
}

function getSize(p) {
  const stats = fs.statSync(p);
  if (stats.isFile()) {
    return stats.size;
  } else if (stats.isDirectory()) {
    const files = fs.readdirSync(p);
    return files.reduce((acc, file) => acc + getSize(path.join(p, file)), 0);
  }
  return 0;
}

try {
  if (!fs.existsSync(targetPath)) {
    console.log(`Path ${targetPath} does not exist. Skipping size check.`);
    process.exit(0);
  }

  const sizeBytes = getSize(targetPath);
  const sizeMb = sizeBytes / (1024 * 1024);

  console.log(`Artifact: ${targetPath}`);
  console.log(`Size: ${sizeMb.toFixed(2)} MB`);
  console.log(`Budget: ${maxMb} MB`);

  if (sizeMb > maxMb) {
    console.warn(`::warning::Artifact ${targetPath} exceeds budget of ${maxMb} MB (Size: ${sizeMb.toFixed(2)} MB)`);
    // Warning only for now
    // process.exit(1);
  } else {
    console.log('✅ Artifact size within budget.');
  }
} catch (error) {
  console.error(`Error checking size: ${error.message}`);
  process.exit(1);
}
