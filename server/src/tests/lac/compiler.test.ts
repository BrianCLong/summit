import fs from 'node:fs';
import path from 'node:path';
import { compilePolicy, decodeProgram, parsePolicyDocument } from '@/policy/lac/index.js';

describe('LAC compiler', () => {
  it('compiles YAML policies into bytecode with integrity metadata', () => {
    const yamlPolicy = `
metadata:
  version: "0.1"
licenses:
  - id: test-license
warrants:
  - id: test-warrant
retention:
  defaultMaxDays: 15
jurisdiction:
  allowed: [US]
rules:
  - id: Query.test
    operation: query
    target: test
    legalBasis: "Test basis"
    appealHint: "Contact test desk"
    requires:
      licenses: [test-license]
      warrants: [test-warrant]
      jurisdictions: [US]
      retention:
        maxDays: 5
`;
    const { program, bytecode } = compilePolicy(yamlPolicy);
    expect(program.version).toBe(1);
    expect(program.rules).toHaveLength(1);
    expect(program.rules[0].legalBasis).toContain('Test basis');
    expect(bytecode.byteLength).toBeGreaterThan(20);

    const decoded = decodeProgram(bytecode);
    expect(decoded.sourceHash).toHaveLength(64);
    expect(decoded.rules[0].appealHint).toBe('Contact test desk');
  });

  it('parses canned policy fixtures', () => {
    const fixture = path.join(__dirname, '../../../policies/lac/canned/standard.yaml');
    const contents = fs.readFileSync(fixture, 'utf8');
    const parsed = parsePolicyDocument(contents);
    expect(parsed.rules).toHaveLength(3);
    expect(parsed.licenses.map(license => license.id)).toContain('data-broker-license');
  });
});
