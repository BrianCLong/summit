import fs from 'fs';
import path from 'path';
import { validateOsintAsset } from '../../src/policy/osint';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_DIR = path.resolve(__dirname, '../../.github/policies/osint');

function runTest() {
  console.log('Starting OSINT Policy Gate Test...');
  let failures = 0;

  // Allowlist
  try {
    const allowContent = fs.readFileSync(path.join(FIXTURE_DIR, 'allowlist.fixtures.json'), 'utf-8');
    const allowFixtures = JSON.parse(allowContent);

    allowFixtures.forEach((item: any, i: number) => {
      const result = validateOsintAsset(item.asset);
      if (!result.valid) {
        console.error(`❌ Allowlist item ${i} failed: ${item.description}`);
        result.errors?.forEach(e => console.error(`   ${e}`));
        failures++;
      } else {
        console.log(`✅ Allowlist item ${i} passed: ${item.description}`);
      }
    });
  } catch (e) {
    console.error('❌ Failed to process allowlist:', e);
    failures++;
  }

  // Denylist
  try {
    const denyContent = fs.readFileSync(path.join(FIXTURE_DIR, 'denylist.fixtures.json'), 'utf-8');
    const denyFixtures = JSON.parse(denyContent);

    denyFixtures.forEach((item: any, i: number) => {
      const result = validateOsintAsset(item.asset);
      if (result.valid) {
        console.error(`❌ Denylist item ${i} PASSED (should fail): ${item.description}`);
        failures++;
      } else {
        console.log(`✅ Denylist item ${i} failed as expected: ${item.description}`);
      }
    });
  } catch (e) {
    console.error('❌ Failed to process denylist:', e);
    failures++;
  }

  if (failures > 0) {
    console.error(`\n❌ Tests Failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('\n✅ All Policy Gate Tests Passed');
  }
}

runTest();
