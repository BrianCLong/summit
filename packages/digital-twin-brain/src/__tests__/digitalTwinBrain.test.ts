import {
  ComplianceAgent,
  DiagnosticsAgent,
  FeatureStore,
  Modality,
  OnlineLearner,
  OperationsCopilot,
  OptimizationAgent,
  PolicyEngine,
  SimulationSandbox,
  TwinGraph,
  type Constraint,
} from '../index.js';

const modality: Modality = 'sensor';

const buildSandbox = () => {
  return new SimulationSandbox((proposal, state) => {
    const loadShift = (proposal.payload.loadAdjustment as number) ?? 0;
    const projectedThroughput = state.throughput + loadShift * 10;
    const projectedEnergy = state.energyUse - loadShift * 5;
    const uncertainty = Math.max(0.05, Math.abs(loadShift) * 0.2);
    return {
      proposalId: proposal.id,
      projectedKpis: {
        throughput: projectedThroughput,
        energyUse: projectedEnergy,
      },
      uncertainty,
    };
  });
};

describe('digital twin brain orchestration', () => {
  const featureStore = new FeatureStore();
  const graph = new TwinGraph();
  graph.upsertNode({ id: 'pump-1', type: 'pump', attributes: { site: 'alpha' } });
  graph.upsertNode({ id: 'sensor-11', type: 'sensor', attributes: { axis: 'vibration' } });
  graph.upsertEdge({ id: 'e1', source: 'pump-1', target: 'sensor-11', type: 'depends_on', attributes: {} });

  const baselineSamples = [18, 18.5, 19, 18.2, 19.1];
  baselineSamples.forEach((value, idx) => {
    featureStore.ingest({
      assetId: 'pump-1',
      modality,
      timestamp: new Date(Date.now() - (baselineSamples.length - idx) * 1000),
      features: { temperature: value, pressure: 30 + idx },
      context: { source: 'baseline' },
    });
  });

  const onlineLearner = new OnlineLearner(featureStore);
  const diagnostics = new DiagnosticsAgent(featureStore, graph);

  const constraints: Constraint[] = [
    {
      id: 'safe-load-window',
      description: 'Do not reduce load below 10%.',
      severity: 'error',
      predicate: (proposal) => (proposal.payload.loadAdjustment as number) >= -0.1,
    },
    {
      id: 'limit-step-change',
      description: 'Avoid step changes above 35% to protect equipment.',
      severity: 'warning',
      predicate: (proposal) => Math.abs((proposal.payload.loadAdjustment as number) ?? 0) <= 0.35,
    },
  ];

  const sandbox = buildSandbox();
  const policyEngine = new PolicyEngine(sandbox, {
    objectiveWeights: { throughput: 1.0, energyUse: -0.5 },
    riskTolerance: 0.4,
    constraints,
  });
  const optimizer = new OptimizationAgent(policyEngine, sandbox);
  const compliance = new ComplianceAgent(constraints);
  const copilot = new OperationsCopilot(diagnostics, optimizer, compliance, onlineLearner);

  it('detects drift, flags anomaly, and recommends a compliant action', () => {
    featureStore.ingest({
      assetId: 'pump-1',
      modality,
      timestamp: new Date(),
      features: { temperature: 26.4, pressure: 38 },
      context: { source: 'live' },
    });

    const recommendation = copilot.triage(
      'pump-1',
      modality,
      [
        { description: 'Reduce load by 5%', loadAdjustment: -0.05 },
        { description: 'Increase load by 20%', loadAdjustment: 0.2 },
      ],
      { throughput: 100, energyUse: 50 }
    );

    expect(recommendation.summary).toContain('Top action:');
    expect(recommendation.summary).toContain('Compliant');
    expect(recommendation.diagnostics?.[0]).toContain('Observed');
    expect(recommendation.drift?.driftMagnitude).toBeGreaterThan(0);
  });

  it('blocks actions that violate hard constraints', () => {
    featureStore.ingest({
      assetId: 'pump-1',
      modality,
      timestamp: new Date(),
      features: { temperature: 27.8, pressure: 42 },
      context: { source: 'live' },
    });

    const recommendation = copilot.triage(
      'pump-1',
      modality,
      [
        { description: 'Reduce load by 50%', loadAdjustment: -0.5 },
        { description: 'Reduce load by 20%', loadAdjustment: -0.2 },
      ],
      { throughput: 100, energyUse: 50 }
    );

    expect(recommendation.summary).toContain('Blocked');
  });
});
