import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const CANONICAL_DEFS_PATH = path.join(ROOT_DIR, 'docs/governance/CANONICAL_DEFINITIONS.md');
const EXCEPTION_REGISTER_PATH = path.join(ROOT_DIR, 'docs/governance/EXCEPTION_REGISTER.md');
const SCAN_SCRIPT_PATH = path.join(__dirname, 'scan_debt.ts');

function checkFileExists(filepath: string, label: string) {
  if (fs.existsSync(filepath)) {
    console.log(`Control: ${label} exists... VERIFIED`);
  } else {
    console.error(`Control: ${label} MISSING... FAILED`);
    process.exit(1);
  }
}

function main() {
  console.log('--- GOVERNANCE AUDIT START ---');

  // 1. Verify Canonical Definitions
  checkFileExists(CANONICAL_DEFS_PATH, 'Canonical Definitions');

  // 2. Run Soft Spot Scan (Exception Register)
  console.log('Running Soft Spot Scan...');
  try {
    execSync(`npx tsx ${SCAN_SCRIPT_PATH}`, { stdio: 'inherit' });
    console.log('Policy: Exception Tracking... ENFORCED');
  } catch (error) {
    console.error('Policy: Exception Tracking... FAILED');
    process.exit(1);
  }

  // 3. Verify Register Exists
  checkFileExists(EXCEPTION_REGISTER_PATH, 'Exception Register');

  // 4. Output Summary for Logs
  const defsContent = fs.readFileSync(CANONICAL_DEFS_PATH, 'utf-8');
  const registerContent = fs.readFileSync(EXCEPTION_REGISTER_PATH, 'utf-8');

  const exceptionCountMatch = registerContent.match(/\|\s*\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|/);
  const exceptionCount = exceptionCountMatch ? exceptionCountMatch[1] : 'Unknown';

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`Invariant: GA Definitions Loaded`);
  console.log(`Invariant: Known Soft Spots Tracked (${exceptionCount} items)`);
  console.log(`Result: Governance Checks PASSED`);
  console.log('--- GOVERNANCE AUDIT END ---');
}

main();
