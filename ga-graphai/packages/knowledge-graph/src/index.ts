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
    await Promise.all([
      this.ingestServices(),
      this.ingestEnvironments(),
      this.ingestPipelines(),
      this.ingestIncidents(),
      this.ingestPolicies(),
      this.ingestCostSignals(),
    ]);
    this.rebuildGraph();
    this.version += 1;
    return this.snapshot();
  }

  snapshot(): GraphSnapshot {
    const nodes = Array.from(this.state.nodes.values());
    const edges = Array.from(this.state.edges.values());
    const serviceRisk = this.calculateServiceRisk();
    return {
      generatedAt: new Date().toISOString(),
      version: this.version,
      nodes,
      edges,
      serviceRisk,
    };
  }

  queryService(serviceId: string) {
    const service = this.state.services.get(serviceId);
    if (!service) {
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
    return {
      service,
      environments,
      incidents,
      policies,
      pipelines,
      risk: this.calculateServiceRisk()[serviceId],
    };
  }

  private async ingestServices(): Promise<void> {
    if (this.serviceConnectors.length === 0) {
      return;
    }
    const results = await Promise.all(
      this.serviceConnectors.map((connector) => connector.loadServices()),
    );
    for (const record of results.flat()) {
      this.state.services.set(record.id, record);
    }
  }

  private async ingestEnvironments(): Promise<void> {
    if (this.environmentConnectors.length === 0) {
      return;
    }
    const results = await Promise.all(
      this.environmentConnectors.map((connector) => connector.loadEnvironments()),
    );
    for (const record of results.flat()) {
      this.state.environments.set(record.id, record);
    }
  }

  private async ingestPipelines(): Promise<void> {
    if (this.pipelineConnectors.length === 0) {
      return;
    }
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
  }

  private async ingestIncidents(): Promise<void> {
    if (this.incidentConnectors.length === 0) {
      return;
    }
    const results = await Promise.all(
      this.incidentConnectors.map((connector) => connector.loadIncidents()),
    );
    for (const incident of results.flat()) {
      this.state.incidents.set(incident.id, incident);
    }
  }

  private async ingestPolicies(): Promise<void> {
    if (this.policyConnectors.length === 0) {
      return;
    }
    const results = await Promise.all(
      this.policyConnectors.map((connector) => connector.loadPolicies()),
    );
    for (const policy of results.flat()) {
      this.state.policies.set(policy.id, policy);
    }
  }

  private async ingestCostSignals(): Promise<void> {
    if (this.costSignalConnectors.length === 0) {
      return;
    }
    const results = await Promise.all(
      this.costSignalConnectors.map((connector) => connector.loadCostSignals()),
    );
    for (const signal of results.flat()) {
      const id = `${signal.serviceId}:${signal.timeBucket}`;
      this.state.costSignals.set(id, signal);
    }
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
