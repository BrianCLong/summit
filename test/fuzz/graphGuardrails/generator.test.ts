import { baseScenarios, buildCorpus, createSeededRng, mutateQuery } from './corpus';

describe('graph guardrail corpus generator', () => {
  it('is deterministic given the same seed', () => {
    const first = buildCorpus(1234, 10).map((item) => item.mutatedQuery);
    const second = buildCorpus(1234, 10).map((item) => item.mutatedQuery);

    expect(second).toEqual(first);
  });

  it('covers every scenario class within a single corpus', () => {
    const corpus = buildCorpus(99, baseScenarios.length * 2);
    const reasons = new Set(corpus.map((item) => item.expected.reason));

    for (const scenario of baseScenarios) {
      expect(reasons.has(scenario.expected.reason)).toBe(true);
    }
  });

  it('mutation keeps core structure intact', () => {
    const rng = createSeededRng(5);
    const sample = baseScenarios[0].query;
    const mutated = mutateQuery(sample, rng);

    expect(mutated.toLowerCase()).toContain('match');
    expect(mutated.toLowerCase()).toContain('return');
  });
});
