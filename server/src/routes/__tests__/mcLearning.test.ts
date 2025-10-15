import express from 'express';
import request from 'supertest';

import {
  AdaptiveStrategyLoop,
  GovernanceGate,
  MissionControlSimulationLab,
  MCLearningModuleService,
  PatternIntelligenceFabric,
  StrategyDefinition,
  TelemetryPipeline,
} from '../../services/MCLearningModuleService';
import { createMCLearningRouter } from '../mcLearning';

describe('MC Learning API', () => {
  const random = () => 0.33;
  let app: express.Express;
  let service: MCLearningModuleService;

  beforeEach(() => {
    const pattern = new PatternIntelligenceFabric();
    const loop = new AdaptiveStrategyLoop(random, 0.12);
    const lab = new MissionControlSimulationLab(random);
    const gate = new GovernanceGate({
      maxRisk: 0.8,
      maxCost: 0.9,
      minConfidence: 0.3,
      requiredTags: ['mission-control'],
      minQuality: 0.5,
    });
    const telemetry = new TelemetryPipeline();
    service = new MCLearningModuleService(pattern, loop, lab, gate, telemetry);

    const router = createMCLearningRouter({ service });
    app = express();
    app.use(express.json());
    app.use('/api/mc-learning', router);

    const now = new Date();
    const domains = [
      { domain: 'graph', payload: { activity: 0.7 } },
      { domain: 'temporal', payload: { cadence: 0.5 } },
      { domain: 'behavioral', payload: { engagement: 0.65 } },
      { domain: 'cost', payload: { burn: 0.4 } },
      { domain: 'quality', payload: { success: 0.9 } },
    ] as const;

    domains.forEach((entry, idx) => {
      service.ingestSignal({
        domain: entry.domain,
        source: `${entry.domain}-sensor`,
        timestamp: new Date(now.getTime() - (idx + 1) * 1000),
        reliability: 0.9,
        payload: entry.payload as Record<string, number>,
      });
    });

    const strategies: StrategyDefinition[] = [
      {
        id: 'mission-baseline',
        name: 'Mission Baseline',
        featureWeights: {
          'graph.activity': 0.5,
          'temporal.cadence': 0.2,
          'meta.domainCoverage': 0.15,
        },
        riskTolerance: 0.6,
        costSensitivity: 0.3,
        governanceTags: ['mission-control'],
        baselineReward: 0.55,
      },
      {
        id: 'mission-expansion',
        name: 'Mission Expansion',
        featureWeights: {
          'quality.success': 0.4,
          'behavioral.engagement': 0.35,
          'meta.domainCoverage': 0.2,
        },
        riskTolerance: 0.7,
        costSensitivity: 0.4,
        governanceTags: ['mission-control'],
        baselineReward: 0.5,
      },
    ];

    strategies.forEach((strategy) => service.registerStrategy(strategy));
  });

  it('ingests signals and evaluates strategies', async () => {
    const signalResponse = await request(app)
      .post('/api/mc-learning/signals')
      .send({
        domain: 'communications',
        source: 'uplink',
        timestamp: new Date().toISOString(),
        reliability: 0.86,
        payload: { chatter: 0.5 },
      });

    expect(signalResponse.status).toBe(202);
    expect(signalResponse.body.vector.domain).toBe('communications');

    const evaluationResponse = await request(app)
      .post('/api/mc-learning/strategies/evaluate')
      .send({
        context: {
          missionProfile: 'lunar-handoff',
          riskTolerance: 0.6,
          costSensitivity: 0.4,
          tempo: 'balanced',
          prioritySignals: ['graph.activity'],
        },
        options: {
          topK: 2,
          scenario: {
            id: 'scenario-1',
            name: 'Lunar Transfer',
            durationHours: 4,
            environment: {
              volatility: 0.4,
              adversarySkill: 0.2,
              supportLevel: 0.8,
            },
            objectives: ['continuity'],
          },
        },
      });

    expect(evaluationResponse.status).toBe(200);
    expect(evaluationResponse.body.recommendations).toHaveLength(2);
    expect(evaluationResponse.body.simulation).toHaveLength(2);
  });

  it('returns strategy diagnostics and supports filtering by id', async () => {
    const evaluation = await request(app)
      .post('/api/mc-learning/strategies/evaluate')
      .send({
        context: {
          missionProfile: 'deep-space',
          riskTolerance: 0.6,
          costSensitivity: 0.3,
          tempo: 'balanced',
        },
      });

    const strategyId = evaluation.body.recommendations[0].id;

    const diagnostics = await request(app).get('/api/mc-learning/strategies');
    expect(diagnostics.status).toBe(200);
    expect(diagnostics.body.strategies.length).toBeGreaterThanOrEqual(2);
    expect(diagnostics.body.strategies[0]).toHaveProperty('winRate');

    const filtered = await request(app)
      .get('/api/mc-learning/strategies')
      .query({ id: strategyId });
    expect(filtered.status).toBe(200);
    expect(filtered.body.strategies).toHaveLength(1);
    expect(filtered.body.strategies[0].id).toBe(strategyId);

    const missing = await request(app)
      .get('/api/mc-learning/strategies')
      .query({ id: 'unknown-strategy' });
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('strategy_not_found');
  });

  it('records feedback, approves deployment, and exposes telemetry', async () => {
    const evaluation = await request(app)
      .post('/api/mc-learning/strategies/evaluate')
      .send({
        context: {
          missionProfile: 'orbital-maintenance',
          riskTolerance: 0.55,
          costSensitivity: 0.35,
          tempo: 'balanced',
        },
      });

    const strategyId = evaluation.body.recommendations[0].id;

    const feedback = await request(app)
      .post('/api/mc-learning/strategies/feedback')
      .send({
        strategyId,
        reward: 0.65,
        success: true,
        metrics: {
          cost: 0.5,
          risk: 0.45,
          quality: 0.78,
          confidence: 0.7,
        },
      });

    expect(feedback.status).toBe(200);

    const deploy = await request(app)
      .post('/api/mc-learning/strategies/deploy')
      .send({
        strategyId,
        metrics: {
          cost: 0.55,
          risk: 0.5,
          quality: 0.8,
          confidence: 0.72,
        },
        context: {
          missionProfile: 'orbital-maintenance',
          riskTolerance: 0.55,
          costSensitivity: 0.35,
          tempo: 'balanced',
        },
      });

    expect([200, 403]).toContain(deploy.status);
    expect(deploy.body).toHaveProperty('metrics');

    const telemetry = await request(app).get('/api/mc-learning/telemetry');
    expect(telemetry.status).toBe(200);
    expect(
      telemetry.body.counts['strategy.recommendation'],
    ).toBeGreaterThanOrEqual(1);

    const audit = await request(app).get('/api/mc-learning/governance/audit');
    expect(audit.status).toBe(200);
    expect(Array.isArray(audit.body.audit)).toBe(true);
  });

  it('prevents invalid payloads', async () => {
    const response = await request(app)
      .post('/api/mc-learning/signals')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_failed');

    const deployResponse = await request(app)
      .post('/api/mc-learning/strategies/deploy')
      .send({ strategyId: 'missing' });
    expect(deployResponse.status).toBe(400);
  });
});
