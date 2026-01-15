
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const contractPath = join(process.cwd(), 'agent-contract.json');
let contract;

try {
  contract = JSON.parse(readFileSync(contractPath, 'utf8'));
} catch (e) {
  console.error('Failed to parse agent-contract.json:', e);
  process.exit(1);
}

// Simple PII scanner
const piiPatterns = contract.piiPatterns.map(p => ({
  name: p.name,
  regex: new RegExp(p.pattern, 'g')
}));

function scanFile(filePath) {
  if (!existsSync(filePath)) {
    console.warn(`File not found: ${filePath}, skipping.`);
    return false;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    let found = false;
    for (const p of piiPatterns) {
      if (p.regex.test(content)) {
        console.error(`[PII DETECTED] ${p.name} found in ${filePath}`);
        found = true;
      }
    }
    return found;
  } catch (err) {
    console.warn(`Could not read file ${filePath}: ${err.message}`);
    return false;
  }
}

// Get changed files from args
const filesToScan = process.argv.slice(2);

if (filesToScan.length === 0) {
  console.log('No files to scan for PII.');
} else {
  let hasPii = false;
  for (const file of filesToScan) {
      // Decode URI components if filenames are passed URL-encoded,
      // but usually shell passing keeps them as is.
      // However, to handle spaces safely from the GitHub Action,
      // we might expect filenames to be passed individually.

      if (scanFile(file)) {
          hasPii = true;
      }
  }

  if (hasPii) {
    process.exit(1);
  }
}

console.log('PII scan passed.');
