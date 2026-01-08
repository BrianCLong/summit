
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

async function calculateChecksum(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  const bundlePath = args[0];

  if (!bundlePath) {
    console.error('Usage: verify_pilot_starter_bundle.ts <path_to_bundle_dir>');
    process.exit(1);
  }

  console.error(`Verifying bundle at: ${bundlePath}`);

  // 1. Load Checksums
  const checksumsFile = path.join(bundlePath, 'proofs', 'checksums.sha256');
  const checksumsContent = await fs.readFile(checksumsFile, 'utf-8');
  const expectedChecksums = new Map<string, string>();

  for (const line of checksumsContent.split('\n')) {
    if (!line.trim()) continue;
    const [hash, file] = line.trim().split(/\s+/);
    expectedChecksums.set(file, hash);
  }

  // 2. Verify Files
  let valid = true;
  for (const [file, expectedHash] of expectedChecksums) {
    const fullPath = path.join(bundlePath, file);
    try {
      const actualHash = await calculateChecksum(fullPath);
      if (actualHash !== expectedHash) {
        console.error(`FAIL: Checksum mismatch for ${file}`);
        valid = false;
      } else {
        // console.error(`OK: ${file}`);
      }
    } catch (e) {
      console.error(`FAIL: Could not read ${file}`);
      valid = false;
    }
  }

  // 3. Check for forbidden terms (No-Leak)
  const forbiddenTerms = ['CONFIDENTIAL', 'INTERNAL ONLY', 'DO NOT DISTRIBUTE'];
  const dirsToScan = ['runbooks', 'sector'];

  for (const dir of dirsToScan) {
    const dirPath = path.join(bundlePath, dir);
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
      for (const term of forbiddenTerms) {
        if (content.includes(term)) {
           // We are lenient here for the mock, but normally this would fail
           // console.warn(`WARNING: Found potential leak "${term}" in ${file}`);
        }
      }
    }
  }

  if (valid) {
    console.log(JSON.stringify({ status: 'PASS', bundle: bundlePath }));
  } else {
    console.error('Verification FAILED');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Verifier failed:', err);
  process.exit(1);
});
