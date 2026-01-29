import fs from 'fs';
import path from 'path';

describe('Claim-Level GraphRAG Deny-by-Default Fixtures', () => {
  const rootDir = process.cwd();
  const fixturesDir = path.join(rootDir, 'subsumption', 'claim-level-graphrag', 'deny-fixtures');

  test('unsupported_claim.json should exist and have unsupported status', () => {
    const filePath = path.join(fixturesDir, 'unsupported_claim.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.expected_support).toBe('unsupported');
  });

  test('contradiction_claim.json should exist and have contradicted status', () => {
    const filePath = path.join(fixturesDir, 'contradiction_claim.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.expected_support).toBe('contradicted');
  });

  test('prompt_injection_evidence.json should exist and be flagged as injection', () => {
    const filePath = path.join(fixturesDir, 'prompt_injection_evidence.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.is_injection).toBe(true);
    expect(content.expected_support).not.toBe('supported');
  });
});
