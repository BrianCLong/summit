import path from 'node:path';
import { verifyEvidenceBundle } from '../../../src/graphrag/narratives/evidence/validator.js';

describe('verifyEvidenceBundle', () => {
  const repoRoot = path.resolve(process.cwd());

  it('validates pass fixtures', () => {
    const result = verifyEvidenceBundle({
      rootDir: repoRoot,
      indexPath: path.join(
        repoRoot,
        'tests/fixtures/evidence/pass/evidence/index.json',
      ),
    });

    expect(result.ok).toBe(true);
  });

  it('fails when metrics.json is missing', () => {
    expect(() =>
      verifyEvidenceBundle({
        rootDir: repoRoot,
        indexPath: path.join(
          repoRoot,
          'tests/fixtures/evidence/fail/missing-metrics/evidence/index.json',
        ),
      }),
    ).toThrow('Missing required evidence file');
  });

  it('fails when timestamp-like keys appear outside stamp.json', () => {
    expect(() =>
      verifyEvidenceBundle({
        rootDir: repoRoot,
        indexPath: path.join(
          repoRoot,
          'tests/fixtures/evidence/fail/timestamp-in-report/evidence/index.json',
        ),
      }),
    ).toThrow('Timestamp-like keys found');
  });
});
