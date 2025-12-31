
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../');

interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: CheckResult[] = [];

function checkFileExists(relativePath: string, description: string) {
    const fullPath = path.join(REPO_ROOT, relativePath);
    const exists = fs.existsSync(fullPath);
    results.push({
      name: `File Exist: ${relativePath}`,
      passed: exists,
      message: exists ? `Found ${description}` : `MISSING: ${description}`
    });
    return exists;
}

function checkFileContains(relativePath: string, searchString: string | RegExp, description: string) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    results.push({
      name: `Content Check: ${relativePath}`,
      passed: false,
      message: `File not found`
    });
    return false;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const found = searchString instanceof RegExp ? searchString.test(content) : content.includes(searchString);
  results.push({
    name: `Security Assertion: ${description}`,
    passed: found,
    message: found ? `Found ${description}` : `MISSING: ${description}`
  });
  return found;
}

async function main() {
  console.log('Starting Security Assertions Verification...');

  // 1. Rate Limiting in App
  const appPath = 'server/src/app.ts';
  if (fs.existsSync(path.join(REPO_ROOT, appPath))) {
      checkFileContains(appPath, /rateLimit/i, 'Rate Limiting Middleware usage in app.ts');
  } else {
      checkFileContains('server/src/index.ts', /rateLimit/i, 'Rate Limiting Middleware usage in index.ts');
  }

  // 2. Auth Middleware Usage in Routes
  const routeDir = path.join(REPO_ROOT, 'server/src/routes');
  if (fs.existsSync(routeDir)) {
      const files = fs.readdirSync(routeDir).filter(f => f.endsWith('.ts'));
      files.forEach(f => {
          if (f.includes('auth.ts') || f.includes('health.ts')) return;
          checkFileContains(`server/src/routes/${f}`, /ensureAuthenticated|authenticate|requireAuth/i, `Auth in route ${f}`);
      });
  }

  // 3. OPA/Policy
  checkFileExists('server/src/middleware/opa.ts', 'OPA Middleware');


  // Report
  const failures = results.filter(r => !r.passed);
  console.log('\n--- Security Verification Report ---');
  results.forEach(r => {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}: ${r.message || ''}`);
  });

  if (failures.length > 0) {
    console.error(`\n${failures.length} Checks Failed!`);
    process.exit(1);
  } else {
    console.log('\nAll security assertions passed.');
  }
}

main().catch(err => {
  console.error('Verification Failed:', err);
  process.exit(1);
});
