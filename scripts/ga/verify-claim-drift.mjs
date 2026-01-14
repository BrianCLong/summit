#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const LEDGER_PATH = path.resolve(REPO_ROOT, 'docs/claims/CLAIMS_REGISTRY.md');

// Paths to scan for claims usage in public copy
const SCAN_PATHS = [
  path.resolve(REPO_ROOT, 'website/src'),
  path.resolve(REPO_ROOT, 'docs'),
];

// Exemptions: These files are allowed to mention proposed claims (e.g. the ledger itself, lifecycle doc)
const EXEMPT_FILES = [
  LEDGER_PATH,
  path.resolve(REPO_ROOT, 'docs/ga/CLAIM_LIFECYCLE.md'),
  path.resolve(REPO_ROOT, 'docs/release/GA_EVIDENCE_INDEX.md'),
  path.resolve(REPO_ROOT, 'website/src/content/ga.claims.json'),
  path.resolve(REPO_ROOT, 'scripts/ga/scaffold_claim.mjs'),
  path.resolve(REPO_ROOT, 'scripts/ga/verify-claim-drift.mjs')
];

async function main() {
  console.log('🔍 Running Drift Guard for GA Claims...');

  // 1. Parse Ledger to find PROPOSED claims
  if (!fs.existsSync(LEDGER_PATH)) {
    console.error('❌ Ledger not found.');
    process.exit(1);
  }

  const ledgerContent = fs.readFileSync(LEDGER_PATH, 'utf8');
  const claims = [];

  // Regex to capture ID, Claim Text, and Status
  // Row format: | **ID** | **Claim** | ... | **Status** |
  const rowRegex = /\|\s*\*\*([A-Z]+-\d{3})\*\*\s*\|\s*\*\*(.*?)\*\*\s*\|.*?\|\s*\*\*(.*?)\*\*\s*\|/g;

  let match;
  while ((match = rowRegex.exec(ledgerContent)) !== null) {
    const [_, id, text, status] = match;
    const cleanStatus = status.replace(/\*/g, '').trim();
    if (cleanStatus === 'PROPOSED' || cleanStatus === 'EVIDENCE REQUIRED') {
      claims.push({ id, text, status: cleanStatus });
    }
  }

  console.log(`ℹ️  Found ${claims.length} PROPOSED claims to guard.`);

  if (claims.length === 0) {
    console.log('✅ No proposed claims found. Nothing to guard.');
    process.exit(0);
  }

  // 2. Scan public copy for usages of these claims
  let violations = 0;

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        scanDir(fullPath);
      } else if (entry.isFile()) {
        if (EXEMPT_FILES.includes(fullPath)) continue;
        if (!fullPath.endsWith('.md') && !fullPath.endsWith('.tsx') && !fullPath.endsWith('.ts') && !fullPath.endsWith('.json')) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        for (const claim of claims) {
          // Check for ID usage or substantial text match
          if (content.includes(claim.id)) {
            console.error(`❌ Violation: Proposed Claim ${claim.id} referenced in ${path.relative(REPO_ROOT, fullPath)}`);
            violations++;
          }
          // Simple text check (optional, can be noisy if claim text is generic)
          // match if >80% of claim text is present?
          // For now, let's stick to ID or exact text match to avoid noise
          if (content.includes(claim.text)) {
            console.error(`❌ Violation: Proposed Claim text "${claim.text.substring(0, 20)}..." found in ${path.relative(REPO_ROOT, fullPath)}`);
            violations++;
          }
        }
      }
    }
  }

  for (const scanPath of SCAN_PATHS) {
    if (fs.existsSync(scanPath)) {
        scanDir(scanPath);
    }
  }

  if (violations > 0) {
    console.error(`\n❌ Drift Guard FAILED: ${violations} violations found.`);
    console.error('Proposed claims cannot be used in public documentation until verified.');
    process.exit(1);
  } else {
    console.log('✅ Drift Guard PASSED: No leaks of proposed claims detected.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
