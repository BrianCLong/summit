import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('CI Gate: No Confidence Without Uncertainty', () => {
  const gateScript = path.resolve(process.cwd(), 'ci/no_confidence_without_uncertainty.sh');
  const tempDir = path.resolve(process.cwd(), 'tests/regression/temp');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createJsonFile(name: string, content: any) {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    return filePath;
  }

  test('should PASS when no confidence field is present', () => {
    const file = createJsonFile('no_confidence.json', { foo: 'bar' });
    const output = execSync(`${gateScript} ${file}`).toString();
    expect(output).toContain('PASSED');
  });

  test('should PASS when confidence and uncertainty fields are present', () => {
    const file = createJsonFile('valid_ufar.json', {
      confidence: 0.8,
      uncertainty: {
        epistemic: 0.2,
        aleatoric: 0.1
      }
    });
    const output = execSync(`${gateScript} ${file}`).toString();
    expect(output).toContain('PASSED');
  });

  test('should FAIL when confidence is present but uncertainty is missing', () => {
    const file = createJsonFile('invalid_ufar.json', {
      confidence: 0.8
    });
    try {
      execSync(`${gateScript} ${file}`);
      fail('Should have failed');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('FAILED');
    }
  });

  test('should FAIL when confidence is present but epistemic uncertainty is missing', () => {
    const file = createJsonFile('invalid_ufar_no_epistemic.json', {
      confidence: 0.8,
      uncertainty: {
        aleatoric: 0.1
      }
    });
    try {
      execSync(`${gateScript} ${file}`);
      fail('Should have failed');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('FAILED');
    }
  });

  test('should PASS for valid Hypothesis Ledger', () => {
    const file = createJsonFile('valid_ledger.json', {
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
    const output = execSync(`${gateScript} ${file}`).toString();
    expect(output).toContain('PASSED');
  });

  test('should FAIL for Hypothesis Ledger with missing uncertainty', () => {
    const file = createJsonFile('invalid_ledger.json', {
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
      execSync(`${gateScript} ${file}`);
      fail('Should have failed');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('FAILED');
    }
  });
});
