import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const gateScript = path.resolve(process.cwd(), 'ci/no_confidence_without_uncertainty.sh');
const validateScript = path.resolve(process.cwd(), 'ci/schema_validate.sh');
const tempDir = path.resolve(process.cwd(), 'tests/regression/temp');

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
  console.log('Running CI Gate regression tests...');
  setup();

  try {
    // Test 1: PASS when no confidence field is present
    const file1 = createJsonFile('no_confidence.json', { foo: 'bar' });
    const output1 = execSync(`${gateScript} ${file1}`).toString();
    assert(output1.includes('PASSED'), 'Test 1 should PASS');
    console.log('Test 1 Passed');

    // Test 2: PASS when confidence and uncertainty fields are present
    const file2 = createJsonFile('valid_ufar.json', {
      confidence: 0.8,
      uncertainty: {
        epistemic: 0.2,
        aleatoric: 0.1
      }
    });
    const output2 = execSync(`${gateScript} ${file2}`).toString();
    assert(output2.includes('PASSED'), 'Test 2 should PASS');
    console.log('Test 2 Passed');

    // Test 3: FAIL when confidence is present but uncertainty is missing
    const file3 = createJsonFile('invalid_ufar.json', {
      confidence: 0.8
    });
    try {
      execSync(`${gateScript} ${file3}`);
      throw new Error('Test 3 should have failed');
    } catch (error: any) {
      assert(error.status === 1, 'Test 3 exit code should be 1');
      assert(error.stdout.toString().includes('FAILED'), 'Test 3 output should contain FAILED');
    }
    console.log('Test 3 Passed');

    // Test 4: FAIL when confidence is present but epistemic uncertainty is missing
    const file4 = createJsonFile('invalid_ufar_no_epistemic.json', {
      confidence: 0.8,
      uncertainty: {
        aleatoric: 0.1
      }
    });
    try {
      execSync(`${gateScript} ${file4}`);
      throw new Error('Test 4 should have failed');
    } catch (error: any) {
      assert(error.status === 1, 'Test 4 exit code should be 1');
      assert(error.stdout.toString().includes('FAILED'), 'Test 4 output should contain FAILED');
    }
    console.log('Test 4 Passed');

    // Test 5: PASS for valid Hypothesis Ledger
    const file5 = createJsonFile('valid_ledger.json', {
      hypotheses: [
        {
          hypothesisId: 'H1',
          statement: 'Test',
          status: 'ACTIVE',
          confidence: 0.9,
          uncertainty: { epistemic: 0.1, aleatoric: 0.05 },
          evidenceLinks: []
        }
      ]
    });
    const output5 = execSync(`${gateScript} ${file5}`).toString();
    assert(output5.includes('PASSED'), 'Test 5 should PASS');
    console.log('Test 5 Passed');

    // Test 6: FAIL for Hypothesis Ledger with missing uncertainty
    const file6 = createJsonFile('invalid_ledger.json', {
      hypotheses: [
        {
          hypothesisId: 'H1',
          statement: 'Test',
          status: 'ACTIVE',
          confidence: 0.9,
          evidenceLinks: []
        }
      ]
    });
    try {
      execSync(`${gateScript} ${file6}`);
      throw new Error('Test 6 should have failed');
    } catch (error: any) {
      assert(error.status === 1, 'Test 6 exit code should be 1');
      assert(error.stdout.toString().includes('FAILED'), 'Test 6 output should contain FAILED');
    }
    console.log('Test 6 Passed');

    // Test 7: FAIL for Hypothesis Ledger with null uncertainty
    const file7 = createJsonFile('invalid_ledger_null_uncertainty.json', {
      hypotheses: [
        {
          hypothesisId: 'H1',
          statement: 'Test',
          status: 'ACTIVE',
          confidence: 0.9,
          uncertainty: null,
          evidenceLinks: []
        }
      ]
    });
    try {
      execSync(`${gateScript} ${file7}`);
      throw new Error('Test 7 should have failed');
    } catch (error: any) {
      assert(error.status === 1, 'Test 7 exit code should be 1');
      assert(error.stdout.toString().includes('FAILED'), 'Test 7 output should contain FAILED');
    }
    console.log('Test 7 Passed');

    // Test 8: Schema Validation PASS
    const ufarSchema = path.resolve(process.cwd(), 'schemas/ufar.schema.json');
    const validUfarFile = createJsonFile('valid_ufar_schema.json', {
      uncertainty: { epistemic: 0.1, aleatoric: 0.1 },
      known_unknowns: ["none"],
      assumptions: ["none"],
      validation_plan: ["none"]
    });
    const output8 = execSync(`${validateScript} ${validUfarFile} ${ufarSchema}`).toString();
    assert(output8.includes('PASSED'), 'Test 8 should PASS schema validation');
    console.log('Test 8 Passed');

    // Test 9: Schema Validation FAIL
    const invalidUfarFile = createJsonFile('invalid_ufar_schema.json', {
      uncertainty: { epistemic: 0.1 } // missing aleatoric
    });
    try {
      execSync(`${validateScript} ${invalidUfarFile} ${ufarSchema}`);
      throw new Error('Test 9 should have failed schema validation');
    } catch (error: any) {
      assert(error.status === 1, 'Test 9 exit code should be 1');
    }
    console.log('Test 9 Passed');

    console.log('All CI Gate regression tests PASSED.');
  } finally {
    teardown();
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
