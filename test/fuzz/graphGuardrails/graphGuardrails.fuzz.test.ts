import { CypherSandbox } from '../../../server/src/middleware/cypher-sandbox';
import { baseScenarios, buildCorpus } from './corpus';

describe('graph guardrail fuzzing', () => {
  const MAX_ITERATIONS = 200;
  const iterations = Math.min(
    Math.max(parseInt(process.env.GRAPH_GUARDRAIL_FUZZ_ITERATIONS || '80', 10), 1),
    MAX_ITERATIONS,
  );
  const seed = Number.isInteger(Number(process.env.GRAPH_GUARDRAIL_FUZZ_SEED))
    ? Number(process.env.GRAPH_GUARDRAIL_FUZZ_SEED)
    : 7331;

  it('blocks unsafe patterns and allows safe reads with coverage by reason code', () => {
    const sandbox = new CypherSandbox();
    const corpus = buildCorpus(seed, iterations);

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
