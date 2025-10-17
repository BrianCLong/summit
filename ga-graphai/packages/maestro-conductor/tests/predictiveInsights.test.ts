import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PredictiveInsightEngine } from '../src/predictive-insights.js';
import { CostGuard } from '@ga-graphai/cost-guard';
import {
  OrchestrationKnowledgeGraph,
  type ServiceConnector,
  type PipelineConnector,
  type EnvironmentConnector,
  type IncidentConnector,
  type PolicyConnector,
} from '@ga-graphai/knowledge-graph';
import type { HealthSignal } from '../src/types.js';

describe('PredictiveInsightEngine', () => {
  let knowledgeGraph: OrchestrationKnowledgeGraph;
  let costGuard: CostGuard;

  beforeEach(async () => {
    knowledgeGraph = new OrchestrationKnowledgeGraph();
    costGuard = new CostGuard();
    const serviceConnector: ServiceConnector = {
      loadServices: vi.fn().mockResolvedValue([
        { id: 'svc-api', name: 'API' },
      ]),
    };
    const environmentConnector: EnvironmentConnector = {
      loadEnvironments: vi.fn().mockResolvedValue([
        { id: 'env-prod', name: 'Prod', stage: 'prod', region: 'us-west-2' },
      ]),
    };
    const pipelineConnector: PipelineConnector = {
      loadPipelines: vi.fn().mockResolvedValue([
        {
          id: 'pipeline-1',
          name: 'Deploy',
          stages: [
            {
              id: 'stage-1',
              name: 'Deploy',
              pipelineId: 'pipeline-1',
              serviceId: 'svc-api',
              environmentId: 'env-prod',
              capability: 'deploy',
            },
          ],
        },
      ]),
    };
    const incidentConnector: IncidentConnector = {
      loadIncidents: vi.fn().mockResolvedValue([
        {
          id: 'incident-open',
          serviceId: 'svc-api',
          environmentId: 'env-prod',
          severity: 'medium',
          occurredAt: new Date().toISOString(),
          status: 'open',
        },
      ]),
    };
    const policyConnector: PolicyConnector = {
      loadPolicies: vi.fn().mockResolvedValue([
        {
          id: 'policy-1',
          description: 'Baseline',
          effect: 'allow',
          actions: ['orchestration.deploy'],
          resources: ['service:svc-api'],
          conditions: [],
          obligations: [],
        },
      ]),
    };
    knowledgeGraph.registerServiceConnector(serviceConnector);
    knowledgeGraph.registerEnvironmentConnector(environmentConnector);
    knowledgeGraph.registerPipelineConnector(pipelineConnector);
    knowledgeGraph.registerIncidentConnector(incidentConnector);
    knowledgeGraph.registerPolicyConnector(policyConnector);
    await knowledgeGraph.refresh();
  });

  it('builds readiness insight blending risk and health signals', () => {
    const engine = new PredictiveInsightEngine({
      knowledgeGraph,
      costGuard,
      riskThresholds: { high: 0.6, medium: 0.35 },
    });

    const latencySignal: HealthSignal = {
      assetId: 'svc-api',
      metric: 'latency_p99',
      value: 1200,
      timestamp: new Date(),
    };
    engine.observeHealthSignal(latencySignal);

    const insight = engine.buildInsight('svc-api', 'env-prod');
    expect(insight).toBeDefined();
    expect(insight?.readinessScore).toBeLessThanOrEqual(1);
    expect(insight?.recommendations.some((rec) => rec.includes('release readiness survey'))).toBe(true);
  });

  it('returns high risk insights sorted by score', () => {
    const engine = new PredictiveInsightEngine({ knowledgeGraph, costGuard });
    const results = engine.listHighRiskInsights();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].riskScore).toBeGreaterThanOrEqual(results[results.length - 1].riskScore);
  });
});
