import { KnowledgeCutoffRouter } from '../router';
import { RoutingSimulator } from '../simulator';
import { RoutingConfig, SimulationQuery, RoutingError } from '../types';

const config: RoutingConfig = {
  defaultJurisdiction: 'US',
  sources: [
    {
      id: 'snapshot-global-2021',
      type: 'snapshot',
      knowledgeCutoff: new Date('2021-09-30T00:00:00Z'),
      validFrom: new Date('2020-01-01T00:00:00Z'),
      jurisdictions: ['*'],
      freshnessRisk: 'low',
    },
    {
      id: 'model-us-2023',
      type: 'model',
      knowledgeCutoff: new Date('2023-11-30T00:00:00Z'),
      validFrom: new Date('2023-01-01T00:00:00Z'),
      jurisdictions: ['US'],
      freshnessRisk: 'medium',
    },
    {
      id: 'snapshot-us-2024-safe',
      type: 'snapshot',
      knowledgeCutoff: new Date('2024-05-15T00:00:00Z'),
      validFrom: new Date('2023-08-01T00:00:00Z'),
      jurisdictions: ['US'],
      freshnessRisk: 'low',
    },
    {
      id: 'model-us-2024-fast',
      type: 'model',
      knowledgeCutoff: new Date('2024-06-01T00:00:00Z'),
      validFrom: new Date('2024-01-01T00:00:00Z'),
      jurisdictions: ['US'],
      freshnessRisk: 'high',
    },
    {
      id: 'model-us-2024-future',
      type: 'model',
      knowledgeCutoff: new Date('2024-09-01T00:00:00Z'),
      validFrom: new Date('2024-07-01T00:00:00Z'),
      jurisdictions: ['US'],
      freshnessRisk: 'medium',
    },
    {
      id: 'snapshot-eu-2024',
      type: 'snapshot',
      knowledgeCutoff: new Date('2024-01-10T00:00:00Z'),
      validFrom: new Date('2023-06-01T00:00:00Z'),
      jurisdictions: ['EU'],
      freshnessRisk: 'low',
    },
  ],
};

describe('KnowledgeCutoffRouter', () => {
  const router = new KnowledgeCutoffRouter(config);

  it('routes labeled queries to their expected sources', () => {
    const simulator = new RoutingSimulator(router);
    const queries: SimulationQuery[] = [
      {
        id: 'q1',
        requestedDate: new Date('2024-03-01T00:00:00Z'),
        jurisdiction: 'US',
        expectedSourceId: 'model-us-2023',
      },
      {
        id: 'q2',
        requestedDate: new Date('2024-06-15T00:00:00Z'),
        jurisdiction: 'US',
        expectedSourceId: 'snapshot-us-2024-safe',
      },
      {
        id: 'q3',
        requestedDate: new Date('2024-06-15T00:00:00Z'),
        jurisdiction: 'US',
        riskTolerance: 'high',
        expectedSourceId: 'model-us-2024-fast',
      },
      {
        id: 'q4',
        requestedDate: new Date('2024-02-01T00:00:00Z'),
        jurisdiction: 'EU',
        expectedSourceId: 'snapshot-eu-2024',
      },
      {
        id: 'q5',
        requestedDate: new Date('2021-11-01T00:00:00Z'),
        jurisdiction: 'US',
        expectedSourceId: 'snapshot-global-2021',
      },
    ];

    const summary = simulator.run(queries);

    expect(summary.correct).toBe(5);
    expect(summary.incorrect).toBe(0);
    expect(summary.total).toBe(5);
  });

  it('prevents leakage from post-cutoff sources by falling back to older knowledge', () => {
    const decision = router.route({
      requestedDate: new Date('2024-06-15T00:00:00Z'),
      jurisdiction: 'US',
    });

    expect(decision.source.id).toBe('snapshot-us-2024-safe');
    expect(decision.source.knowledgeCutoff.getTime()).toBeLessThanOrEqual(
      new Date('2024-06-15T00:00:00Z').getTime(),
    );
    expect(decision.source.id).not.toBe('model-us-2024-future');
  });

  it('rejects routing when no jurisdiction matches and no default is provided', () => {
    const isolated = new KnowledgeCutoffRouter({ sources: config.sources });

    expect(() =>
      isolated.route({
        requestedDate: new Date('2024-03-01T00:00:00Z'),
        jurisdiction: 'APAC',
      }),
    ).toThrow(RoutingError);
  });
});

describe('RoutingSimulator', () => {
  it('produces deterministic outcomes for the same inputs', () => {
    const router = new KnowledgeCutoffRouter(config);
    const simulator = new RoutingSimulator(router);
    const queries: SimulationQuery[] = [
      {
        id: 'q-risk-medium',
        requestedDate: new Date('2024-06-15T00:00:00Z'),
        jurisdiction: 'US',
      },
      {
        id: 'q-risk-high',
        requestedDate: new Date('2024-06-15T00:00:00Z'),
        jurisdiction: 'US',
        riskTolerance: 'high',
      },
    ];

    const firstRun = simulator.run(queries);
    const secondRun = simulator.run(queries);

    expect(firstRun).toEqual(secondRun);
    expect(JSON.stringify(firstRun)).toBe(JSON.stringify(secondRun));
  });
});
