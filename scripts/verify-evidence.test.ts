import path from 'path';
import { verifyEvidence } from '../.github/scripts/verify-evidence';

describe('verifyEvidence', () => {
  const fixturesRoot = path.join(
    process.cwd(),
    'tests',
    'fixtures',
    'evidence-verifier',
  );

  it('passes for valid evidence bundle', async () => {
    const result = await verifyEvidence({
      evidenceDir: path.join(fixturesRoot, 'allow'),
      check: 'all',
    });

    expect(result.success).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails when timestamp appears outside stamp.json', async () => {
    const result = await verifyEvidence({
      evidenceDir: path.join(fixturesRoot, 'deny'),
      check: 'all',
    });

    expect(result.success).toBe(false);
    expect(result.failures.some((failure) => failure.includes('stamp.json'))).toBe(
      true,
    );
  });
});
