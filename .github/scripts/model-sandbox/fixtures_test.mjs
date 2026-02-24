import { validate } from './run_policy_check.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../');

const fixtures = [
  { path: 'tools/model-sandbox/fixtures/good-config.json', expectedFail: false },
  { path: 'tools/model-sandbox/fixtures/bad-user.json', expectedFail: true },
  { path: 'tools/model-sandbox/fixtures/bad-hash.json', expectedFail: true },
  { path: 'tools/model-sandbox/fixtures/bad-mount.json', expectedFail: true }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    const absoluteFixturePath = join(REPO_ROOT, fixture.path);
    console.log(`Testing fixture: ${fixture.path}`);
    try {
        const config = JSON.parse(readFileSync(absoluteFixturePath, 'utf8'));
        const errors = await validate(config);
        const isFail = errors.length > 0;

        if (isFail === fixture.expectedFail) {
            console.log(`✅ Passed: ${fixture.path} (Errors: ${errors.length})`);
            passed++;
        } else {
            console.error(`❌ Failed: ${fixture.path} (Expected fail: ${fixture.expectedFail}, Actual fail: ${isFail})`);
            errors.forEach(e => console.error(`  - ${e}`));
            failed++;
        }
    } catch (e) {
        console.error(`❌ Error testing ${fixture.path}:`, e.message);
        failed++;
    }
  }

  console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
