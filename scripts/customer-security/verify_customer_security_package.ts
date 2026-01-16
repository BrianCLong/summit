import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { checkSafety } from './redact_customer_package';

const PACKAGE_ROOT = 'artifacts/customer-security/latest/security-package';

function verify() {
  if (!fs.existsSync(PACKAGE_ROOT)) {
    console.error(`Package root not found: ${PACKAGE_ROOT}`);
    process.exit(1);
  }

  const checksumPath = path.join(PACKAGE_ROOT, 'verification/SHA256SUMS');
  if (!fs.existsSync(checksumPath)) {
    console.error(`Checksum file not found.`);
    process.exit(1);
  }

  const lines = fs.readFileSync(checksumPath, 'utf8').split('\n').filter(l => l);
  let errors = 0;

  for (const line of lines) {
    const [expectedHash, filePath] = line.split('  ');
    const fullPath = path.join(PACKAGE_ROOT, filePath.trim());

    if (!fs.existsSync(fullPath)) {
      console.error(`MISSING: ${filePath}`);
      errors++;
      continue;
    }

    const content = fs.readFileSync(fullPath);
    const actualHash = crypto.createHash('sha256').update(content).digest('hex');

    if (expectedHash !== actualHash) {
      console.error(`HASH MISMATCH: ${filePath}`);
      errors++;
    }

    // Safety Check (Banned Patterns)
    const textContent = content.toString('utf8');
    // Only check text files
    if (filePath.endsWith('.md') || filePath.endsWith('.txt') || filePath.endsWith('.json') || filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        const safetyErrors = checkSafety(textContent);
        if (safetyErrors.length > 0) {
            console.error(`SAFETY VIOLATION in ${filePath}:`);
            safetyErrors.forEach(err => console.error(`  - ${err}`));
            errors++;
        }
    }
  }

  if (errors > 0) {
    console.error(`Verification failed with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log(`Verification successful.`);
  }
}

verify();
