import { CypherSandbox } from '../../../server/src/middleware/cypher-sandbox';
import { baseScenarios, buildCorpus } from './corpus';

describe('graph guardrail fuzzing', () => {
  const iterations = parseInt(process.env.GRAPH_GUARDRAIL_FUZZ_ITERATIONS || '80', 10);
  const seed = parseInt(process.env.GRAPH_GUARDRAIL_FUZZ_SEED || '7331', 10);

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

      coverage.set(scenario.expected.reason, (coverage.get(scenario.expected.reason) || 0) + 1);
      coverage.set('TOTAL', (coverage.get('TOTAL') || 0) + 1);

      expect(result.allowed).toBe(scenario.expected.allowed);

      if (scenario.expected.allowed) {
        expect(result.reasonCodes).toContain('SAFE_READ');
      } else {
        expect(result.reasonCodes).toContain(scenario.expected.reason);
      }
    }

    for (const scenario of baseScenarios) {
      expect(coverage.has(scenario.expected.reason)).toBe(true);
    }
  });
});
