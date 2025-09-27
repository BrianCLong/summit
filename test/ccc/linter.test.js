import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { lintPolicy } from '../../src/ccc/linter.js';
import { parsePolicy } from '../../src/ccc/compiler.js';

test('linter flags ambiguous clauses', () => {
  const ambiguousPolicy = `
version: 1
clauses:
  - scope: duplicate
    allow:
      - purpose: analytics
        lawful_basis: consent
      - purpose: analytics
        lawful_basis: consent
    fallback: allow
  - scope: duplicate
    allow:
      - purpose: operations
        lawful_basis: contract
    deny:
      - operations
`;
  const parsed = parsePolicy(ambiguousPolicy);
  const issues = lintPolicy(parsed);
  const messages = issues.map((issue) => issue.message);
  assert.ok(messages.includes('Duplicate scope detected; later entries override earlier rules.'));
  assert.ok(messages.includes('Fallback of allow can introduce ambiguity; prefer explicit purposes.'));
  assert.ok(messages.includes('Purpose "operations" is both allowed and denied.'));
});
