#!/usr/bin/env node

/**
 * Intel Bundle Verifier
 * Enforces Summit Competitive Subsumption Protocol v1.0
 * Zero-dependency footprint.
 */

import fs from 'fs';
import path from 'path';

const TARGETS_DIR = 'docs/intel/targets';

function log(msg) {
  console.log(`[INTEL-VERIFIER] ${msg}`);
}

function error(msg) {
  console.error(`[INTEL-VERIFIER] ERROR: ${msg}`);
  process.exit(1);
}

function verifyTarget(targetSlug) {
  const targetDir = path.join(TARGETS_DIR, targetSlug);
  if (!fs.existsSync(targetDir)) {
    error(`Target directory does not exist: ${targetDir}`);
  }

  const requiredFiles = [
    'TARGET.yml',
    'FINDINGS.ndjson',
    'DECISIONS.yml',
    'PR_STACK.yml'
  ];

  log(`Verifying target: ${targetSlug}`);

  for (const file of requiredFiles) {
    const filePath = path.join(targetDir, file);
    if (!fs.existsSync(filePath)) {
      error(`Missing required file: ${file} in ${targetDir}`);
    }
    log(`  - Found ${file}`);
  }

  // 1. Verify FINDINGS.ndjson
  const findingsPath = path.join(targetDir, 'FINDINGS.ndjson');
  const findingsContent = fs.readFileSync(findingsPath, 'utf8');
  const findingLines = findingsContent.split('\n').filter(l => l.trim() !== '');

  const findingIds = new Set();

  if (findingLines.length === 0) {
    error(`No findings found in ${findingsPath}`);
  }

  for (const line of findingLines) {
    let finding;
    try {
      finding = JSON.parse(line);
    } catch (e) {
      error(`Invalid JSON in FINDINGS.ndjson: ${line}`);
    }

    if (!finding.id) error(`Finding missing ID: ${line}`);
    if (findingIds.has(finding.id)) error(`Duplicate finding ID: ${finding.id}`);
    findingIds.add(finding.id);

    if (!finding.claim) error(`Finding ${finding.id} missing claim`);
    if (!finding.evidence || !Array.isArray(finding.evidence)) {
      error(`Finding ${finding.id} missing evidence array`);
    }

    // Enforce counter-evidence for high confidence
    if (finding.confidence === 'high' && (!finding.counter_evidence || finding.counter_evidence === '...')) {
      error(`High-confidence finding ${finding.id} must have valid counter_evidence`);
    }

    log(`    - Verified finding: ${finding.id}`);
  }

  // 2. Verify DECISIONS.yml (Basic regex check)
  const decisionsPath = path.join(targetDir, 'DECISIONS.yml');
  const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');

  // Ensure all finding IDs mentioned in DECISIONS exist in FINDINGS.ndjson
  // Look for "id:" but NOT "adr_id:"
  const decisionIdMatches = decisionsContent.match(/(?<!adr_)id:\s*["']?([^"'\s]+)["']?/g) || [];
  for (const match of decisionIdMatches) {
    const id = match.split(':')[1].trim().replace(/["']/g, '');
    if (!findingIds.has(id)) {
      error(`Decision refers to unknown finding ID: ${id}`);
    }
  }
  log(`  - Verified decisions mapping`);

  log(`Target ${targetSlug} is COMPLIANT with Summit Protocol v1.0`);
}

const main = () => {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    verifyTarget(args[0]);
  } else {
    if (!fs.existsSync(TARGETS_DIR)) {
      log('No targets directory found. Skipping.');
      return;
    }
    const targets = fs.readdirSync(TARGETS_DIR);
    let count = 0;
    for (const target of targets) {
      const targetPath = path.join(TARGETS_DIR, target);
      if (fs.statSync(targetPath).isDirectory() && target !== 'templates') {
        verifyTarget(target);
        count++;
      }
    }
    if (count === 0) {
      log('No targets found to verify.');
    }
  }
};

main();
