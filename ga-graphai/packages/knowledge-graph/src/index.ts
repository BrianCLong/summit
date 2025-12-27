import { StructuredEventEmitter } from '@ga-graphai/common-types';
import type { PolicyRule } from '@ga-graphai/common-types';

type NodeType =
  | 'service'
  | 'environment'
  | 'pipeline'
  | 'stage'
  | 'incident'
  | 'policy'
  | 'cost-signal';

type RelationshipType =
  | 'DEPENDS_ON'
  | 'DEPLOYED_IN'
  | 'CONTAINS'
  | 'RUNS_IN'
  | 'TARGETS'
  | 'AFFECTS'
  | 'OCCURRED_IN'
  | 'GOVERNS'
  | 'OBSERVED_FOR';

export interface GraphNode<TData = Record<string, unknown>> {
  id: string;
  type: NodeType;
  data: TData;
}

export interface GraphEdge<TMetadata = Record<string, unknown>> {
  id: string;
  from: string;
  to: string;
  type: RelationshipType;
  metadata?: TMetadata;
}

export interface ServiceRecord {
  id: string;
  name: string;
  owningTeam?: string;
  tier?: string;
  languages?: string[];
  dependencies?: string[];
  soxCritical?: boolean;
  piiClassification?: string;
}

export interface EnvironmentRecord {
  id: string;
  name: string;
  stage: 'dev' | 'staging' | 'prod' | string;
  region: string;
  deploymentMechanism?: string;
  zeroTrustTier?: number;
  complianceTags?: string[];
}

export interface PipelineStageRecord {
  id: string;
  name: string;
  pipelineId: string;
  serviceId: string;
  environmentId: string;
  capability: string;
  guardrails?: Record<string, unknown>;
  policies?: string[];
  complianceTags?: string[];
}

export interface PipelineRecord {
  id: string;
  name: string;
  owner?: string;
  goldenPath?: string;
  changeWindow?: string;
  stages: PipelineStageRecord[];
}

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentRecord {
  id: string;
  serviceId: string;
  environmentId: string;
  severity: IncidentSeverity;
  occurredAt: string;
  status: 'open' | 'mitigated' | 'closed';
  rootCauseCategory?: string;
}

export interface CostSignalRecord {
  serviceId: string;
  timeBucket: string;
  saturation: number;
  budgetBreaches: number;
  throttleCount: number;
  slowQueryCount: number;
}

export interface PipelineConnector {
  loadPipelines(): Promise<PipelineRecord[]>;
}

export interface ServiceConnector {
  loadServices(): Promise<ServiceRecord[]>;
}

export interface EnvironmentConnector {
  loadEnvironments(): Promise<EnvironmentRecord[]>;
}

export interface IncidentConnector {
  loadIncidents(): Promise<IncidentRecord[]>;
}

export interface PolicyConnector {
  loadPolicies(): Promise<PolicyRule[]>;
}

export interface CostSignalConnector {
  loadCostSignals(): Promise<CostSignalRecord[]>;
}

export interface ServiceRiskProfile {
  score: number;
  factors: {
    incidentLoad: number;
    costPressure: number;
    policyRisk: number;
    [key: string]: number;
  };
  lastUpdated: string;
}

export interface GraphSnapshot {
  generatedAt: string;
  version: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  serviceRisk: Record<string, ServiceRiskProfile>;
  sandbox?: boolean;
  namespace?: string;
  warnings?: string[];
  stats?: {
    nodes: number;
    edges: number;
    services: number;
    incidents: number;
    pipelines: number;
    environments: number;
    policies: number;
    costSignals: number;
    durationMs?: number;
  };
  telemetry?: {
    refreshDurationMs?: number;
    lastQueryDurationMs?: number;
    traceId?: string;
  };
}

export interface StructuredLogger {
  info?(event: string, payload?: Record<string, unknown>): void;
  warn?(event: string, payload?: Record<string, unknown>): void;
  error?(event: string, payload?: Record<string, unknown>): void;
}

