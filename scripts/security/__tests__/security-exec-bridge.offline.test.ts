import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

test('Security Exec Bridge - Offline Mode', (t) => {
  const bridgeScript = path.join(REPO_ROOT, 'scripts/security/security-exec-bridge.ts');
  const fixturesDir = path.join(REPO_ROOT, 'scripts/security/fixtures');
  const outputDir = path.join(REPO_ROOT, 'scripts/security/__tests__/output'); // Temp dir for test output

  if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, 'TEST_REPORT.md');

  // Run the script in offline mode
  // Note: We need to use 'tsx' or 'node --loader tsx' if it's TS, but the plan says the script is .ts
  // The environment seems to support tsx or we might need to compile.
  // Let's assume we run it via tsx or similar.
  // Actually, let's try running it with `npx tsx`

  try {
      execSync(`npx tsx ${bridgeScript} --mode=offline --fixturesDir=${fixturesDir} --output=${outputFile}`, {
          encoding: 'utf8',
          stdio: 'pipe'
      });
  } catch (e) {
      console.error(e.stdout);
      console.error(e.stderr);
      throw e;
  }

  assert.ok(fs.existsSync(outputFile), 'Report file should be generated');

  const content = fs.readFileSync(outputFile, 'utf8');

  // Assertions
  assert.match(content, /# Security Execution Report/, 'Header missing');
  assert.match(content, /SECURITY.md/, 'Artifact SECURITY.md missing from report');
  assert.match(content, /docs\/compliance\/policy.md/, 'Artifact policy.md missing');
  assert.match(content, /security:test/, 'Script security:test missing from report');
  assert.doesNotMatch(content, /build/, 'Non-security script should not be listed');

  // Clean up
  // fs.rmSync(outputDir, { recursive: true, force: true });
});
