import { describe, expect, it } from '@jest/globals';
import { RecommendationEngine } from '../../src/policy/simulation/recommendationEngine.js';
import { SimulationRunResult } from '../../src/policy/simulation/report.js';

function makeRun(overrides?: Partial<SimulationRunResult>): SimulationRunResult {
  return {
    suite: 'security_evals',
    mode: 'baseline',
    passed: true,
    summary: {
      scenarioPassRate: 1,
      denyDeltaByCategory: {},
      falsePositiveIndicators: [],
      securityPositiveIndicators: [],
    },
    results: { scenarios: [], anomalies: [] },
    deltas: { scenarios: [], anomalies: [] },
    ...overrides,
  };
}

describe('RecommendationEngine', () => {
  it('rejects when must-pass scenarios fail', () => {
    const engine = new RecommendationEngine({ mustPassScenarioIds: ['ANALYTICS-001'] });
    const baseline = [makeRun()];
    const proposed = [
      makeRun({
        mode: 'proposed',
        results: {
          scenarios: [
            {
              id: 'ANALYTICS-001',
              suite: 'security_evals',
              expectedOutcome: 'deny',
              outcome: 'allow',
              passed: false,
              category: 'cross-tenant',
            },
          ],
          anomalies: [],
        },
      }),
    ];

    const result = engine.recommend({ baselineRuns: baseline, proposedRuns: proposed });
    expect(result.decision).toBe('reject');
  });

  it('flags review when flips exceed threshold', () => {
    const engine = new RecommendationEngine({
      maxOutcomeFlipsBeforeReview: 1,
      mustPassScenarioIds: [],
    });
    const baseline = [makeRun()];
    const proposed = [
      makeRun({
        mode: 'proposed',
        deltas: {
          scenarios: [
            {
              id: 'X',
              suite: 'security_evals',
              previousOutcome: 'deny',
              currentOutcome: 'allow',
            },
            {
              id: 'Y',
              suite: 'security_evals',
              previousOutcome: 'deny',
              currentOutcome: 'allow',
            },
          ],
          anomalies: [],
        },
      }),
    ];

    const result = engine.recommend({ baselineRuns: baseline, proposedRuns: proposed });
    expect(result.decision).toBe('needs_review');
  });
});
