import { CypherSandbox } from '../../../server/src/middleware/cypher-sandbox';
import { getFuzzConfig, logFuzzRun } from './config';
import { baseScenarios, buildCorpus } from './corpus';

describe('graph guardrail fuzzing', () => {
  const config = getFuzzConfig();

  logFuzzRun(config, config.iterations);

  it('blocks unsafe patterns and allows safe reads with coverage by reason code', () => {
    const sandbox = new CypherSandbox();
    const corpus = buildCorpus(config.seed, config.iterations);

    const coverage = new Map<string, number>();

    for (const scenario of corpus) {
      const result = sandbox.validateQuery(
        scenario.mutatedQuery,
        scenario.clearance,
        scenario.authorities,
      );

      coverage.set('TOTAL', (coverage.get('TOTAL') || 0) + 1);

      for (const reasonCode of result.reasonCodes ?? []) {
        coverage.set(reasonCode, (coverage.get(reasonCode) || 0) + 1);
      }

      expect(result.allowed).toBe(scenario.expected.allowed);

      if (scenario.expected.allowed) {
        expect(result.reasonCodes).toContain('SAFE_READ');
      } else {
        expect(result.reasonCodes).toContain(scenario.expected.reason);
      }
    }

    for (const scenario of baseScenarios) {
      expect(coverage.has(scenario.expected.reason)).toBe(true);
      expect(coverage.get(scenario.expected.reason)).toBeGreaterThan(0);
    }

    const criticalReasons = [
      'TENANT_FILTER_MISSING',
      'WRITE_OPERATION',
      'CARTESIAN_PRODUCT',
      'DEEP_TRAVERSAL',
      'SAFE_READ',
    ];

    for (const reason of criticalReasons) {
      expect(coverage.get(reason)).toBeGreaterThan(0);
    }
  });
});