export interface MetricsRecorder {
  observe?(metric: string, value: number, attributes?: Record<string, string | number>): void;
  increment?(metric: string, value?: number, attributes?: Record<string, string | number>): void;
}

export interface TraceSpan {
  end(attributes?: Record<string, unknown>): void;
  recordException?(error: unknown): void;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, unknown>): TraceSpan | undefined;
}

export interface KnowledgeGraphOptions {
  sandboxMode?: boolean;
  namespace?: string;
  requireConfirmation?: boolean;
  confirmationProvided?: boolean;
  mutationThreshold?: number;
  logger?: StructuredLogger;
  metrics?: MetricsRecorder;
  tracer?: Tracer;
}

interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  pipelines: Map<string, PipelineRecord>;
  services: Map<string, ServiceRecord>;
  environments: Map<string, EnvironmentRecord>;
  incidents: Map<string, IncidentRecord>;
  policies: Map<string, PolicyRule>;
  costSignals: Map<string, CostSignalRecord>;
}

const INCIDENT_SEVERITY_WEIGHTS: Record<IncidentSeverity, number> = {
  low: 0.2,
  medium: 0.4,
  high: 0.7,
  critical: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function edgeId(from: string, type: RelationshipType, to: string): string {
  return `${from}:${type}:${to}`;
}

export class OrchestrationKnowledgeGraph {
  private readonly events: StructuredEventEmitter;

  private readonly options: KnowledgeGraphOptions;

  private readonly state: GraphState = {
    nodes: new Map(),
    edges: new Map(),
    pipelines: new Map(),
    services: new Map(),
    environments: new Map(),
    incidents: new Map(),
    policies: new Map(),
    costSignals: new Map(),
  };

  private pipelineConnectors: PipelineConnector[] = [];
  private serviceConnectors: ServiceConnector[] = [];
  private environmentConnectors: EnvironmentConnector[] = [];
  private incidentConnectors: IncidentConnector[] = [];
  private policyConnectors: PolicyConnector[] = [];
  private costSignalConnectors: CostSignalConnector[] = [];
  private version = 0;

  constructor(
    events: StructuredEventEmitter | KnowledgeGraphOptions = new StructuredEventEmitter(),
    options: KnowledgeGraphOptions = {},
  ) {
    if (events instanceof StructuredEventEmitter) {
      this.events = events;
      this.options = options;
    } else {
      this.events = new StructuredEventEmitter();
      this.options = events ?? {};
    }
  }

  registerPipelineConnector(connector: PipelineConnector): void {
    this.pipelineConnectors.push(connector);
  }

  registerServiceConnector(connector: ServiceConnector): void {
    this.serviceConnectors.push(connector);
  }

  registerEnvironmentConnector(connector: EnvironmentConnector): void {
    this.environmentConnectors.push(connector);
  }

  registerIncidentConnector(connector: IncidentConnector): void {
    this.incidentConnectors.push(connector);
  }

  registerPolicyConnector(connector: PolicyConnector): void {
    this.policyConnectors.push(connector);
  }

  registerCostSignalConnector(connector: CostSignalConnector): void {
    this.costSignalConnectors.push(connector);
  }

  async refresh(): Promise<GraphSnapshot> {
    if (this.options.requireConfirmation && !this.options.confirmationProvided) {
      throw new Error('Graph refresh confirmation required but not provided');
    }

    const previousState = this.cloneState();
    const startedAt = Date.now();
    const span = this.startSpan('intelgraph.kg.refresh', {
      namespace: this.namespace(),
      sandbox: Boolean(this.options.sandboxMode),
    });
    this.logInfo('intelgraph.kg.refresh.start', {
      namespace: this.namespace(),
      sandbox: Boolean(this.options.sandboxMode),
    });

    await Promise.all([
      this.ingestServices(),
      this.ingestEnvironments(),
      this.ingestPipelines(),
      this.ingestIncidents(),
      this.ingestPolicies(),
      this.ingestCostSignals(),
    ]);
    this.rebuildGraph();

    const durationMs = Date.now() - startedAt;
    this.version += 1;

    const snapshot = this.snapshot(durationMs);
    const mutationDelta =
      Math.abs(snapshot.nodes.length - previousState.nodes.size) +
      Math.abs(snapshot.edges.length - previousState.edges.size);

    if (this.options.mutationThreshold !== undefined && mutationDelta > this.options.mutationThreshold) {
      this.restoreState(previousState);
      const error = new Error(
        `Refusing to mutate graph by ${mutationDelta} elements without confirmation`,
      );
      this.logWarn('intelgraph.kg.refresh.blocked', {
        namespace: this.namespace(),
        mutationDelta,
        threshold: this.options.mutationThreshold,
      });
      span?.recordException?.(error);
      span?.end({ error: error.message });
      throw error;
    }

    this.metricsObserve('intelgraph_kg_refresh_duration_ms', durationMs, {
      namespace: snapshot.namespace,
    });
    this.metricsObserve('intelgraph_kg_nodes_total', snapshot.nodes.length, {
      namespace: snapshot.namespace,
    });
    this.metricsObserve('intelgraph_kg_edges_total', snapshot.edges.length, {
      namespace: snapshot.namespace,
    });
    this.logInfo('intelgraph.kg.refresh.completed', {
      namespace: snapshot.namespace,
      durationMs,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      sandbox: snapshot.sandbox,
    });
    span?.end({
      durationMs,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      namespace: snapshot.namespace,
    });
    return snapshot;
  }

  snapshot(durationMs?: number): GraphSnapshot {
    const nodes = Array.from(this.state.nodes.values());
    const edges = Array.from(this.state.edges.values());
    const serviceRisk = this.calculateServiceRisk();
    const warnings = this.options.sandboxMode
      ? ['Sandbox mode active: graph mutations isolated']
      : undefined;
    const namespace = this.namespace();
    if (warnings) {
      this.logWarn('intelgraph.kg.sandbox', { namespace });
    }
    return {
      generatedAt: new Date().toISOString(),
      version: this.version,
      nodes,
      edges,
      serviceRisk,
      sandbox: this.options.sandboxMode,
      namespace,
      warnings,
      stats: {
        nodes: nodes.length,
        edges: edges.length,
        services: this.state.services.size,
        incidents: this.state.incidents.size,
        pipelines: this.state.pipelines.size,
        environments: this.state.environments.size,
        policies: this.state.policies.size,
        costSignals: this.state.costSignals.size,
        durationMs,
      },
      telemetry: {
        refreshDurationMs: durationMs,
      },
    };
  }

  getNode(id: string): GraphNode | undefined {
    return this.state.nodes.get(id);
  }

  getNodes(ids: string[]): GraphNode[] {
    return ids
      .map((id) => this.state.nodes.get(id))
      .filter((node): node is GraphNode => Boolean(node));
  }

  queryService(serviceId: string) {
    const startedAt = Date.now();
    const span = this.startSpan('intelgraph.kg.query.service', {
      serviceId,
      namespace: this.namespace(),
    });
    this.logInfo('intelgraph.kg.query.start', {
      serviceId,
      namespace: this.namespace(),
    });
    const service = this.state.services.get(serviceId);
    if (!service) {
      span?.end({ found: false });
      return undefined;
    }
    const environments = Array.from(this.state.environments.values()).filter(
      (environment) =>
        this.state.edges.has(edgeId(`service:${serviceId}`, 'DEPLOYED_IN', `env:${environment.id}`)) ||
        this.state.edges.has(edgeId(`env:${environment.id}`, 'DEPLOYED_IN', `service:${serviceId}`)),
    );
    const incidents = Array.from(this.state.incidents.values()).filter(
      (incident) => incident.serviceId === serviceId,
    );
    const policies = Array.from(this.state.policies.values()).filter((policy) =>
      policy.resources.some((resource) => resource.includes(serviceId)),
    );
    const pipelines = Array.from(this.state.pipelines.values()).filter((pipeline) =>
      pipeline.stages.some((stage) => stage.serviceId === serviceId),
    );
    const snapshot = {
      service,
      environments,
      incidents,
      policies,
      pipelines,
      risk: this.calculateServiceRisk()[serviceId],
    };

    const durationMs = Date.now() - startedAt;
    const resultCount =
      environments.length + incidents.length + policies.length + pipelines.length;
    this.events.emitEvent('summit.intelgraph.query.executed', {
      queryType: 'service',
      subjectId: serviceId,
      durationMs,
      resultCount,
      riskScore: snapshot.risk?.score ?? 0,
      incidentCount: incidents.length,
    });

    this.metricsObserve('intelgraph_kg_query_duration_ms', durationMs, {
      namespace: this.namespace(),
      queryType: 'service',
    });
    this.metricsIncrement('intelgraph_kg_queries_total', 1, {
      namespace: this.namespace(),
      queryType: 'service',
    });
    this.logInfo('intelgraph.kg.query.completed', {
      serviceId,
      durationMs,
      resultCount,
      incidentCount: incidents.length,
      riskScore: snapshot.risk?.score ?? 0,
    });
    span?.end({ durationMs, resultCount, risk: snapshot.risk?.score });

    return snapshot;
  }

  private namespace(): string {
    if (this.options.namespace) {
      return this.options.namespace;
    }
    return this.options.sandboxMode ? 'intelgraph-sandbox' : 'intelgraph';
  }

  private cloneState(): GraphState {
    return {
      nodes: new Map(this.state.nodes),
      edges: new Map(this.state.edges),
      pipelines: new Map(this.state.pipelines),
      services: new Map(this.state.services),
      environments: new Map(this.state.environments),
      incidents: new Map(this.state.incidents),
      policies: new Map(this.state.policies),
      costSignals: new Map(this.state.costSignals),
    };
  }

  private restoreState(snapshot: GraphState): void {
    this.state.nodes.clear();
    this.state.edges.clear();
    this.state.pipelines.clear();
    this.state.services.clear();
    this.state.environments.clear();
    this.state.incidents.clear();
    this.state.policies.clear();
    this.state.costSignals.clear();

    snapshot.nodes.forEach((value, key) => this.state.nodes.set(key, value));
    snapshot.edges.forEach((value, key) => this.state.edges.set(key, value));
    snapshot.pipelines.forEach((value, key) => this.state.pipelines.set(key, value));
    snapshot.services.forEach((value, key) => this.state.services.set(key, value));
    snapshot.environments.forEach((value, key) => this.state.environments.set(key, value));
    snapshot.incidents.forEach((value, key) => this.state.incidents.set(key, value));
    snapshot.policies.forEach((value, key) => this.state.policies.set(key, value));
    snapshot.costSignals.forEach((value, key) => this.state.costSignals.set(key, value));
  }

  private async ingestServices(): Promise<void> {
    if (this.serviceConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan('intelgraph.kg.ingest.services', {
      connectors: this.serviceConnectors.length,
    });
    const results = await Promise.all(
      this.serviceConnectors.map((connector) => connector.loadServices()),
    );
    for (const record of results.flat()) {
      this.state.services.set(record.id, record);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo('intelgraph.kg.ingest.services', {
      durationMs,
      count: this.state.services.size,
    });
    this.metricsObserve('intelgraph_kg_ingest_services_ms', durationMs, {
      connectors: this.serviceConnectors.length,
    });
    this.metricsIncrement('intelgraph_kg_services_total', this.state.services.size);
    span?.end({ durationMs, count: this.state.services.size });
  }

  private async ingestEnvironments(): Promise<void> {
    if (this.environmentConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan('intelgraph.kg.ingest.environments', {
      connectors: this.environmentConnectors.length,
    });
    const results = await Promise.all(
      this.environmentConnectors.map((connector) => connector.loadEnvironments()),
    );
    for (const record of results.flat()) {
      this.state.environments.set(record.id, record);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo('intelgraph.kg.ingest.environments', {
      durationMs,
      count: this.state.environments.size,
    });
    this.metricsObserve('intelgraph_kg_ingest_environments_ms', durationMs, {
      connectors: this.environmentConnectors.length,
    });
    this.metricsIncrement('intelgraph_kg_environments_total', this.state.environments.size);
    span?.end({ durationMs, count: this.state.environments.size });
  }

  private async ingestPipelines(): Promise<void> {
    if (this.pipelineConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan('intelgraph.kg.ingest.pipelines', {
      connectors: this.pipelineConnectors.length,
    });
    const results = await Promise.all(
      this.pipelineConnectors.map((connector) => connector.loadPipelines()),
    );
    for (const pipeline of results.flat()) {
      this.state.pipelines.set(pipeline.id, pipeline);
      for (const stage of pipeline.stages) {
        this.state.nodes.set(`stage:${stage.id}`, {
          id: `stage:${stage.id}`,
          type: 'stage',
          data: stage,
        });
      }
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo('intelgraph.kg.ingest.pipelines', {
      durationMs,
      pipelines: this.state.pipelines.size,
    });
    this.metricsObserve('intelgraph_kg_ingest_pipelines_ms', durationMs, {
      connectors: this.pipelineConnectors.length,
    });
    this.metricsIncrement('intelgraph_kg_pipelines_total', this.state.pipelines.size);
    span?.end({ durationMs, pipelines: this.state.pipelines.size });
  }

  private async ingestIncidents(): Promise<void> {
    if (this.incidentConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan('intelgraph.kg.ingest.incidents', {
      connectors: this.incidentConnectors.length,
    });
    const results = await Promise.all(
      this.incidentConnectors.map((connector) => connector.loadIncidents()),
    );
    for (const incident of results.flat()) {
      this.state.incidents.set(incident.id, incident);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo('intelgraph.kg.ingest.incidents', {
      durationMs,
      incidents: this.state.incidents.size,
    });
    this.metricsObserve('intelgraph_kg_ingest_incidents_ms', durationMs, {
      connectors: this.incidentConnectors.length,
    });
    this.metricsIncrement('intelgraph_kg_incidents_total', this.state.incidents.size);
    span?.end({ durationMs, incidents: this.state.incidents.size });
  }

  private async ingestPolicies(): Promise<void> {
    if (this.policyConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan('intelgraph.kg.ingest.policies', {
      connectors: this.policyConnectors.length,
    });
    const results = await Promise.all(
      this.policyConnectors.map((connector) => connector.loadPolicies()),
    );
    for (const policy of results.flat()) {
      this.state.policies.set(policy.id, policy);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo('intelgraph.kg.ingest.policies', {
      durationMs,
      policies: this.state.policies.size,
    });
    this.metricsObserve('intelgraph_kg_ingest_policies_ms', durationMs, {
      connectors: this.policyConnectors.length,
    });
    this.metricsIncrement('intelgraph_kg_policies_total', this.state.policies.size);
    span?.end({ durationMs, policies: this.state.policies.size });
  }

  private async ingestCostSignals(): Promise<void> {
    if (this.costSignalConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan('intelgraph.kg.ingest.costSignals', {
      connectors: this.costSignalConnectors.length,
    });
    const results = await Promise.all(
      this.costSignalConnectors.map((connector) => connector.loadCostSignals()),
    );
    for (const signal of results.flat()) {
      const id = `${signal.serviceId}:${signal.timeBucket}`;
      this.state.costSignals.set(id, signal);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo('intelgraph.kg.ingest.costSignals', {
      durationMs,
      costSignals: this.state.costSignals.size,
    });
    this.metricsObserve('intelgraph_kg_ingest_cost_signals_ms', durationMs, {
      connectors: this.costSignalConnectors.length,
    });
    this.metricsIncrement('intelgraph_kg_cost_signals_total', this.state.costSignals.size);
    span?.end({ durationMs, costSignals: this.state.costSignals.size });
  }

  private rebuildGraph(): void {
    this.state.nodes.clear();
    this.state.edges.clear();

    for (const service of this.state.services.values()) {
      this.state.nodes.set(`service:${service.id}`, {
        id: `service:${service.id}`,
        type: 'service',
        data: service,
      });
      for (const dependency of service.dependencies ?? []) {
        const edge = {
          id: edgeId(`service:${service.id}`, 'DEPENDS_ON', `service:${dependency}`),
          from: `service:${service.id}`,
          to: `service:${dependency}`,
          type: 'DEPENDS_ON' as const,
        } satisfies GraphEdge;
        this.state.edges.set(edge.id, edge);
      }
    }

    for (const environment of this.state.environments.values()) {
      this.state.nodes.set(`env:${environment.id}`, {
        id: `env:${environment.id}`,
        type: 'environment',
        data: environment,
      });
    }

    for (const pipeline of this.state.pipelines.values()) {
      this.state.nodes.set(`pipeline:${pipeline.id}`, {
        id: `pipeline:${pipeline.id}`,
        type: 'pipeline',
        data: pipeline,
      });
      for (const stage of pipeline.stages) {
        const stageNode: GraphNode = {
          id: `stage:${stage.id}`,
          type: 'stage',
          data: stage,
        };
        this.state.nodes.set(stageNode.id, stageNode);
        const containsEdge: GraphEdge = {
          id: edgeId(`pipeline:${pipeline.id}`, 'CONTAINS', stageNode.id),
          from: `pipeline:${pipeline.id}`,
          to: stageNode.id,
          type: 'CONTAINS',
        };
        this.state.edges.set(containsEdge.id, containsEdge);

        const serviceEdge: GraphEdge = {
          id: edgeId(stageNode.id, 'TARGETS', `service:${stage.serviceId}`),
          from: stageNode.id,
          to: `service:${stage.serviceId}`,
          type: 'TARGETS',
        };
        this.state.edges.set(serviceEdge.id, serviceEdge);

        const envEdge: GraphEdge = {
          id: edgeId(stageNode.id, 'RUNS_IN', `env:${stage.environmentId}`),
          from: stageNode.id,
          to: `env:${stage.environmentId}`,
          type: 'RUNS_IN',
        };
        this.state.edges.set(envEdge.id, envEdge);
      }
    }

    for (const incident of this.state.incidents.values()) {
      const incidentNode: GraphNode = {
        id: `incident:${incident.id}`,
        type: 'incident',
        data: incident,
      };
      this.state.nodes.set(incidentNode.id, incidentNode);
      const serviceEdge: GraphEdge = {
        id: edgeId(incidentNode.id, 'AFFECTS', `service:${incident.serviceId}`),
        from: incidentNode.id,
        to: `service:${incident.serviceId}`,
        type: 'AFFECTS',
        metadata: { severity: incident.severity, occurredAt: incident.occurredAt },
      };
      this.state.edges.set(serviceEdge.id, serviceEdge);
      const envEdge: GraphEdge = {
        id: edgeId(incidentNode.id, 'OCCURRED_IN', `env:${incident.environmentId}`),
        from: incidentNode.id,
        to: `env:${incident.environmentId}`,
        type: 'OCCURRED_IN',
      };
      this.state.edges.set(envEdge.id, envEdge);
    }

    for (const policy of this.state.policies.values()) {
      const policyNode: GraphNode = {
        id: `policy:${policy.id}`,
        type: 'policy',
        data: policy,
      };
      this.state.nodes.set(policyNode.id, policyNode);
      for (const resource of policy.resources) {
        const targetId = resource.includes(':') ? resource : `service:${resource}`;
        const edge: GraphEdge = {
          id: edgeId(policyNode.id, 'GOVERNS', targetId),
          from: policyNode.id,
          to: targetId,
          type: 'GOVERNS',
        };
        this.state.edges.set(edge.id, edge);
      }
    }

    for (const signal of this.state.costSignals.values()) {
      const signalNode: GraphNode = {
        id: `cost:${signal.serviceId}:${signal.timeBucket}`,
        type: 'cost-signal',
        data: signal,
      };
      this.state.nodes.set(signalNode.id, signalNode);
      const edge: GraphEdge = {
        id: edgeId(signalNode.id, 'OBSERVED_FOR', `service:${signal.serviceId}`),
        from: signalNode.id,
        to: `service:${signal.serviceId}`,
        type: 'OBSERVED_FOR',
      };
      this.state.edges.set(edge.id, edge);
    }
  }

  private calculateServiceRisk(): Record<string, ServiceRiskProfile> {
    const risk: Record<string, ServiceRiskProfile> = {};
    const now = new Date().toISOString();

    for (const service of this.state.services.values()) {
      const serviceId = service.id;
      const incidents = Array.from(this.state.incidents.values()).filter(
        (incident) => incident.serviceId === serviceId,
      );
      const costSignals = Array.from(this.state.costSignals.values()).filter(
        (signal) => signal.serviceId === serviceId,
      );
      const policies = Array.from(this.state.policies.values()).filter((policy) =>
        policy.resources.some((resource) => resource.includes(serviceId)),
      );

      const incidentLoad = incidents.reduce((acc, incident) => {
        const weight = INCIDENT_SEVERITY_WEIGHTS[incident.severity] ?? 0.2;
        const openMultiplier = incident.status === 'open' ? 1.3 : 0.6;
        return acc + weight * openMultiplier;
      }, 0);
      const recentCostSignal = costSignals[costSignals.length - 1];
      const costPressure = recentCostSignal
        ? clamp(
            recentCostSignal.saturation * 0.6 +
              recentCostSignal.budgetBreaches * 0.25 +
              recentCostSignal.throttleCount * 0.2,
            0,
            1.2,
          )
        : 0;
      const policyRisk = policies.some((policy) =>
        policy.tags?.includes('high-risk'),
      )
        ? 0.8
        : 0.3;

      const rawScore = incidentLoad * 0.5 + costPressure * 0.35 + policyRisk * 0.4;
      const score = clamp(rawScore / 2.2, 0, 1);

      risk[serviceId] = {
        score,
        factors: {
          incidentLoad,
          costPressure,
          policyRisk,
        },
        lastUpdated: now,
      };
    }

    return risk;
  }

  private logInfo(event: string, payload: Record<string, unknown>): void {
    this.options.logger?.info?.(event, payload);
  }

  private logWarn(event: string, payload: Record<string, unknown>): void {
    this.options.logger?.warn?.(event, payload);
  }

  private metricsObserve(
    metric: string,
    value: number,
    attributes?: Record<string, string | number>,
  ): void {
    this.options.metrics?.observe?.(metric, value, attributes);
  }

  private metricsIncrement(
    metric: string,
    value = 1,
    attributes?: Record<string, string | number>,
  ): void {
    this.options.metrics?.increment?.(metric, value, attributes);
  }

  private startSpan(name: string, attributes?: Record<string, unknown>): TraceSpan | undefined {
    return this.options.tracer?.startSpan?.(name, attributes);
  }
}

export type {
  CostSignalConnector,
  CostSignalRecord,
  EnvironmentConnector,
  EnvironmentRecord,
  GraphEdge,
  GraphNode,
  GraphSnapshot,
  IncidentConnector,
  IncidentRecord,
  PipelineConnector,
  PipelineRecord,
  PipelineStageRecord,
  PolicyConnector,
  ServiceConnector,
  ServiceRecord,
  ServiceRiskProfile,
};

export * from './osint.js';
