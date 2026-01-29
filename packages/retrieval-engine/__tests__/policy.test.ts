import { validatePolicyFile } from '../src/policy/validator.js';
import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Policy Validator', () => {
  const tempPolicyPath = path.join(process.cwd(), 'temp_test_policy.yaml');

  afterAll(() => {
    if (fs.existsSync(tempPolicyPath)) {
      fs.unlinkSync(tempPolicyPath);
    }
  });

  it('should validate a correct policy file', () => {
    const validYaml = `
version: 1
gates:
  ingest:
    require:
      - valid: true
  execution:
    require: []
  evidence:
    require: []
`;
    fs.writeFileSync(tempPolicyPath, validYaml);
    const policy = validatePolicyFile(tempPolicyPath);
    expect(policy.version).toBe(1);
    expect(policy.gates.ingest.require).toBeDefined();
  });

  it('should throw on invalid schema', () => {
    const invalidYaml = `
version: 1
gates:
  ingest: "not an object"
`;
    fs.writeFileSync(tempPolicyPath, invalidYaml);
    expect(() => validatePolicyFile(tempPolicyPath)).toThrow();
  });
});
