import fs from 'fs';
import path from 'path';
import {
  evaluateRetrievalPolicy,
  redactNeverLog,
} from '../policy/retrievalSecurityPolicy.js';

describe('Retrieval security policy', () => {
  const exfiltrationCases = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        'fixtures',
        'abuse',
        'exfiltration_prompts.json',
      ),
      'utf-8',
    ),
  ).cases as Array<{ id: string; prompt: string; blocked: boolean }>;

  it('enforces deny-by-default allowlist and blocks exfiltration prompts', () => {
    for (const testCase of exfiltrationCases) {
      const decision = evaluateRetrievalPolicy({
        queryText: testCase.prompt,
        filters: { allowlist: ['graph', 'docs'] },
      });

      if (testCase.blocked) {
        expect(decision.allowed).toBe(false);
        expect(decision.reasons).toContain('EXFILTRATION_PATTERN');
      } else {
        expect(decision.allowed).toBe(true);
      }
    }
  });

  it('sanitizes prompt injection artifacts', () => {
    const injectionDir = path.join(
      process.cwd(),
      'fixtures',
      'abuse',
      'prompt_injection_docs',
    );
    const files = fs.readdirSync(injectionDir);

    for (const file of files) {
      const content = fs.readFileSync(path.join(injectionDir, file), 'utf-8');
      const decision = evaluateRetrievalPolicy({
        queryText: content,
        filters: { allowlist: ['graph'] },
      });

      expect(decision.sanitizedQuery).not.toMatch(/SYSTEM:/i);
      expect(decision.sanitizedQuery).not.toMatch(/<tool>/i);
      expect(decision.sanitizedQuery).not.toMatch(/BEGIN SYSTEM/i);
    }
  });

  it('redacts never-log fields deterministically', () => {
    const redactionCases = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'fixtures', 'security', 'redaction_cases.json'),
        'utf-8',
      ),
    ).cases as Array<{ id: string; input: string; expected: string }>;

    for (const testCase of redactionCases) {
      expect(redactNeverLog(testCase.input)).toBe(testCase.expected);
    }
  });
});
