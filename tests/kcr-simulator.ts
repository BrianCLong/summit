import assert from 'node:assert/strict';
import { KnowledgeCutoffRouter, RoutingSimulator, SimulationQuery } from '../src/kcr/index';
import { RoutingConfig } from '../src/kcr/types';

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

const router = new KnowledgeCutoffRouter(config);
const simulator = new RoutingSimulator(router);

const labeledQueries: SimulationQuery[] = [
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

const summary = simulator.run(labeledQueries);

assert.equal(summary.correct, 5, 'all labeled queries should match expected sources');
assert.equal(summary.incorrect, 0, 'no mismatches expected');
assert.equal(summary.total, labeledQueries.length, 'total count should match input size');

const fallbackDecision = router.route({
  requestedDate: new Date('2024-06-15T00:00:00Z'),
  jurisdiction: 'US',
});

assert.equal(
  fallbackDecision.source.id,
  'snapshot-us-2024-safe',
  'router should fall back to the freshest permissible snapshot when risk tolerance is medium',
);
assert.ok(
  fallbackDecision.source.knowledgeCutoff.getTime() <=
    new Date('2024-06-15T00:00:00Z').getTime(),
  'router must never select knowledge after the requested date',
);

const deterministicFirst = simulator.run(labeledQueries);
const deterministicSecond = simulator.run(labeledQueries);

assert.deepEqual(
  deterministicFirst,
  deterministicSecond,
  'simulator should be deterministic for identical inputs',
);

console.log('KCR simulator tests passed');
