#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const MANDATORY_HEADERS = [
  'Owner',
  'Last-Reviewed',
  'Evidence-IDs',
  'Status',
  'ILSA-Level',
  'IBOM-Verified'
];

function verifyFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const missingHeaders = [];
  MANDATORY_HEADERS.forEach(header => {
    const regex = new RegExp(`^\\s*[\\*_]*${header}[\\*_]*\\s*:`, 'm');
    if (!regex.test(content)) {
      missingHeaders.push(header);
    }
  });
  return missingHeaders;
}

const targetDirs = ['docs/osint'];
const specificFiles = ['docs/governance/OSINT_EVIDENCE_POLICY.md'];
let hasError = false;

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

targetDirs.forEach(dir => {
  walkDir(dir, (filepath) => {
    if (!filepath.endsWith('.md')) return;
    const missing = verifyFile(filepath);
    if (missing.length > 0) {
      console.error(`❌ [OSINT-GOV] ${filepath} is missing mandatory headers: ${missing.join(', ')}`);
      hasError = true;
    } else {
      console.log(`✅ [OSINT-GOV] ${filepath} headers verified.`);
    }
  });
});

specificFiles.forEach(filepath => {
    if (!fs.existsSync(filepath)) return;
    const missing = verifyFile(filepath);
    if (missing.length > 0) {
      console.error(`❌ [OSINT-GOV] ${filepath} is missing mandatory headers: ${missing.join(', ')}`);
      hasError = true;
    } else {
      console.log(`✅ [OSINT-GOV] ${filepath} headers verified.`);
    }
});

if (hasError) {
  process.exit(1);
} else {
  console.log('✨ OSINT governance documents are compliant.');
  process.exit(0);
}
