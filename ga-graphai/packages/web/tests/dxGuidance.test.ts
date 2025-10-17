import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeveloperExperienceGuide } from '../src/dx-guidance.js';
import { GuardedPolicyGateway, PolicyEngine } from '@ga-graphai/policy';
import {
  OrchestrationKnowledgeGraph,
  type ServiceConnector,
  type EnvironmentConnector,
  type PipelineConnector,
} from '@ga-graphai/knowledge-graph';
import type { PolicyEvaluationRequest, PolicyRule } from 'common-types';

const allowRule: PolicyRule = {
  id: 'allow-deploy',
  description: 'Allow deploy',
  effect: 'allow',
  actions: ['orchestration.deploy'],
  resources: ['service:svc-api'],
  conditions: [],
  obligations: [],
};

const actor: PolicyEvaluationRequest['context'] = {
  tenantId: 'tenant',
  userId: 'dev',
  roles: ['developer'],
};

describe('DeveloperExperienceGuide', () => {
  let knowledgeGraph: OrchestrationKnowledgeGraph;
  let guide: DeveloperExperienceGuide;

  beforeEach(async () => {
    knowledgeGraph = new OrchestrationKnowledgeGraph();
    const serviceConnector: ServiceConnector = {
      loadServices: vi.fn().mockResolvedValue([
        { id: 'svc-api', name: 'API' },
      ]),
    };
    const environmentConnector: EnvironmentConnector = {
      loadEnvironments: vi.fn().mockResolvedValue([
        { id: 'env-prod', name: 'Prod', stage: 'prod', region: 'us-east-1' },
      ]),
    };
    const pipelineConnector: PipelineConnector = {
      loadPipelines: vi.fn().mockResolvedValue([
        {
          id: 'pipe-1',
          name: 'Deploy',
          stages: [
            {
              id: 'stage-1',
              name: 'Deploy',
              pipelineId: 'pipe-1',
              serviceId: 'svc-api',
              environmentId: 'env-prod',
              capability: 'deploy',
            },
          ],
        },
      ]),
    };
    knowledgeGraph.registerServiceConnector(serviceConnector);
    knowledgeGraph.registerEnvironmentConnector(environmentConnector);
    knowledgeGraph.registerPipelineConnector(pipelineConnector);
    await knowledgeGraph.refresh();

    const policyEngine = new PolicyEngine([allowRule]);
    const policyGateway = new GuardedPolicyGateway({ engine: policyEngine, riskThreshold: 0.8 });
    guide = new DeveloperExperienceGuide({ knowledgeGraph, policyGateway });
  });

  it('recommends golden path with guardrails', () => {
    const recommendation = guide.recommendGoldenPath('svc-api', 'feature-dev', {
      actor,
      guardContext: { riskScore: 0.2 },
    });

    expect(recommendation).toBeDefined();
    expect(recommendation?.steps.length).toBeGreaterThan(0);
    expect(recommendation?.guardrails.requiresApproval).toBe(false);
  });

  it('aggregates telemetry metrics', () => {
    guide.recordEvent({
      id: '1',
      persona: 'feature-dev',
      channel: 'cli',
      command: 'deploy',
      durationMs: 1200,
      success: true,
      satisfactionScore: 4.5,
      timestamp: new Date().toISOString(),
    });
    guide.recordEvent({
      id: '2',
      persona: 'feature-dev',
      channel: 'ui',
      command: 'rollback',
      durationMs: 800,
      success: false,
      frictionTags: ['policy-block'],
      timestamp: new Date().toISOString(),
    });

    const summary = guide.telemetrySummary();
    expect(summary.totalEvents).toBe(2);
    expect(summary.successRate).toBeCloseTo(0.5, 1);
    expect(summary.averageSatisfaction).toBeGreaterThan(0);
    expect(summary.frictionHotspots['policy-block']).toBe(1);
  });
});
