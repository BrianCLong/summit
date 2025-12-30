import { execSync } from 'child_process';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptPath = resolve(__dirname, '../verify-evidence-bundle.ts');
const fixturesDir = resolve(__dirname, 'fixtures');

function runVerifier(manifestName: string) {
  const manifestPath = join(fixturesDir, manifestName);
  try {
    // Use tsx to run the script
    const output = execSync(`npx tsx ${scriptPath} ${manifestPath}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr
    });
    return { status: 0, output };
  } catch (e: any) {
    return { status: e.status || 1, output: (e.stdout || '') + (e.stderr || '') };
  }
}

// Simple test runner since Jest might not be set up for this specific file location in the monorepo root
// or configured for ESM correctly in this context.
async function runTests() {
  console.log('Running verify-evidence-bundle tests...');
  let failed = false;

  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failed = true;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  };

  // Test 1: Valid Manifest
  console.log('\n--- Test 1: Valid Manifest ---');
  const validRes = runVerifier('valid-manifest.json');
  assert(validRes.status === 0, 'Exit code should be 0');
  assert(validRes.output.includes('Manifest verification passed'), 'Output should indicate success');
  if (validRes.status !== 0) console.log('Output:', validRes.output);

  // Test 2: Invalid Schema
  console.log('\n--- Test 2: Invalid Schema ---');
  const invalidRes = runVerifier('invalid-schema.json');
  assert(invalidRes.status === 1, 'Exit code should be 1');
  assert(invalidRes.output.includes("Missing field in 'evidence_bundle'"), 'Output should report missing fields');

  // Test 3: Missing Files
  console.log('\n--- Test 3: Missing Files ---');
  const missingRes = runVerifier('missing-files.json');
  assert(missingRes.status === 1, 'Exit code should be 1');
  assert(missingRes.output.includes('Referenced file not found'), 'Output should report missing files');
  assert(missingRes.output.includes('non-existent-file.xml'), 'Output should name the missing file');

  if (failed) {
    console.error('\n❌ Tests FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All tests PASSED');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
