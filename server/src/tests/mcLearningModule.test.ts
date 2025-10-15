import {
  AdaptiveStrategyLoop,
  GovernanceGate,
  MissionControlSimulationLab,
  MCLearningModuleService,
  PatternIntelligenceFabric,
  StrategyContext,
  StrategyDefinition,
  StrategyFeedback,
  TelemetryPipeline,
} from '../services/MCLearningModuleService';

describe('MC Learning Module Service', () => {
  const random = () => 0.42;
  let service: MCLearningModuleService;
  let context: StrategyContext;

  beforeEach(() => {
    const pattern = new PatternIntelligenceFabric();
    const loop = new AdaptiveStrategyLoop(random, 0.15);
    const lab = new MissionControlSimulationLab(random);
    const gate = new GovernanceGate({
      maxRisk: 0.75,
      maxCost: 0.85,
      minConfidence: 0.35,
      requiredTags: ['mission-control'],
      minQuality: 0.55,
    });
    const telemetry = new TelemetryPipeline();
    service = new MCLearningModuleService(pattern, loop, lab, gate, telemetry);

    context = {
      missionProfile: 'orbital-resupply',
      riskTolerance: 0.55,
      costSensitivity: 0.4,
      tempo: 'balanced',
      prioritySignals: ['graph.activity', 'behavioral.engagement'],
    };

    const now = new Date();
    const signals = [
      {
        domain: 'graph' as const,
        source: 'graph-hub',
        timestamp: new Date(now.getTime() - 60_000),
        reliability: 0.9,
        payload: { activity: 0.8, centrality: 0.7 },
      },
      {
        domain: 'temporal' as const,
        source: 'mission-clock',
        timestamp: new Date(now.getTime() - 45_000),
        reliability: 0.85,
        payload: { cadence: 0.6, surge: 0.2 },
      },
      {
        domain: 'behavioral' as const,
        source: 'behavioral-analytics',
        timestamp: new Date(now.getTime() - 30_000),
        reliability: 0.88,
        payload: { engagement: 0.75, fatigue: 0.25 },
      },
      {
        domain: 'cost' as const,
        source: 'finops',
        timestamp: new Date(now.getTime() - 15_000),
        reliability: 0.92,
        payload: { burn: 0.45, efficiency: 0.68 },
      },
      {
        domain: 'quality' as const,
        source: 'qa',
        timestamp: now,
        reliability: 0.93,
        payload: { missionSuccess: 0.82, anomalyRate: 0.1 },
      },
    ];

    for (const signal of signals) {
      service.ingestSignal(signal);
    }

    const strategies: StrategyDefinition[] = [
      {
        id: 'baseline-mission',
        name: 'Baseline Mission Control',
        featureWeights: {
          'graph.activity': 0.4,
          'temporal.cadence': 0.25,
          'behavioral.engagement': 0.35,
          'meta.domainCoverage': 0.2,
        },
        riskTolerance: 0.55,
        costSensitivity: 0.45,
        governanceTags: ['mission-control', 'baseline'],
        baselineReward: 0.5,
        description: 'Steady baseline strategy for mission operations',
      },
      {
        id: 'adaptive-boost',
        name: 'Adaptive Boost',
        featureWeights: {
          'graph.centrality': 0.35,
          'temporal.surge': -0.15,
          'quality.missionSuccess': 0.4,
          'meta.domainCoverage': 0.15,
        },
        riskTolerance: 0.65,
        costSensitivity: 0.35,
        governanceTags: ['mission-control', 'adaptive'],
        baselineReward: 0.6,
      },
    ];

    for (const strategy of strategies) {
      service.registerStrategy(strategy);
    }
  });

  test('aggregates signals into unified pattern fabric', () => {
    const fabric = service.getPatternFabric();
    const features = fabric.getUnifiedFeatureVector();

    expect(features['meta.domainCoverage']).toBeGreaterThanOrEqual(5);
    expect(features['meta.averageReliability']).toBeGreaterThan(0.8);
    expect(features['graph.activity']).toBeDefined();
    expect(features['behavioral.engagement']).toBeDefined();
  });

  test('produces adaptive recommendations and simulation projections', () => {
    const evaluation = service.evaluateStrategies(context, {
      topK: 2,
      scenario: {
        id: 'sim-1',
        name: 'Resupply Stress Test',
        durationHours: 6,
        environment: {
          volatility: 0.35,
          adversarySkill: 0.3,
          supportLevel: 0.7,
        },
        objectives: ['stability', 'cost-balance'],
      },
    });

    expect(evaluation.recommendations).toHaveLength(2);
    const primary = evaluation.recommendations[0];
    expect(primary.rationale[0]).toContain('Score');
    expect(primary.origin).toBe('portfolio');
    expect(primary.expectedOutcomes.quality).toBeGreaterThan(0.5);

    expect(evaluation.simulation).toBeDefined();
    expect(evaluation.simulation).toHaveLength(2);
    expect(evaluation.simulation?.[0].summary).toContain(
      'Resupply Stress Test',
    );
  });

  test('adapts strategy weights through feedback and governance decisions', () => {
    const initial = service.evaluateStrategies(context, { topK: 2 });
    const targetId = initial.recommendations[0].id;

    const feedback: StrategyFeedback = {
      strategyId: targetId,
      reward: 0.72,
      success: true,
      metrics: {
        cost: 0.48,
        risk: 0.42,
        quality: 0.81,
        confidence: 0.76,
      },
      notes: 'Achieved mission KPIs above threshold',
    };

    service.submitFeedback(feedback);

    const strategiesAfterFeedback = service.listStrategies();
    expect(strategiesAfterFeedback.length).toBeGreaterThanOrEqual(2);

    const approval = service.requestDeployment(
      targetId,
      feedback.metrics,
      context,
    );
    expect(approval.approved).toBe(true);
    expect(approval.metrics.complianceScore).toBeGreaterThan(0.5);

    const rejection = service.requestDeployment(
      targetId,
      {
        cost: 0.95,
        risk: 0.96,
        quality: 0.4,
        confidence: 0.3,
      },
      context,
    );
    expect(rejection.approved).toBe(false);
    expect(rejection.reasons.length).toBeGreaterThanOrEqual(1);

    const auditTrail = service.getGovernanceAudit();
    expect(auditTrail.length).toBeGreaterThanOrEqual(2);
    expect(auditTrail[0]).toHaveProperty('timestamp');

    const snapshot = service.getTelemetrySnapshot();
    expect(snapshot.counts['signal.ingested']).toBeGreaterThanOrEqual(5);
    expect(snapshot.counts['strategy.feedback.success']).toBe(1);
    expect(snapshot.signalsPerDomain.graph).toBeGreaterThanOrEqual(1);
  });

  test('exposes strategy diagnostics with win rates and telemetry updates', () => {
    const [first, second] = service.evaluateStrategies(context, { topK: 2 })
      .recommendations;

    service.submitFeedback({
      strategyId: first.id,
      reward: 0.6,
      success: true,
      metrics: { cost: 0.5, risk: 0.4, quality: 0.75, confidence: 0.7 },
    });

    service.submitFeedback({
      strategyId: second.id,
      reward: -0.2,
      success: false,
      metrics: { cost: 0.8, risk: 0.7, quality: 0.45, confidence: 0.35 },
    });

    const allDiagnostics = service.getStrategyDiagnostics();
    expect(allDiagnostics.length).toBeGreaterThanOrEqual(2);

    const primary = allDiagnostics.find((entry) => entry.id === first.id);
    expect(primary).toBeDefined();
    expect(primary?.wins).toBe(1);
    expect(primary?.trials).toBe(1);
    expect(primary?.winRate).toBeCloseTo(1, 5);
    expect(primary?.definition.featureWeights['graph.activity']).toBeDefined();

    const filtered = service.getStrategyDiagnostics(second.id);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(second.id);
    expect(filtered[0].winRate).toBeCloseTo(0, 5);

    const snapshot = service.getTelemetrySnapshot();
    expect(snapshot.counts['strategy.diagnostics.requested']).toBe(2);
  });
});
