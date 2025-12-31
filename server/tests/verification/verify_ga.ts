
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the repo (assuming server/tests/verification/)
const REPO_ROOT = path.resolve(__dirname, '../../../');
const REPORT_DIR = path.join(REPO_ROOT, 'docs/release/verification');
const REPORT_FILE = path.join(REPORT_DIR, 'ga_report.json');

interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
  type: 'static' | 'runtime';
}

const results: CheckResult[] = [];

function checkFileExists(relativePath: string, description: string) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  const exists = fs.existsSync(fullPath);
  results.push({
    name: `File Exist: ${relativePath}`,
    passed: exists,
    message: exists ? `Found ${description}` : `MISSING: ${description}`,
    type: 'static'
  });
  return exists;
}

function checkFileContains(relativePath: string, searchString: string | RegExp, description: string) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    results.push({
      name: `Content Check: ${relativePath}`,
      passed: false,
      message: `File not found, cannot check for ${description}`,
      type: 'static'
    });
    return false;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const found = searchString instanceof RegExp ? searchString.test(content) : content.includes(searchString);
  results.push({
    name: `Content Check: ${relativePath}`,
    passed: found,
    message: found ? `Found ${description}` : `MISSING CONTENT: ${description}`,
    type: 'static'
  });
  return found;
}

async function checkModuleLoad(relativePath: string, exportName?: string) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  try {
    const module = await import(fullPath);
    if (exportName) {
      if (module[exportName]) {
        results.push({
            name: `Module Import: ${relativePath}`,
            passed: true,
            message: `Loaded and found export '${exportName}'`,
            type: 'runtime'
        });
      } else {
        results.push({
            name: `Module Import: ${relativePath}`,
            passed: false,
            message: `Loaded but MISSING export '${exportName}'`,
            type: 'runtime'
        });
      }
    } else {
        results.push({
            name: `Module Import: ${relativePath}`,
            passed: true,
            message: `Loaded successfully`,
            type: 'runtime'
        });
    }
  } catch (err: any) {
    // If it's a module not found error (likely due to missing deps in dev env), we mark as warning if possible,
    // but strict requirement says "runs only if deps resolve".
    // We will log failure but check for specific error types to be helpful.
    results.push({
        name: `Module Import: ${relativePath}`,
        passed: false,
        message: `Failed to load: ${err.message}`,
        type: 'runtime'
    });
  }
}

async function main() {
  console.log('Starting GA Verification...');
  console.log(`Repo Root: ${REPO_ROOT}`);

  // Tier A: Static Checks
  console.log('\n--- Tier A: Static Verification ---');

  checkFileExists('server/src/middleware/auth.ts', 'Auth Middleware');
  checkFileContains('server/src/middleware/auth.ts', 'ensureAuthenticated', 'ensureAuthenticated export');

  checkFileExists('server/src/middleware/rateLimit.ts', 'Rate Limit Middleware');
  checkFileExists('server/src/provenance/ledger.ts', 'Provenance Ledger');

  checkFileExists('server/src/pii/sensitivity.ts', 'Sensitivity Config');
  // Updated check: look for SensitivityClass enum
  checkFileContains('server/src/pii/sensitivity.ts', /SensitivityClass|SENSITIVITY_LEVELS/, 'Sensitivity definitions');

  checkFileExists('policy/', 'OPA Policy Directory');

  // Tier B: Runtime Checks
  console.log('\n--- Tier B: Runtime Verification ---');

  // Try loading sensitivity - it should be dependency free
  await checkModuleLoad('server/src/pii/sensitivity.ts');

  // Try loading auth - might fail if deps missing
  await checkModuleLoad('server/src/middleware/auth.ts', 'ensureAuthenticated');

  await checkModuleLoad('server/src/provenance/ledger.ts');

  // Output JSON Report
  if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const report = {
      timestamp: new Date().toISOString(),
      checks: results,
      summary: {
          total: results.length,
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length
      }
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${REPORT_FILE}`);

  // Console Report
  const failures = results.filter(r => !r.passed);
  console.log('\n--- Verification Report ---');
  results.forEach(r => {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}: ${r.message || ''}`);
  });

  if (failures.length > 0) {
    console.error(`\n${failures.length} Checks Failed!`);
    // We treat static failures as fatal. Runtime failures might be environment specific (missing deps).
    // For now, we exit 1 on any failure to be strict as requested ("Verification is a hard gate").
    process.exit(1);
  } else {
    console.log('\nAll checks passed.');
  }
}

main().catch(err => {
  console.error('Verification Failed:', err);
  process.exit(1);
});
