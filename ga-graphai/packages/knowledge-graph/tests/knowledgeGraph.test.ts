import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  OrchestrationKnowledgeGraph,
  type PipelineConnector,
  type PipelineRecord,
  type ServiceConnector,
  type ServiceRecord,
  type EnvironmentConnector,
  type EnvironmentRecord,
  type IncidentConnector,
  type IncidentRecord,
  type PolicyConnector,
  type CostSignalConnector,
} from '../src/index.js';
import type { PolicyRule } from '@ga-graphai/common-types';

describe('OrchestrationKnowledgeGraph', () => {
  let graph: OrchestrationKnowledgeGraph;
  let pipelineConnector: PipelineConnector;
  let serviceConnector: ServiceConnector;
  let environmentConnector: EnvironmentConnector;
  let incidentConnector: IncidentConnector;
  let policyConnector: PolicyConnector;
  let costConnector: CostSignalConnector;

  beforeEach(() => {
    graph = new OrchestrationKnowledgeGraph();
    pipelineConnector = {
      loadPipelines: vi.fn<[], Promise<PipelineRecord[]>>().mockResolvedValue([
        {
          id: 'pipeline-a',
          name: 'Primary Deploy',
          stages: [
            {
              id: 'stage-a1',
              name: 'Build',
              pipelineId: 'pipeline-a',
              serviceId: 'svc-api',
              environmentId: 'env-prod',
              capability: 'build',
              guardrails: { maxErrorRate: 0.02 },
            },
          ],
        },
      ]),
    };
    serviceConnector = {
      loadServices: vi
        .fn<[], Promise<ServiceRecord[]>>()
        .mockResolvedValue([
          {
            id: 'svc-api',
            name: 'API',
            tier: 'tier-0',
            dependencies: ['svc-db'],
            soxCritical: true,
          },
          {
            id: 'svc-db',
            name: 'Database',
            tier: 'tier-0',
          },
        ]),
    };
    environmentConnector = {
      loadEnvironments: vi
        .fn<[], Promise<EnvironmentRecord[]>>()
        .mockResolvedValue([
          {
            id: 'env-prod',
            name: 'Production',
            stage: 'prod',
            region: 'us-west-2',
          },
        ]),
    };
    incidentConnector = {
      loadIncidents: vi
        .fn<[], Promise<IncidentRecord[]>>()
        .mockResolvedValue([
          {
            id: 'incident-1',
            serviceId: 'svc-api',
            environmentId: 'env-prod',
            severity: 'high',
            occurredAt: new Date('2024-03-20T10:00:00Z').toISOString(),
            status: 'open',
          },
          {
            id: 'incident-2',
            serviceId: 'svc-api',
            environmentId: 'env-prod',
            severity: 'medium',
            occurredAt: new Date('2024-03-18T10:00:00Z').toISOString(),
            status: 'closed',
          },
        ]),
    };
    policyConnector = {
      loadPolicies: vi.fn<[], Promise<PolicyRule[]>>().mockResolvedValue([
        {
          id: 'policy-1',
          description: 'PII guardrail',
          effect: 'allow',
          actions: ['deploy'],
          resources: ['service:svc-api'],
          conditions: [],
          obligations: [],
          tags: ['high-risk'],
        },
      ]),
    };
    costConnector = {
      loadCostSignals: vi.fn().mockResolvedValue([
        {
          serviceId: 'svc-api',
          timeBucket: '2024-03-20T10',
          saturation: 0.9,
          budgetBreaches: 2,
          throttleCount: 1,
          slowQueryCount: 0,
        },
      ]),
    };

    graph.registerPipelineConnector(pipelineConnector);
    graph.registerServiceConnector(serviceConnector);
    graph.registerEnvironmentConnector(environmentConnector);
    graph.registerIncidentConnector(incidentConnector);
    graph.registerPolicyConnector(policyConnector);
    graph.registerCostSignalConnector(costConnector);
  });

  it('builds nodes and relationships with risk scoring', async () => {
    const snapshot = await graph.refresh();

    expect(snapshot.nodes.find((node) => node.id === 'service:svc-api')).toBeDefined();
    expect(snapshot.nodes.find((node) => node.id === 'pipeline:pipeline-a')).toBeDefined();
    expect(snapshot.edges.find((edge) => edge.id === 'pipeline:pipeline-a:CONTAINS:stage:stage-a1')).toBeDefined();
    expect(snapshot.edges.find((edge) => edge.id === 'stage:stage-a1:TARGETS:service:svc-api')).toBeDefined();
    expect(snapshot.edges.find((edge) => edge.id === 'incident:incident-1:AFFECTS:service:svc-api')).toBeDefined();

    const risk = snapshot.serviceRisk['svc-api'];
    expect(risk.score).toBeGreaterThan(0.3);
    expect(risk.factors.incidentLoad).toBeGreaterThan(risk.factors.costPressure * 0.5);
  });

  it('exposes service context view with incidents and policies', async () => {
    await graph.refresh();
    const context = graph.queryService('svc-api');
    expect(context?.service?.name).toBe('API');
    expect(context?.incidents).toHaveLength(2);
    expect(context?.policies?.[0]?.id).toBe('policy-1');
    expect(context?.pipelines?.[0]?.id).toBe('pipeline-a');
    expect(context?.risk?.score).toBeLessThanOrEqual(1);
  });

  it('returns undefined for unknown service', () => {
    expect(graph.queryService('unknown')).toBeUndefined();
  });
});
