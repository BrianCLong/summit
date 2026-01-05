import fs from 'fs';
import path from 'path';
import {
  calculateCostFromUsage,
  DEFAULT_COST_BUCKETS,
  type UsageAggregates,
} from '../../src/services/costBuckets';

type FixtureCase = {
  name: string;
  usage: UsageAggregates;
  expected: {
    computeProxyCostUsd: number;
    storageGbMonthCostUsd: number;
    receiptSigningOpsCostUsd: number;
    totalUsd: number;
  };
};

describe('Cost bucket calculations (integration)', () => {
  it('matches ground truth fixture totals and records accuracy artifact', () => {
    const fixturePath = path.join(
      __dirname,
      '..',
      'fixtures',
      'cost',
      'usage-cost-fixture.json',
    );
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
      cases: FixtureCase[];
    };

    const toleranceUsd = 1e-6;
    const accuracyReport = {
      generatedAt: new Date().toISOString(),
      toleranceUsd,
      bucketDefinitions: DEFAULT_COST_BUCKETS,
      cases: fixture.cases.map((testCase) => {
        const result = calculateCostFromUsage(testCase.usage);

        expect(result.buckets.computeProxy.costUsd).toBeCloseTo(
          testCase.expected.computeProxyCostUsd,
          6,
        );
        expect(result.buckets.storageGbMonth.costUsd).toBeCloseTo(
          testCase.expected.storageGbMonthCostUsd,
          6,
        );
        expect(result.buckets.receiptSigningOps.costUsd).toBeCloseTo(
          testCase.expected.receiptSigningOpsCostUsd,
          6,
        );
        expect(result.totalUsd).toBeCloseTo(testCase.expected.totalUsd, 6);

        const deltaUsd = Math.abs(result.totalUsd - testCase.expected.totalUsd);
        return {
          name: testCase.name,
          expectedTotalUsd: testCase.expected.totalUsd,
          actualTotalUsd: result.totalUsd,
          deltaUsd,
          withinTolerance: deltaUsd <= toleranceUsd,
        };
      }),
    };

    const artifactDir = path.join(
      process.cwd(),
      'server',
      'tests',
      'fixtures',
      'cost',
    );
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(
      path.join(artifactDir, 'accuracy-artifact.json'),
      `${JSON.stringify(accuracyReport, null, 2)}\n`,
      'utf8',
    );
  });
});
