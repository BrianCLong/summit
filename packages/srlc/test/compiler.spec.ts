/// <reference path="./shims.d.ts" />

import * as fs from 'fs';
import * as path from 'path';

import { compilePolicyFromSource } from '../src/compiler.ts';
import { parsePolicy } from '../src/parser.ts';
import { validatePolicy, ValidationError } from '../src/validator.ts';

describe('SRL-C compiler', () => {
  const testRoot = path.resolve(process.cwd(), 'packages', 'srlc', 'test');
  const fixturesDir = path.join(testRoot, 'policies');
  const goldenDir = path.join(testRoot, 'golden');

  function readPolicy(name: string): string {
    return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
  }

  function readGolden(name: string): string {
    return fs.readFileSync(path.join(goldenDir, name), 'utf-8');
  }

  it('emits byte-stable executors across all targets', () => {
    const source = readPolicy('customer_protection.srlc');
    const compiled = compilePolicyFromSource(source);

    expect(compiled.targets.sql).toBe(readGolden('customer_protection.sql'));
    expect(compiled.targets.kafka).toBe(readGolden('customer_protection.kt'));
    expect(compiled.targets.typescript).toBe(readGolden('customer_protection.ts'));

    expect(compiled.explain).toEqual([
      {
        field: 'customer.ssn',
        steps: [
          'mask(format=ssn,keep=4,char=#)',
          'hash(format=ssn,algorithm=sha256,salt=session)',
          'consistency=session',
          'note=Mask and hash SSN while keeping last 4 digits'
        ]
      },
      {
        field: 'account.iban',
        steps: [
          'tokenize(format=iban,namespace=payments,preserveFormat=true)',
          'consistency=global'
        ]
      },
      {
        field: 'contact.phone',
        steps: [
          'mask(format=phone,keep=4,char=#)',
          'generalize(format=phone,granularity=region)',
          'consistency=session'
        ]
      }
    ]);
  });

  it('validates schema and format errors before compilation', () => {
    const invalidSource = `policy bad_policy { field user.email: unknown { transform mask keep=-1; } }`;
    const raw = parsePolicy(invalidSource);
    const { result } = validatePolicy(raw);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("unsupported format 'unknown'") })
      ])
    );
    expect(() => compilePolicyFromSource(invalidSource)).toThrow(ValidationError);
  });
});
