import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StructuredEventEmitter } from '@ga-graphai/common-types';
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
  decryptGraphNode,
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
  let eventTransport: ReturnType<typeof vi.fn>;
  let emitter: StructuredEventEmitter;

  beforeEach(() => {
    eventTransport = vi.fn();
    emitter = new StructuredEventEmitter({ transport: eventTransport });
    graph = new OrchestrationKnowledgeGraph(emitter);
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
                provenance: {
                  source: 'cicd',
                  ingress: 'api',
                  observedAt: '2024-03-18T00:00:00Z',
                  checksum: 'stage-a1-checksum',
                },
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
            provenance: {
              source: 'cmdb',
              ingress: 'database',
              observedAt: '2024-03-15T00:00:00Z',
              checksum: 'svc-api-checksum',
            },
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

  it('attaches provenance metadata across the graph for lineage dashboards', async () => {
    const snapshot = await graph.refresh();
    const serviceNode = snapshot.nodes.find((node) => node.id === 'service:svc-api');
    const depEdge = snapshot.edges.find((edge) => edge.id.includes('DEPENDS_ON'));

    expect(serviceNode?.provenance?.source).toBe('cmdb');
    expect(serviceNode?.provenance?.checksum).toBeDefined();
    expect(depEdge?.provenance?.lineage?.length).toBeGreaterThan(0);
    expect(snapshot.lineage?.nodesWithProvenance).toBe(snapshot.nodes.length);
    expect(snapshot.lineage?.missingNodes).toEqual([]);
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

  it('provides direct node lookups for GraphQL resolvers', async () => {
    await graph.refresh();

    const serviceNode = graph.getNode('service:svc-api');
    const nodes = graph.getNodes(['service:svc-api', 'pipeline:pipeline-a']);

    expect(serviceNode?.type).toBe('service');
    expect(nodes).toHaveLength(2);
    expect(nodes.every((node) => node)).toBe(true);
  });

  it('applies streaming updates and emits agent triggers', async () => {
    await graph.refresh();

    const snapshot = graph.applyUpdate({
      source: 'confluent',
      topic: 'intelgraph.updates',
      incidents: [
        {
          id: 'incident-stream',
          serviceId: 'svc-api',
          environmentId: 'env-prod',
          severity: 'critical',
          occurredAt: new Date('2024-03-21T00:00:00Z').toISOString(),
          status: 'open',
        },
      ],
      agentTriggers: [
        {
          agent: 'incident-responder',
          reason: 'critical incident detected via stream',
          priority: 'high',
          payload: { incidentId: 'incident-stream' },
        },
      ],
    });

    expect(snapshot.nodes.some((node) => node.id === 'incident:incident-stream')).toBe(true);
    expect(
      eventTransport,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'summit.intelgraph.graph.updated' }),
    );
    expect(
      eventTransport,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'summit.intelgraph.agent.triggered' }),
    );
  });

  it('emits structured telemetry for IntelGraph queries', async () => {
    await graph.refresh();
    graph.queryService('svc-api');

    expect(eventTransport).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'summit.intelgraph.query.executed' }),
    );
  });

  it('records observability signals and distributed tracing for refresh and query', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const metrics = {
      observe: vi.fn(),
      increment: vi.fn(),
    };
    const spans: { name: string; end: ReturnType<typeof vi.fn> }[] = [];
    const tracer = {
      startSpan: vi.fn((name: string) => {
        const end = vi.fn();
        const span = { name, end, recordException: vi.fn() };
        spans.push({ name, end });
        return span;
      }),
    };

    graph = new OrchestrationKnowledgeGraph(emitter, {
      logger,
      metrics,
      tracer,
    });

    graph.registerPipelineConnector(pipelineConnector);
    graph.registerServiceConnector(serviceConnector);
    graph.registerEnvironmentConnector(environmentConnector);
    graph.registerIncidentConnector(incidentConnector);
    graph.registerPolicyConnector(policyConnector);
    graph.registerCostSignalConnector(costConnector);

    await graph.refresh();
    graph.queryService('svc-api');

    expect(logger.info).toHaveBeenCalledWith(
      'intelgraph.kg.refresh.completed',
      expect.objectContaining({ nodeCount: expect.any(Number) }),
    );
    expect(metrics.observe).toHaveBeenCalledWith(
      'intelgraph_kg_refresh_duration_ms',
      expect.any(Number),
      expect.objectContaining({ namespace: 'intelgraph' }),
    );
    expect(metrics.increment).toHaveBeenCalledWith(
      'intelgraph_kg_queries_total',
      1,
      expect.objectContaining({ queryType: 'service' }),
    );
    expect(tracer.startSpan).toHaveBeenCalledWith(
      'intelgraph.kg.refresh',
      expect.objectContaining({ namespace: 'intelgraph' }),
    );
    expect(spans.some((span) => span.end.mock.calls.length > 0)).toBe(true);
  });

  it('returns undefined for unknown service', () => {
    expect(graph.queryService('unknown')).toBeUndefined();
  });

  it('isolates graph refresh when sandbox mode is enabled', async () => {
    const logger = { warn: vi.fn() };
    graph = new OrchestrationKnowledgeGraph({ sandboxMode: true, logger });

    graph.registerPipelineConnector(pipelineConnector);
    graph.registerServiceConnector(serviceConnector);
    graph.registerEnvironmentConnector(environmentConnector);
    graph.registerIncidentConnector(incidentConnector);
    graph.registerPolicyConnector(policyConnector);
    graph.registerCostSignalConnector(costConnector);

    const snapshot = await graph.refresh();

    expect(snapshot.sandbox).toBe(true);
    expect(snapshot.namespace).toContain('sandbox');
    expect(snapshot.warnings?.[0]).toContain('Sandbox mode active');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('blocks unsafe graph rewrites when confirmation is required', async () => {
    graph = new OrchestrationKnowledgeGraph({ requireConfirmation: true });

    graph.registerPipelineConnector(pipelineConnector);
    graph.registerServiceConnector(serviceConnector);
    graph.registerEnvironmentConnector(environmentConnector);
    graph.registerIncidentConnector(incidentConnector);
    graph.registerPolicyConnector(policyConnector);
    graph.registerCostSignalConnector(costConnector);

    await expect(graph.refresh()).rejects.toThrow(/confirmation required/);

    const confirmedGraph = new OrchestrationKnowledgeGraph({
      requireConfirmation: true,
      confirmationProvided: true,
    });
    confirmedGraph.registerPipelineConnector(pipelineConnector);
    confirmedGraph.registerServiceConnector(serviceConnector);
    confirmedGraph.registerEnvironmentConnector(environmentConnector);
    confirmedGraph.registerIncidentConnector(incidentConnector);
    confirmedGraph.registerPolicyConnector(policyConnector);
    confirmedGraph.registerCostSignalConnector(costConnector);

    await expect(confirmedGraph.refresh()).resolves.toBeDefined();
  });

  it('prevents mass mutations when thresholds are exceeded', async () => {
    graph = new OrchestrationKnowledgeGraph({ mutationThreshold: 1 });

    graph.registerPipelineConnector(pipelineConnector);
    graph.registerServiceConnector(serviceConnector);
    graph.registerEnvironmentConnector(environmentConnector);
    graph.registerIncidentConnector(incidentConnector);
    graph.registerPolicyConnector(policyConnector);
    graph.registerCostSignalConnector(costConnector);

    await expect(graph.refresh()).rejects.toThrow(/Refusing to mutate/);
  });

  it('encrypts sensitive nodes end-to-end when protection is enabled', async () => {
    const secret = '0123456789abcdef0123456789abcdef';
    graph = new OrchestrationKnowledgeGraph({
      encryption: {
        secret,
        mode: 'encrypt-sensitive',
        sensitiveFields: ['piiClassification'],
      },
    });

    graph.registerPipelineConnector(pipelineConnector);
    graph.registerServiceConnector(serviceConnector);
    graph.registerEnvironmentConnector(environmentConnector);
    graph.registerIncidentConnector(incidentConnector);
    graph.registerPolicyConnector(policyConnector);
    graph.registerCostSignalConnector(costConnector);

    const snapshot = await graph.refresh();
    const serviceNode = snapshot.nodes.find((node) => node.id === 'service:svc-api');

    expect(typeof serviceNode?.data).toBe('object');
    expect(serviceNode?.provenance?.attributes?.encrypted).toBe(true);

    const decrypted = decryptGraphNode(serviceNode!, secret);
    expect((decrypted.data as ServiceRecord).name).toBe('API');
  });

  it('enforces data residency by filtering non-compliant nodes', async () => {
    graph = new OrchestrationKnowledgeGraph({
      dataResidency: { allowedRegions: ['eu-west-1'], denyUnknown: false },
    });

    graph.registerPipelineConnector(pipelineConnector);
    graph.registerServiceConnector(serviceConnector);
    graph.registerEnvironmentConnector(environmentConnector);
    graph.registerIncidentConnector(incidentConnector);
    graph.registerPolicyConnector(policyConnector);
    graph.registerCostSignalConnector(costConnector);

    const snapshot = await graph.refresh();

    expect(snapshot.nodes.some((node) => node.id.startsWith('env:'))).toBe(false);
    expect(snapshot.telemetry?.residencyFiltered).toBeGreaterThan(0);
  });
});
