import { createRequire } from 'node:module';
import { DarkPatternLinter } from '../src/validators.js';
import patterns from '../src/dark-patterns.json';
import { PolicyTemplatePack } from '../src/types.js';

const require = createRequire(import.meta.url);
const pack = require('../templates/policyPack.json') as PolicyTemplatePack;

describe('DarkPatternLinter', () => {
  it('produces no findings for the curated pack', () => {
    const linter = new DarkPatternLinter(patterns);
    expect(linter.lintPack(pack)).toEqual([]);
  });

  it('flags disallowed language', () => {
    const linter = new DarkPatternLinter(patterns);
    const mutated: PolicyTemplatePack = {
      ...pack,
      locales: {
        ...pack.locales,
        'en-US': {
          ...pack.locales['en-US'],
          summary: 'You must accept to continue'
        }
      }
    };
    const findings = linter.lintPack(mutated);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].locale).toBe('en-US');
  });
});
