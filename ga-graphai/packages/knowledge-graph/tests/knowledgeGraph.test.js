"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const common_types_1 = require("@ga-graphai/common-types");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('OrchestrationKnowledgeGraph', () => {
    let graph;
    let pipelineConnector;
    let serviceConnector;
    let environmentConnector;
    let incidentConnector;
    let policyConnector;
    let costConnector;
    let eventTransport;
    let emitter;
    (0, vitest_1.beforeEach)(() => {
        eventTransport = vitest_1.vi.fn();
        emitter = new common_types_1.StructuredEventEmitter({ transport: eventTransport });
        graph = new index_js_1.OrchestrationKnowledgeGraph(emitter);
        pipelineConnector = {
            loadPipelines: vitest_1.vi.fn().mockResolvedValue([
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
            loadServices: vitest_1.vi
                .fn()
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
            loadEnvironments: vitest_1.vi
                .fn()
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
            loadIncidents: vitest_1.vi
                .fn()
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
            loadPolicies: vitest_1.vi.fn().mockResolvedValue([
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
            loadCostSignals: vitest_1.vi.fn().mockResolvedValue([
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
    (0, vitest_1.it)('builds nodes and relationships with risk scoring', async () => {
        const snapshot = await graph.refresh();
        (0, vitest_1.expect)(snapshot.nodes.find((node) => node.id === 'service:svc-api')).toBeDefined();
        (0, vitest_1.expect)(snapshot.nodes.find((node) => node.id === 'pipeline:pipeline-a')).toBeDefined();
        (0, vitest_1.expect)(snapshot.edges.find((edge) => edge.id === 'pipeline:pipeline-a:CONTAINS:stage:stage-a1')).toBeDefined();
        (0, vitest_1.expect)(snapshot.edges.find((edge) => edge.id === 'stage:stage-a1:TARGETS:service:svc-api')).toBeDefined();
        (0, vitest_1.expect)(snapshot.edges.find((edge) => edge.id === 'incident:incident-1:AFFECTS:service:svc-api')).toBeDefined();
        const risk = snapshot.serviceRisk['svc-api'];
        (0, vitest_1.expect)(risk.score).toBeGreaterThan(0.3);
        (0, vitest_1.expect)(risk.factors.incidentLoad).toBeGreaterThan(risk.factors.costPressure * 0.5);
    });
    (0, vitest_1.it)('attaches provenance metadata across the graph for lineage dashboards', async () => {
        const snapshot = await graph.refresh();
        const serviceNode = snapshot.nodes.find((node) => node.id === 'service:svc-api');
        const depEdge = snapshot.edges.find((edge) => edge.id.includes('DEPENDS_ON'));
        (0, vitest_1.expect)(serviceNode?.provenance?.source).toBe('cmdb');
        (0, vitest_1.expect)(serviceNode?.provenance?.checksum).toBeDefined();
        (0, vitest_1.expect)(depEdge?.provenance?.lineage?.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(snapshot.lineage?.nodesWithProvenance).toBe(snapshot.nodes.length);
        (0, vitest_1.expect)(snapshot.lineage?.missingNodes).toEqual([]);
    });
    (0, vitest_1.it)('exposes service context view with incidents and policies', async () => {
        await graph.refresh();
        const context = graph.queryService('svc-api');
        (0, vitest_1.expect)(context?.service?.name).toBe('API');
        (0, vitest_1.expect)(context?.incidents).toHaveLength(2);
        (0, vitest_1.expect)(context?.policies?.[0]?.id).toBe('policy-1');
        (0, vitest_1.expect)(context?.pipelines?.[0]?.id).toBe('pipeline-a');
        (0, vitest_1.expect)(context?.risk?.score).toBeLessThanOrEqual(1);
    });
    (0, vitest_1.it)('provides direct node lookups for GraphQL resolvers', async () => {
        await graph.refresh();
        const serviceNode = graph.getNode('service:svc-api');
        const nodes = graph.getNodes(['service:svc-api', 'pipeline:pipeline-a']);
        (0, vitest_1.expect)(serviceNode?.type).toBe('service');
        (0, vitest_1.expect)(nodes).toHaveLength(2);
        (0, vitest_1.expect)(nodes.every((node) => node)).toBe(true);
    });
    (0, vitest_1.it)('applies streaming updates and emits agent triggers', async () => {
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
        (0, vitest_1.expect)(snapshot.nodes.some((node) => node.id === 'incident:incident-stream')).toBe(true);
        (0, vitest_1.expect)(eventTransport).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'summit.intelgraph.graph.updated' }));
        (0, vitest_1.expect)(eventTransport).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'summit.intelgraph.agent.triggered' }));
    });
    (0, vitest_1.it)('emits structured telemetry for IntelGraph queries', async () => {
        await graph.refresh();
        graph.queryService('svc-api');
        (0, vitest_1.expect)(eventTransport).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'summit.intelgraph.query.executed' }));
    });
    (0, vitest_1.it)('records observability signals and distributed tracing for refresh and query', async () => {
        const logger = {
            info: vitest_1.vi.fn(),
            warn: vitest_1.vi.fn(),
            error: vitest_1.vi.fn(),
        };
        const metrics = {
            observe: vitest_1.vi.fn(),
            increment: vitest_1.vi.fn(),
        };
        const spans = [];
        const tracer = {
            startSpan: vitest_1.vi.fn((name) => {
                const end = vitest_1.vi.fn();
                const span = { name, end, recordException: vitest_1.vi.fn() };
                spans.push({ name, end });
                return span;
            }),
        };
        graph = new index_js_1.OrchestrationKnowledgeGraph(emitter, {
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
        (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('intelgraph.kg.refresh.completed', vitest_1.expect.objectContaining({ nodeCount: vitest_1.expect.any(Number) }));
        (0, vitest_1.expect)(metrics.observe).toHaveBeenCalledWith('intelgraph_kg_refresh_duration_ms', vitest_1.expect.any(Number), vitest_1.expect.objectContaining({ namespace: 'intelgraph' }));
        (0, vitest_1.expect)(metrics.increment).toHaveBeenCalledWith('intelgraph_kg_queries_total', 1, vitest_1.expect.objectContaining({ queryType: 'service' }));
        (0, vitest_1.expect)(tracer.startSpan).toHaveBeenCalledWith('intelgraph.kg.refresh', vitest_1.expect.objectContaining({ namespace: 'intelgraph' }));
        (0, vitest_1.expect)(spans.some((span) => span.end.mock.calls.length > 0)).toBe(true);
    });
    (0, vitest_1.it)('returns undefined for unknown service', () => {
        (0, vitest_1.expect)(graph.queryService('unknown')).toBeUndefined();
    });
    (0, vitest_1.it)('isolates graph refresh when sandbox mode is enabled', async () => {
        const logger = { warn: vitest_1.vi.fn() };
        graph = new index_js_1.OrchestrationKnowledgeGraph({ sandboxMode: true, logger });
        graph.registerPipelineConnector(pipelineConnector);
        graph.registerServiceConnector(serviceConnector);
        graph.registerEnvironmentConnector(environmentConnector);
        graph.registerIncidentConnector(incidentConnector);
        graph.registerPolicyConnector(policyConnector);
        graph.registerCostSignalConnector(costConnector);
        const snapshot = await graph.refresh();
        (0, vitest_1.expect)(snapshot.sandbox).toBe(true);
        (0, vitest_1.expect)(snapshot.namespace).toContain('sandbox');
        (0, vitest_1.expect)(snapshot.warnings?.[0]).toContain('Sandbox mode active');
        (0, vitest_1.expect)(logger.warn).toHaveBeenCalled();
    });
    (0, vitest_1.it)('blocks unsafe graph rewrites when confirmation is required', async () => {
        graph = new index_js_1.OrchestrationKnowledgeGraph({ requireConfirmation: true });
        graph.registerPipelineConnector(pipelineConnector);
        graph.registerServiceConnector(serviceConnector);
        graph.registerEnvironmentConnector(environmentConnector);
        graph.registerIncidentConnector(incidentConnector);
        graph.registerPolicyConnector(policyConnector);
        graph.registerCostSignalConnector(costConnector);
        await (0, vitest_1.expect)(graph.refresh()).rejects.toThrow(/confirmation required/);
        const confirmedGraph = new index_js_1.OrchestrationKnowledgeGraph({
            requireConfirmation: true,
            confirmationProvided: true,
        });
        confirmedGraph.registerPipelineConnector(pipelineConnector);
        confirmedGraph.registerServiceConnector(serviceConnector);
        confirmedGraph.registerEnvironmentConnector(environmentConnector);
        confirmedGraph.registerIncidentConnector(incidentConnector);
        confirmedGraph.registerPolicyConnector(policyConnector);
        confirmedGraph.registerCostSignalConnector(costConnector);
        await (0, vitest_1.expect)(confirmedGraph.refresh()).resolves.toBeDefined();
    });
    (0, vitest_1.it)('prevents mass mutations when thresholds are exceeded', async () => {
        graph = new index_js_1.OrchestrationKnowledgeGraph({ mutationThreshold: 1 });
        graph.registerPipelineConnector(pipelineConnector);
        graph.registerServiceConnector(serviceConnector);
        graph.registerEnvironmentConnector(environmentConnector);
        graph.registerIncidentConnector(incidentConnector);
        graph.registerPolicyConnector(policyConnector);
        graph.registerCostSignalConnector(costConnector);
        await (0, vitest_1.expect)(graph.refresh()).rejects.toThrow(/Refusing to mutate/);
    });
    (0, vitest_1.it)('encrypts sensitive nodes end-to-end when protection is enabled', async () => {
        const secret = '0123456789abcdef0123456789abcdef';
        graph = new index_js_1.OrchestrationKnowledgeGraph({
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
        (0, vitest_1.expect)(typeof serviceNode?.data).toBe('object');
        (0, vitest_1.expect)(serviceNode?.provenance?.attributes?.encrypted).toBe(true);
        const decrypted = (0, index_js_1.decryptGraphNode)(serviceNode, secret);
        (0, vitest_1.expect)(decrypted.data.name).toBe('API');
    });
    (0, vitest_1.it)('enforces data residency by filtering non-compliant nodes', async () => {
        graph = new index_js_1.OrchestrationKnowledgeGraph({
            dataResidency: { allowedRegions: ['eu-west-1'], denyUnknown: false },
        });
        graph.registerPipelineConnector(pipelineConnector);
        graph.registerServiceConnector(serviceConnector);
        graph.registerEnvironmentConnector(environmentConnector);
        graph.registerIncidentConnector(incidentConnector);
        graph.registerPolicyConnector(policyConnector);
        graph.registerCostSignalConnector(costConnector);
        const snapshot = await graph.refresh();
        (0, vitest_1.expect)(snapshot.nodes.some((node) => node.id.startsWith('env:'))).toBe(false);
        (0, vitest_1.expect)(snapshot.telemetry?.residencyFiltered).toBeGreaterThan(0);
    });
});
