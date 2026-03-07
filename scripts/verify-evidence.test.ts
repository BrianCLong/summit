import path from 'path';
import { spawnSync } from 'node:child_process';
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

  it('fails fast on invalid --check mode in CLI usage', () => {
    const cliPath = path.join(
      process.cwd(),
      '.github',
      'scripts',
      'verify-evidence.ts',
    );

    const result = spawnSync('pnpm', ['exec', 'tsx', cliPath, '--check', 'invalid'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr.includes('Invalid --check value')).toBe(true);
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
