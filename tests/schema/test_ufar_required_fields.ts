import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const validateScript = path.resolve(process.cwd(), 'ci/schema_validate.sh');
const ufarSchema = path.resolve(process.cwd(), 'schemas/ufar.schema.json');
const tempDir = path.resolve(process.cwd(), 'tests/schema/temp');

function setup() {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
}

function teardown() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createJsonFile(name: string, content: any) {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  return filePath;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('Running UFAR schema required fields tests...');
  setup();

  try {
    // Test: Missing uncertainty
    const file1 = createJsonFile('missing_uncertainty.json', {
      known_unknowns: [],
      assumptions: [],
      validation_plan: []
    });
    try {
      execSync(`${validateScript} ${file1} ${ufarSchema}`);
      throw new Error('Should have failed validation');
    } catch (e: any) {
      assert(e.status !== 0, 'Should fail when uncertainty is missing');
    }

    // Test: Missing validation_plan
    const file2 = createJsonFile('missing_validation_plan.json', {
      uncertainty: { epistemic: 0.1, aleatoric: 0.1 },
      known_unknowns: [],
      assumptions: []
    });
    try {
      execSync(`${validateScript} ${file2} ${ufarSchema}`);
      throw new Error('Should have failed validation');
    } catch (e: any) {
      assert(e.status !== 0, 'Should fail when validation_plan is missing');
    }

    // Test: Valid UFAR
    const file3 = createJsonFile('valid_ufar.json', {
      uncertainty: { epistemic: 0.1, aleatoric: 0.1 },
      known_unknowns: ["unknown1"],
      assumptions: ["assumption1"],
      validation_plan: ["plan1"]
    });
    const output3 = execSync(`${validateScript} ${file3} ${ufarSchema}`).toString();
    assert(output3.includes('PASSED'), 'Should pass valid UFAR');

    console.log('All UFAR schema tests PASSED.');
  } finally {
    teardown();
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
