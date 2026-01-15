#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { exit } from 'node:process';

const POLICY_PATH = 'docs/governance/OPS_EVIDENCE_RETENTION_POLICY.md';
const REQUIRED_SECTIONS = [
  '# Ops Evidence Retention Policy',
  '## 1. Purpose and Scope',
  '## 2. Definitions',
  '## 3. Retention Requirements',
  '## 4. Cadence',
  '## 5. Storage Locations and Naming',
  '## 6. Access Controls',
  '## 7. Integrity and Verification',
  '## 8. Deletion and Exception Process',
  '## 9. Ownership and Review'
];

console.log(`Verifying ${POLICY_PATH}...`);

if (!fs.existsSync(POLICY_PATH)) {
  console.error(`ERROR: Policy file not found at ${POLICY_PATH}`);
  exit(1);
}

const content = fs.readFileSync(POLICY_PATH, 'utf-8');
const missingSections = REQUIRED_SECTIONS.filter(section => !content.includes(section));

if (missingSections.length > 0) {
  console.error('ERROR: Missing required sections:');
  missingSections.forEach(s => console.error(`  - ${s}`));
  exit(1);
}

console.log('✅ Policy verification passed.');
