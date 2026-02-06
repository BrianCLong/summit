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

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

/**
 * Collect all markdown files to verify from directories and specific file paths.
 */
function collectFilesToVerify(targetDirs, specificFiles) {
  const files = new Set();

  // Collect from directories
  targetDirs.forEach(dir => {
    walkDir(dir, (filepath) => {
      if (filepath.endsWith('.md')) {
        files.add(filepath);
      }
    });
  });

  // Add specific files
  specificFiles.forEach(filepath => {
    if (fs.existsSync(filepath)) {
      files.add(filepath);
    }
  });

  return Array.from(files);
}

/**
 * Verify all collected files and report results.
 */
function verifyAllFiles(files) {
  let hasError = false;

  files.forEach(filepath => {
    const missing = verifyFile(filepath);
    if (missing.length > 0) {
      console.error(`❌ [OSINT-GOV] ${filepath} is missing mandatory headers: ${missing.join(', ')}`);
      hasError = true;
    } else {
      console.log(`✅ [OSINT-GOV] ${filepath} headers verified.`);
    }
  });

  return hasError;
}

// Configuration
const targetDirs = ['docs/osint'];
const specificFiles = ['docs/governance/OSINT_EVIDENCE_POLICY.md'];

// Collect and verify
const filesToVerify = collectFilesToVerify(targetDirs, specificFiles);
const hasError = verifyAllFiles(filesToVerify);

if (hasError) {
  process.exit(1);
} else {
  console.log('✨ OSINT governance documents are compliant.');
  process.exit(0);
}
