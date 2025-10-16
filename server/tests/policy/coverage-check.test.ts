describe('evaluateCoverage', () => {
  test('passes when all changed files meet the threshold', async () => {
    const coverageModule = require('../../../scripts/ci/coverage-check.cjs');
    const summary = {
      total: {} as Record<string, unknown>,
      'apps/server/src/service.ts': createCoverageEntry(92),
      'client/src/view.tsx': createCoverageEntry(90),
    } as Record<string, any>;
    const result = coverageModule.evaluateCoverage(
      summary,
      ['apps/server/src/service.ts', 'client/src/view.tsx'],
      0.85,
    );
    expect(result.passed).toBe(true);
    expect(result.details[0]).toContain('meet or exceed 85% coverage');
  });

  test('fails when any metric drops below the threshold', async () => {
    const coverageModule = require('../../../scripts/ci/coverage-check.cjs');
    const summary = {
      total: {} as Record<string, unknown>,
      'apps/server/src/controller.ts': {
        statements: { pct: 80 },
        branches: { pct: 90 },
        functions: { pct: 88 },
        lines: { pct: 89 },
      },
    } as Record<string, any>;
    const result = coverageModule.evaluateCoverage(
      summary,
      ['apps/server/src/controller.ts'],
      0.85,
    );
    expect(result.passed).toBe(false);
    expect(result.details).toContainEqual(
      expect.stringContaining(
        'apps/server/src/controller.ts: statements coverage 80.0% is below required 85',
      ),
    );
  });
});

function createCoverageEntry(pct: number) {
  return {
    statements: { pct },
    branches: { pct },
    functions: { pct },
    lines: { pct },
  };
}
