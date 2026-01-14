import { evaluateConditions, resolveTemplate, validateMap } from '../verify_evidence_map.mjs';

describe('verify_evidence_map helpers', () => {
  it('resolves template variables', () => {
    const value = resolveTemplate('artifacts/${sha}/file.txt', { sha: 'abc123' });
    expect(value).toBe('artifacts/abc123/file.txt');
  });

  it('evaluates conditions against ref and env', () => {
    process.env.TEST_REF = 'enabled';
    const conditions = { ref_prefix: 'refs/tags/', env: { TEST_REF: 'enabled' } };
    expect(evaluateConditions(conditions, { ref: 'refs/tags/v1.0.0' })).toBe(true);
    expect(evaluateConditions(conditions, { ref: 'refs/heads/main' })).toBe(false);
  });

  it('validates a minimal evidence map', () => {
    const map = {
      schema_version: '1',
      scope: { default_ref: 'main' },
      required_evidence: [
        {
          id: 'sbom',
          path: 'artifacts/${sha}/sbom.json',
          verifier: { type: 'sha256' },
        },
      ],
    };
    expect(() => validateMap(map)).not.toThrow();
  });

  it('rejects maps with missing required_evidence', () => {
    const map = { schema_version: '1', scope: {} };
    expect(() => validateMap(map)).toThrow('required_evidence');
  });
});
