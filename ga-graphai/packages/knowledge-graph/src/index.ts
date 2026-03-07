import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { StructuredEventEmitter } from "@ga-graphai/common-types";
import type { PolicyRule } from "@ga-graphai/common-types";
import { stableHash } from "@ga-graphai/data-integrity";

type NodeType =
  | "service"
  | "environment"
  | "pipeline"
  | "stage"
  | "incident"
  | "policy"
  | "cost-signal";

type RelationshipType =
  | "DEPENDS_ON"
  | "DEPLOYED_IN"
  | "CONTAINS"
  | "RUNS_IN"
  | "TARGETS"
  | "AFFECTS"
  | "OCCURRED_IN"
  | "GOVERNS"
  | "OBSERVED_FOR";

export interface GraphProvenance {
  source: string;
  ingress: "api" | "database" | "message-broker" | "ingestion" | string;
  observedAt: string;
  checksum: string;
  traceId?: string;
  lineage?: string[];
  attributes?: Record<string, unknown>;
  signature?: string;
}

export interface GraphNode<TData = Record<string, unknown>> {
  id: string;
  type: NodeType;
  data: TData;
  provenance?: GraphProvenance;
}

export interface GraphEdge<TMetadata = Record<string, unknown>> {
  id: string;
  from: string;
  to: string;
  type: RelationshipType;
  metadata?: TMetadata;
  provenance?: GraphProvenance;
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
  provenance?: GraphProvenance;
}

export interface EnvironmentRecord {
  id: string;
  name: string;
  stage: "dev" | "staging" | "prod" | string;
  region: string;
  deploymentMechanism?: string;
  zeroTrustTier?: number;
  complianceTags?: string[];
  provenance?: GraphProvenance;
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
  provenance?: GraphProvenance;
}

export interface PipelineRecord {
  id: string;
  name: string;
  owner?: string;
  goldenPath?: string;
  changeWindow?: string;
  stages: PipelineStageRecord[];
  provenance?: GraphProvenance;
}

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface IncidentRecord {
  id: string;
  serviceId: string;
  environmentId: string;
  severity: IncidentSeverity;
  occurredAt: string;
  status: "open" | "mitigated" | "closed";
  rootCauseCategory?: string;
  provenance?: GraphProvenance;
}

export interface CostSignalRecord {
  serviceId: string;
  timeBucket: string;
  saturation: number;
  budgetBreaches: number;
  throttleCount: number;
  slowQueryCount: number;
  provenance?: GraphProvenance;
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
  lineage?: {
    nodesWithProvenance: number;
    edgesWithProvenance: number;
    missingNodes: string[];
    missingEdges: string[];
  };
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
    residencyFiltered?: number;
  };
  encryption?: {
    mode: KnowledgeGraphEncryptionMode;
    algorithm: KnowledgeGraphEncryptionAlgorithm;
    sensitiveNodes: number;
  };
}

export type KnowledgeGraphEncryptionAlgorithm = "aes-256-gcm";

export type KnowledgeGraphEncryptionMode = "transparent" | "encrypt-sensitive";

export interface EncryptedGraphPayload {
  algorithm: KnowledgeGraphEncryptionAlgorithm;
  iv: string;
  authTag: string;
  ciphertext: string;
  associatedData?: string;
}

export interface KnowledgeGraphEncryptionOptions {
  mode?: KnowledgeGraphEncryptionMode;
  secret: string;
  algorithm?: KnowledgeGraphEncryptionAlgorithm;
  associatedData?: string;
  sensitiveTypes?: NodeType[];
  sensitiveFields?: string[];
}

export interface DataResidencyOptions {
  allowedRegions: string[];
  denyUnknown?: boolean;
}

export interface ProtectedNodeSummary {
  id: string;
  reason: string;
}

function isEncryptedPayload(value: unknown): value is EncryptedGraphPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.algorithm === "string" &&
    typeof payload.iv === "string" &&
    typeof payload.authTag === "string" &&
    typeof payload.ciphertext === "string"
  );
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function encryptPayload(
  data: unknown,
  options: KnowledgeGraphEncryptionOptions
): EncryptedGraphPayload {
  const algorithm = options.algorithm ?? "aes-256-gcm";
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, deriveKey(options.secret), iv);
  if (options.associatedData) {
    cipher.setAAD(Buffer.from(options.associatedData));
  }
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]).toString("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  return {
    algorithm,
    iv: iv.toString("base64"),
    authTag,
    ciphertext,
    associatedData: options.associatedData,
  } satisfies EncryptedGraphPayload;
}

function decryptPayload<T = unknown>(
  payload: EncryptedGraphPayload,
  secret: string,
  associatedData?: string
): T {
  const key = deriveKey(secret);
  const decipher = createDecipheriv(payload.algorithm, key, Buffer.from(payload.iv, "base64"));
  if (associatedData ?? payload.associatedData) {
    decipher.setAAD(Buffer.from(associatedData ?? payload.associatedData ?? ""));
  }
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}

export interface AgentTrigger {
  agent: string;
  reason: string;
  priority?: "low" | "normal" | "high";
  payload?: Record<string, unknown>;
  correlationId?: string;
}

export interface GraphUpdate {
  source?: string;
  ingress?: string;
  topic?: string;
  correlationId?: string;
  traceId?: string;
  observedAt?: string;
  namespace?: string;
  services?: ServiceRecord[];
  environments?: EnvironmentRecord[];
  pipelines?: PipelineRecord[];
  incidents?: IncidentRecord[];
  policies?: PolicyRule[];
  costSignals?: CostSignalRecord[];
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  deletions?: {
    services?: string[];
    environments?: string[];
    pipelines?: string[];
    incidents?: string[];
    policies?: string[];
    costSignals?: string[];
    nodes?: string[];
    edges?: string[];
  };
  agentTriggers?: AgentTrigger[];
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
  encryption?: KnowledgeGraphEncryptionOptions;
  dataResidency?: DataResidencyOptions;
}

interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  streamNodes: Map<string, GraphNode>;
  streamEdges: Map<string, GraphEdge>;
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
    streamNodes: new Map(),
    streamEdges: new Map(),
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

  private readonly encryption?: KnowledgeGraphEncryptionOptions;
  private readonly dataResidency?: DataResidencyOptions;

  constructor(
    events: StructuredEventEmitter | KnowledgeGraphOptions = new StructuredEventEmitter(),
    options: KnowledgeGraphOptions = {}
  ) {
    if (events instanceof StructuredEventEmitter) {
      this.events = events;
      this.options = options;
    } else {
      this.events = new StructuredEventEmitter();
      this.options = events ?? {};
    }
    this.encryption = this.options.encryption;
    this.dataResidency = this.options.dataResidency;
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
      throw new Error("Graph refresh confirmation required but not provided");
    }

    const previousState = this.cloneState();
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.kg.refresh", {
      namespace: this.namespace(),
      sandbox: Boolean(this.options.sandboxMode),
    });
    this.logInfo("intelgraph.kg.refresh.start", {
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

    if (
      this.options.mutationThreshold !== undefined &&
      mutationDelta > this.options.mutationThreshold
    ) {
      this.restoreState(previousState);
      const error = new Error(
        `Refusing to mutate graph by ${mutationDelta} elements without confirmation`
      );
      this.logWarn("intelgraph.kg.refresh.blocked", {
        namespace: this.namespace(),
        mutationDelta,
        threshold: this.options.mutationThreshold,
      });
      span?.recordException?.(error);
      span?.end({ error: error.message });
      throw error;
    }

    this.metricsObserve("intelgraph_kg_refresh_duration_ms", durationMs, {
      namespace: snapshot.namespace,
    });
    this.metricsObserve("intelgraph_kg_nodes_total", snapshot.nodes.length, {
      namespace: snapshot.namespace,
    });
    this.metricsObserve("intelgraph_kg_edges_total", snapshot.edges.length, {
      namespace: snapshot.namespace,
    });
    this.logInfo("intelgraph.kg.refresh.completed", {
      namespace: snapshot.namespace,
      durationMs,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      sandbox: snapshot.sandbox,
    });
    this.events.emitEvent("summit.intelgraph.graph.updated", {
      source: "connector-refresh",
      ingress: "ingestion",
      namespace: snapshot.namespace,
      trigger: "refresh",
      version: this.version,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      durationMs,
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
    const baseNodes = Array.from(this.state.nodes.values());
    const edges = Array.from(this.state.edges.values());
    const residency = this.enforceDataResidency(baseNodes, edges);
    const protectedNodes = residency.nodes.map((node) => this.protectNode(node));
    const serviceRisk = this.calculateServiceRisk();
    const warnings = this.options.sandboxMode
      ? ["Sandbox mode active: graph mutations isolated"]
      : undefined;
    const lineage = this.lineageSummary(protectedNodes, residency.edges);
    const namespace = this.namespace();
    if (warnings) {
      this.logWarn("intelgraph.kg.sandbox", { namespace });
    }
    return {
      generatedAt: new Date().toISOString(),
      version: this.version,
      nodes: protectedNodes,
      edges: residency.edges,
      serviceRisk,
      sandbox: this.options.sandboxMode,
      namespace,
      warnings: this.mergeWarnings(warnings, residency.warnings),
      lineage,
      stats: {
        nodes: protectedNodes.length,
        edges: residency.edges.length,
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
        residencyFiltered: residency.filteredCount,
      },
      encryption: this.snapshotEncryptionSummary(residency.nodes),
    };
  }

  getNode(id: string): GraphNode | undefined {
    const node = this.state.nodes.get(id);
    if (!node) {
      return undefined;
    }
    if (this.isResidencyBlocked(node)) {
      return undefined;
    }
    return this.protectNode(node);
  }

  getNodes(ids: string[]): GraphNode[] {
    return ids.map((id) => this.getNode(id)).filter((node): node is GraphNode => Boolean(node));
  }

  queryService(serviceId: string) {
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.kg.query.service", {
      serviceId,
      namespace: this.namespace(),
    });
    this.logInfo("intelgraph.kg.query.start", {
      serviceId,
      namespace: this.namespace(),
    });
    const service = this.state.services.get(serviceId);
    if (!service) {
      span?.end({ found: false });
      return undefined;
    }
    const environments = Array.from(this.state.environments.values()).filter((environment) => {
      const residencyNode: GraphNode = {
        id: `env:${environment.id}`,
        type: "environment",
        data: environment,
      };
      const linked =
        this.state.edges.has(
          edgeId(`service:${serviceId}`, "DEPLOYED_IN", `env:${environment.id}`)
        ) ||
        this.state.edges.has(
          edgeId(`env:${environment.id}`, "DEPLOYED_IN", `service:${serviceId}`)
        );
      return linked && !this.isResidencyBlocked(residencyNode);
    });
    const incidents = Array.from(this.state.incidents.values()).filter((incident) => {
      const residencyNode: GraphNode = {
        id: `incident:${incident.id}`,
        type: "incident",
        data: incident,
      };
      return incident.serviceId === serviceId && !this.isResidencyBlocked(residencyNode);
    });
    const policies = Array.from(this.state.policies.values()).filter((policy) =>
      policy.resources.some((resource) => resource.includes(serviceId))
    );
    const pipelines = Array.from(this.state.pipelines.values()).filter((pipeline) =>
      pipeline.stages.some((stage) => stage.serviceId === serviceId)
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
    const resultCount = environments.length + incidents.length + policies.length + pipelines.length;
    this.events.emitEvent("summit.intelgraph.query.executed", {
      queryType: "service",
      subjectId: serviceId,
      durationMs,
      resultCount,
      riskScore: snapshot.risk?.score ?? 0,
      incidentCount: incidents.length,
    });

    this.metricsObserve("intelgraph_kg_query_duration_ms", durationMs, {
      namespace: this.namespace(),
      queryType: "service",
    });
    this.metricsIncrement("intelgraph_kg_queries_total", 1, {
      namespace: this.namespace(),
      queryType: "service",
    });
    this.logInfo("intelgraph.kg.query.completed", {
      serviceId,
      durationMs,
      resultCount,
      incidentCount: incidents.length,
      riskScore: snapshot.risk?.score ?? 0,
    });
    span?.end({ durationMs, resultCount, risk: snapshot.risk?.score });

    return snapshot;
  }

  applyUpdate(update: GraphUpdate): GraphSnapshot {
    if (this.options.requireConfirmation && !this.options.confirmationProvided) {
      throw new Error("Graph refresh confirmation required but not provided");
    }

    const previousState = this.cloneState();
    const startedAt = Date.now();
    const source = update.source ?? "intelgraph.stream";
    const namespace = update.namespace ?? this.namespace();
    const span = this.startSpan("intelgraph.kg.stream.update", {
      source,
      topic: update.topic,
      namespace,
    });

    const serviceDelta = this.mergeRecords(this.state.services, update.services, update, "service");
    const environmentDelta = this.mergeRecords(
      this.state.environments,
      update.environments,
      update,
      "environment"
    );
    const pipelineDelta = this.mergePipelineRecords(this.state.pipelines, update.pipelines, update);
    const incidentDelta = this.mergeRecords(
      this.state.incidents,
      update.incidents,
      update,
      "incident"
    );
    const policyDelta = this.mergeRecords(this.state.policies, update.policies, update, "policy");
    const costSignalDelta = this.mergeRecords(
      this.state.costSignals,
      update.costSignals,
      update,
      "cost-signal",
      (record) => `${record.serviceId}:${record.timeBucket}`
    );

    this.mergeStreamNodes(update.nodes, update);
    this.mergeStreamEdges(update.edges, update);
    this.applyDeletions(update.deletions);

    this.rebuildGraph();

    const durationMs = Date.now() - startedAt;
    this.version += 1;
    const snapshot = this.snapshot(durationMs);
    const mutationDelta =
      Math.abs(snapshot.nodes.length - previousState.nodes.size) +
      Math.abs(snapshot.edges.length - previousState.edges.size);

    if (
      this.options.mutationThreshold !== undefined &&
      mutationDelta > this.options.mutationThreshold
    ) {
      this.restoreState(previousState);
      const error = new Error(
        `Refusing to mutate graph by ${mutationDelta} elements without confirmation`
      );
      this.logWarn("intelgraph.kg.stream.blocked", {
        namespace,
        mutationDelta,
        threshold: this.options.mutationThreshold,
      });
      span?.recordException?.(error);
      span?.end({ error: error.message });
      throw error;
    }

    this.metricsObserve("intelgraph_kg_stream_update_ms", durationMs, {
      source,
    });
    this.metricsIncrement("intelgraph_kg_stream_updates_total", 1, {
      source,
      topic: update.topic ?? "unspecified",
    });
    this.events.emitEvent("summit.intelgraph.graph.updated", {
      source,
      ingress: update.ingress ?? "message-broker",
      namespace,
      trigger: "stream",
      version: this.version,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      durationMs,
      topic: update.topic,
      correlationId: update.correlationId,
    });

    if (update.agentTriggers) {
      for (const trigger of update.agentTriggers) {
        this.events.emitEvent("summit.intelgraph.agent.triggered", {
          agent: trigger.agent,
          reason: trigger.reason,
          priority: trigger.priority ?? "normal",
          namespace,
          graphVersion: this.version,
          correlationId: trigger.correlationId ?? update.correlationId,
          payload: trigger.payload,
        });
      }
    }

    this.logInfo("intelgraph.kg.stream.update", {
      namespace,
      source,
      topic: update.topic,
      durationMs,
      services: serviceDelta.added + serviceDelta.updated,
      environments: environmentDelta.added + environmentDelta.updated,
      pipelines: pipelineDelta.added + pipelineDelta.updated,
      incidents: incidentDelta.added + incidentDelta.updated,
      policies: policyDelta.added + policyDelta.updated,
      costSignals: costSignalDelta.added + costSignalDelta.updated,
      nodes: update.nodes?.length ?? 0,
      edges: update.edges?.length ?? 0,
    });
    span?.end({ durationMs, mutationDelta, nodeCount: snapshot.nodes.length });
    return snapshot;
  }

  private namespace(): string {
    if (this.options.namespace) {
      return this.options.namespace;
    }
    return this.options.sandboxMode ? "intelgraph-sandbox" : "intelgraph";
  }

  private mergeRecords<T extends { provenance?: GraphProvenance }>(
    map: Map<string, T>,
    records: T[] | undefined,
    update: GraphUpdate,
    type: string,
    idSelector: (record: T) => string = (record) => (record as unknown as { id: string }).id
  ): { added: number; updated: number } {
    if (!records || records.length === 0) {
      return { added: 0, updated: 0 };
    }

    let added = 0;
    let updated = 0;
    for (const record of records) {
      const id = idSelector(record);
      const provenance = record.provenance ?? this.defaultStreamProvenance(update, `${type}:${id}`);
      const enrichedRecord = { ...record, provenance } as T;
      if (map.has(id)) {
        updated += 1;
      } else {
        added += 1;
      }
      map.set(id, enrichedRecord);
    }
    return { added, updated };
  }

  private mergePipelineRecords(
    map: Map<string, PipelineRecord>,
    records: PipelineRecord[] | undefined,
    update: GraphUpdate
  ): { added: number; updated: number } {
    if (!records || records.length === 0) {
      return { added: 0, updated: 0 };
    }

    let added = 0;
    let updated = 0;
    for (const record of records) {
      const provenance =
        record.provenance ?? this.defaultStreamProvenance(update, `pipeline:${record.id}`);
      const stages = record.stages.map((stage) => ({
        ...stage,
        provenance:
          stage.provenance ??
          this.defaultStreamProvenance(update, `stage:${stage.id}:${record.id}`),
      }));
      const pipeline: PipelineRecord = { ...record, provenance, stages };
      if (map.has(record.id)) {
        updated += 1;
      } else {
        added += 1;
      }
      map.set(record.id, pipeline);
    }
    return { added, updated };
  }

  private mergeStreamNodes(nodes: GraphNode[] | undefined, update: GraphUpdate): void {
    if (!nodes) {
      return;
    }
    for (const node of nodes) {
      const provenance = node.provenance ?? this.defaultStreamProvenance(update, node.id);
      this.state.streamNodes.set(node.id, { ...node, provenance });
    }
  }

  private mergeStreamEdges(edges: GraphEdge[] | undefined, update: GraphUpdate): void {
    if (!edges) {
      return;
    }
    for (const edge of edges) {
      const provenance = edge.provenance ?? this.defaultStreamProvenance(update, edge.id);
      this.state.streamEdges.set(edge.id, { ...edge, provenance });
    }
  }

  private applyDeletions(deletions: GraphUpdate["deletions"]): void {
    if (!deletions) {
      return;
    }
    deletions.services?.forEach((id) => this.state.services.delete(id));
    deletions.environments?.forEach((id) => this.state.environments.delete(id));
    deletions.pipelines?.forEach((id) => this.state.pipelines.delete(id));
    deletions.incidents?.forEach((id) => this.state.incidents.delete(id));
    deletions.policies?.forEach((id) => this.state.policies.delete(id));
    deletions.costSignals?.forEach((id) => this.state.costSignals.delete(id));
    deletions.nodes?.forEach((id) => {
      this.state.streamNodes.delete(id);
      this.state.nodes.delete(id);
    });
    deletions.edges?.forEach((id) => {
      this.state.streamEdges.delete(id);
      this.state.edges.delete(id);
    });
  }

  private defaultStreamProvenance(update: GraphUpdate, seed: string): GraphProvenance {
    const observedAt = update.observedAt ?? new Date().toISOString();
    const lineage = new Set<string>();
    if (update.correlationId) {
      lineage.add(update.correlationId);
    }
    return {
      source: update.source ?? "intelgraph.stream",
      ingress: update.ingress ?? "message-broker",
      observedAt,
      traceId: update.traceId,
      checksum: stableHash({ seed, observedAt, topic: update.topic, source: update.source }),
      lineage: Array.from(lineage),
      attributes: update.topic ? { topic: update.topic } : undefined,
    } satisfies GraphProvenance;
  }

  private cloneState(): GraphState {
    return {
      nodes: new Map(this.state.nodes),
      edges: new Map(this.state.edges),
      streamNodes: new Map(this.state.streamNodes),
      streamEdges: new Map(this.state.streamEdges),
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
    this.state.streamNodes.clear();
    this.state.streamEdges.clear();
    this.state.pipelines.clear();
    this.state.services.clear();
    this.state.environments.clear();
    this.state.incidents.clear();
    this.state.policies.clear();
    this.state.costSignals.clear();

    snapshot.nodes.forEach((value, key) => this.state.nodes.set(key, value));
    snapshot.edges.forEach((value, key) => this.state.edges.set(key, value));
    snapshot.streamNodes.forEach((value, key) => this.state.streamNodes.set(key, value));
    snapshot.streamEdges.forEach((value, key) => this.state.streamEdges.set(key, value));
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
    const span = this.startSpan("intelgraph.kg.ingest.services", {
      connectors: this.serviceConnectors.length,
    });
    const results = await Promise.all(
      this.serviceConnectors.map((connector) => connector.loadServices())
    );
    for (const record of results.flat()) {
      this.state.services.set(record.id, record);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.kg.ingest.services", {
      durationMs,
      count: this.state.services.size,
    });
    this.metricsObserve("intelgraph_kg_ingest_services_ms", durationMs, {
      connectors: this.serviceConnectors.length,
    });
    this.metricsIncrement("intelgraph_kg_services_total", this.state.services.size);
    span?.end({ durationMs, count: this.state.services.size });
  }

  private async ingestEnvironments(): Promise<void> {
    if (this.environmentConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.kg.ingest.environments", {
      connectors: this.environmentConnectors.length,
    });
    const results = await Promise.all(
      this.environmentConnectors.map((connector) => connector.loadEnvironments())
    );
    for (const record of results.flat()) {
      this.state.environments.set(record.id, record);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.kg.ingest.environments", {
      durationMs,
      count: this.state.environments.size,
    });
    this.metricsObserve("intelgraph_kg_ingest_environments_ms", durationMs, {
      connectors: this.environmentConnectors.length,
    });
    this.metricsIncrement("intelgraph_kg_environments_total", this.state.environments.size);
    span?.end({ durationMs, count: this.state.environments.size });
  }

  private async ingestPipelines(): Promise<void> {
    if (this.pipelineConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.kg.ingest.pipelines", {
      connectors: this.pipelineConnectors.length,
    });
    const results = await Promise.all(
      this.pipelineConnectors.map((connector) => connector.loadPipelines())
    );
    for (const pipeline of results.flat()) {
      this.state.pipelines.set(pipeline.id, pipeline);
      for (const stage of pipeline.stages) {
        this.state.nodes.set(`stage:${stage.id}`, {
          id: `stage:${stage.id}`,
          type: "stage",
          data: stage,
        });
      }
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.kg.ingest.pipelines", {
      durationMs,
      pipelines: this.state.pipelines.size,
    });
    this.metricsObserve("intelgraph_kg_ingest_pipelines_ms", durationMs, {
      connectors: this.pipelineConnectors.length,
    });
    this.metricsIncrement("intelgraph_kg_pipelines_total", this.state.pipelines.size);
    span?.end({ durationMs, pipelines: this.state.pipelines.size });
  }

  private async ingestIncidents(): Promise<void> {
    if (this.incidentConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.kg.ingest.incidents", {
      connectors: this.incidentConnectors.length,
    });
    const results = await Promise.all(
      this.incidentConnectors.map((connector) => connector.loadIncidents())
    );
    for (const incident of results.flat()) {
      this.state.incidents.set(incident.id, incident);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.kg.ingest.incidents", {
      durationMs,
      incidents: this.state.incidents.size,
    });
    this.metricsObserve("intelgraph_kg_ingest_incidents_ms", durationMs, {
      connectors: this.incidentConnectors.length,
    });
    this.metricsIncrement("intelgraph_kg_incidents_total", this.state.incidents.size);
    span?.end({ durationMs, incidents: this.state.incidents.size });
  }

  private async ingestPolicies(): Promise<void> {
    if (this.policyConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.kg.ingest.policies", {
      connectors: this.policyConnectors.length,
    });
    const results = await Promise.all(
      this.policyConnectors.map((connector) => connector.loadPolicies())
    );
    for (const policy of results.flat()) {
      this.state.policies.set(policy.id, policy);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.kg.ingest.policies", {
      durationMs,
      policies: this.state.policies.size,
    });
    this.metricsObserve("intelgraph_kg_ingest_policies_ms", durationMs, {
      connectors: this.policyConnectors.length,
    });
    this.metricsIncrement("intelgraph_kg_policies_total", this.state.policies.size);
    span?.end({ durationMs, policies: this.state.policies.size });
  }

  private async ingestCostSignals(): Promise<void> {
    if (this.costSignalConnectors.length === 0) {
      return;
    }
    const startedAt = Date.now();
    const span = this.startSpan("intelgraph.kg.ingest.costSignals", {
      connectors: this.costSignalConnectors.length,
    });
    const results = await Promise.all(
      this.costSignalConnectors.map((connector) => connector.loadCostSignals())
    );
    for (const signal of results.flat()) {
      const id = `${signal.serviceId}:${signal.timeBucket}`;
      this.state.costSignals.set(id, signal);
    }
    const durationMs = Date.now() - startedAt;
    this.logInfo("intelgraph.kg.ingest.costSignals", {
      durationMs,
      costSignals: this.state.costSignals.size,
    });
    this.metricsObserve("intelgraph_kg_ingest_cost_signals_ms", durationMs, {
      connectors: this.costSignalConnectors.length,
    });
    this.metricsIncrement("intelgraph_kg_cost_signals_total", this.state.costSignals.size);
    span?.end({ durationMs, costSignals: this.state.costSignals.size });
  }

  private provenanceForRecord(
    record: { provenance?: GraphProvenance },
    type: NodeType,
    nodeId: string
  ): GraphProvenance {
    const checksum = record.provenance?.checksum ?? stableHash({ type, nodeId, record });
    const lineage = new Set(record.provenance?.lineage ?? []);
    if (record.provenance?.checksum) {
      lineage.add(record.provenance.checksum);
    }
    return {
      source: record.provenance?.source ?? "intelgraph.connector",
      ingress: record.provenance?.ingress ?? "ingestion",
      observedAt: record.provenance?.observedAt ?? new Date().toISOString(),
      traceId: record.provenance?.traceId,
      checksum,
      lineage: Array.from(lineage),
      attributes: record.provenance?.attributes,
      signature: record.provenance?.signature,
    };
  }

  private edgeProvenance(
    type: RelationshipType,
    from?: GraphProvenance,
    to?: GraphProvenance
  ): GraphProvenance {
    const observedAt = new Date().toISOString();
    const parents = [from?.checksum, to?.checksum].filter(Boolean) as string[];
    const lineage = new Set<string>([...(from?.lineage ?? []), ...(to?.lineage ?? []), ...parents]);
    return {
      source: "intelgraph.graph-builder",
      ingress: "ingestion",
      observedAt,
      traceId: from?.traceId ?? to?.traceId,
      checksum: stableHash({ type, observedAt, parents }),
      lineage: Array.from(lineage),
    };
  }

  private lineageSummary(nodes: GraphNode[], edges: GraphEdge[]) {
    const missingNodes = nodes.filter((node) => !node.provenance).map((node) => node.id);
    const missingEdges = edges.filter((edge) => !edge.provenance).map((edge) => edge.id);
    return {
      nodesWithProvenance: nodes.length - missingNodes.length,
      edgesWithProvenance: edges.length - missingEdges.length,
      missingNodes,
      missingEdges,
    };
  }

  private mergeWarnings(...warnings: Array<string[] | undefined>): string[] | undefined {
    const merged = warnings.flatMap((warning) => warning ?? []);
    return merged.length ? Array.from(new Set(merged)) : undefined;
  }

  private protectionMode(): KnowledgeGraphEncryptionMode {
    if (!this.encryption?.secret) {
      return "transparent";
    }
    return this.encryption.mode ?? "encrypt-sensitive";
  }

  private shouldEncryptNode(node: GraphNode): boolean {
    if (this.protectionMode() !== "encrypt-sensitive") {
      return false;
    }
    if (!this.encryption?.secret) {
      return false;
    }
    const sensitiveTypes = new Set(
      this.encryption.sensitiveTypes ?? ["service", "environment", "incident"]
    );
    const sensitiveFields = new Set(
      this.encryption.sensitiveFields ?? ["piiClassification", "soxCritical", "owner"]
    );
    const hasSensitiveField = Object.keys(node.data ?? {}).some((field) =>
      sensitiveFields.has(field)
    );
    const sensitivityAttribute = node.provenance?.attributes
      ? (node.provenance.attributes as Record<string, unknown>).sensitivity
      : undefined;
    const provenanceSensitivity =
      typeof sensitivityAttribute === "string" && sensitivityAttribute.toLowerCase() !== "public";
    return sensitiveTypes.has(node.type) || hasSensitiveField || provenanceSensitivity;
  }

  private protectNode(node: GraphNode): GraphNode {
    if (!this.shouldEncryptNode(node)) {
      return node;
    }
    if (!this.encryption) {
      return node;
    }
    const encryptedPayload = encryptPayload(node.data, this.encryption);
    return {
      ...node,
      data: encryptedPayload,
      provenance: {
        ...node.provenance,
        attributes: {
          ...node.provenance?.attributes,
          encrypted: true,
          encryptionAlgorithm: encryptedPayload.algorithm,
        },
      },
    } satisfies GraphNode;
  }

  private isResidencyBlocked(node: GraphNode): boolean {
    if (!this.dataResidency) {
      return false;
    }
    const allowed = new Set(
      this.dataResidency.allowedRegions.map((region) => region.toLowerCase())
    );
    const region =
      typeof node.data === "object" && node.data !== null
        ? (node.data as Record<string, unknown>).region
        : undefined;
    if (typeof region === "string") {
      return !allowed.has(region.toLowerCase());
    }
    return Boolean(this.dataResidency.denyUnknown);
  }

  private enforceDataResidency(
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): { nodes: GraphNode[]; edges: GraphEdge[]; warnings?: string[]; filteredCount: number } {
    if (!this.dataResidency) {
      return { nodes, edges, filteredCount: 0 };
    }
    const filteredNodeIds = new Set<string>();
    const residencyWarnings: string[] = [];

    const filteredNodes = nodes.filter((node) => {
      if (this.isResidencyBlocked(node)) {
        filteredNodeIds.add(node.id);
        return false;
      }
      return true;
    });

    const filteredEdges = edges.filter(
      (edge) => !filteredNodeIds.has(edge.from) && !filteredNodeIds.has(edge.to)
    );

    if (filteredNodeIds.size) {
      residencyWarnings.push(
        `Data residency filter removed ${filteredNodeIds.size} node(s) outside of ${this.dataResidency.allowedRegions.join(", ")}`
      );
    }

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      warnings: residencyWarnings.length ? residencyWarnings : undefined,
      filteredCount: filteredNodeIds.size,
    };
  }

  private snapshotEncryptionSummary(nodes: GraphNode[]): GraphSnapshot["encryption"] {
    if (this.protectionMode() === "transparent" || !this.encryption?.secret) {
      return undefined;
    }
    const sensitiveNodes = nodes.filter((node) => isEncryptedPayload(node.data)).length;
    return {
      mode: this.protectionMode(),
      algorithm: this.encryption.algorithm ?? "aes-256-gcm",
      sensitiveNodes,
    };
  }

  private rebuildGraph(): void {
    this.state.nodes.clear();
    this.state.edges.clear();

    const nodeProvenance = new Map<string, GraphProvenance>();

    for (const service of this.state.services.values()) {
      const nodeId = `service:${service.id}`;
      const provenance = this.provenanceForRecord(service, "service", nodeId);
      nodeProvenance.set(nodeId, provenance);
      this.state.nodes.set(nodeId, {
        id: nodeId,
        type: "service",
        data: service,
        provenance,
      });
      for (const dependency of service.dependencies ?? []) {
        const edge = {
          id: edgeId(`service:${service.id}`, "DEPENDS_ON", `service:${dependency}`),
          from: `service:${service.id}`,
          to: `service:${dependency}`,
          type: "DEPENDS_ON" as const,
          provenance: this.edgeProvenance(
            "DEPENDS_ON",
            provenance,
            nodeProvenance.get(`service:${dependency}`)
          ),
        } satisfies GraphEdge;
        this.state.edges.set(edge.id, edge);
      }
    }

    for (const environment of this.state.environments.values()) {
      const nodeId = `env:${environment.id}`;
      const provenance = this.provenanceForRecord(environment, "environment", nodeId);
      nodeProvenance.set(nodeId, provenance);
      this.state.nodes.set(nodeId, {
        id: nodeId,
        type: "environment",
        data: environment,
        provenance,
      });
    }

    for (const pipeline of this.state.pipelines.values()) {
      const pipelineNodeId = `pipeline:${pipeline.id}`;
      const pipelineProv = this.provenanceForRecord(pipeline, "pipeline", pipelineNodeId);
      nodeProvenance.set(pipelineNodeId, pipelineProv);
      this.state.nodes.set(pipelineNodeId, {
        id: pipelineNodeId,
        type: "pipeline",
        data: pipeline,
        provenance: pipelineProv,
      });
      for (const stage of pipeline.stages) {
        const stageNode: GraphNode = {
          id: `stage:${stage.id}`,
          type: "stage",
          data: stage,
          provenance: this.provenanceForRecord(stage, "stage", `stage:${stage.id}`),
        };
        nodeProvenance.set(stageNode.id, stageNode.provenance!);
        this.state.nodes.set(stageNode.id, stageNode);
        const containsEdge: GraphEdge = {
          id: edgeId(`pipeline:${pipeline.id}`, "CONTAINS", stageNode.id),
          from: `pipeline:${pipeline.id}`,
          to: stageNode.id,
          type: "CONTAINS",
          provenance: this.edgeProvenance("CONTAINS", pipelineProv, stageNode.provenance),
        };
        this.state.edges.set(containsEdge.id, containsEdge);

        const serviceEdge: GraphEdge = {
          id: edgeId(stageNode.id, "TARGETS", `service:${stage.serviceId}`),
          from: stageNode.id,
          to: `service:${stage.serviceId}`,
          type: "TARGETS",
          provenance: this.edgeProvenance(
            "TARGETS",
            stageNode.provenance,
            nodeProvenance.get(`service:${stage.serviceId}`)
          ),
        };
        this.state.edges.set(serviceEdge.id, serviceEdge);

        const envEdge: GraphEdge = {
          id: edgeId(stageNode.id, "RUNS_IN", `env:${stage.environmentId}`),
          from: stageNode.id,
          to: `env:${stage.environmentId}`,
          type: "RUNS_IN",
          provenance: this.edgeProvenance(
            "RUNS_IN",
            stageNode.provenance,
            nodeProvenance.get(`env:${stage.environmentId}`)
          ),
        };
        this.state.edges.set(envEdge.id, envEdge);
      }
    }

    for (const incident of this.state.incidents.values()) {
      const incidentNode: GraphNode = {
        id: `incident:${incident.id}`,
        type: "incident",
        data: incident,
        provenance: this.provenanceForRecord(incident, "incident", `incident:${incident.id}`),
      };
      nodeProvenance.set(incidentNode.id, incidentNode.provenance!);
      this.state.nodes.set(incidentNode.id, incidentNode);
      const serviceEdge: GraphEdge = {
        id: edgeId(incidentNode.id, "AFFECTS", `service:${incident.serviceId}`),
        from: incidentNode.id,
        to: `service:${incident.serviceId}`,
        type: "AFFECTS",
        metadata: { severity: incident.severity, occurredAt: incident.occurredAt },
        provenance: this.edgeProvenance(
          "AFFECTS",
          incidentNode.provenance,
          nodeProvenance.get(`service:${incident.serviceId}`)
        ),
      };
      this.state.edges.set(serviceEdge.id, serviceEdge);
      const envEdge: GraphEdge = {
        id: edgeId(incidentNode.id, "OCCURRED_IN", `env:${incident.environmentId}`),
        from: incidentNode.id,
        to: `env:${incident.environmentId}`,
        type: "OCCURRED_IN",
        provenance: this.edgeProvenance(
          "OCCURRED_IN",
          incidentNode.provenance,
          nodeProvenance.get(`env:${incident.environmentId}`)
        ),
      };
      this.state.edges.set(envEdge.id, envEdge);
    }

    for (const policy of this.state.policies.values()) {
      const policyNode: GraphNode = {
        id: `policy:${policy.id}`,
        type: "policy",
        data: policy,
        provenance: this.provenanceForRecord(
          policy as unknown as { provenance?: GraphProvenance },
          "policy",
          `policy:${policy.id}`
        ),
      };
      nodeProvenance.set(policyNode.id, policyNode.provenance!);
      this.state.nodes.set(policyNode.id, policyNode);
      for (const resource of policy.resources) {
        const targetId = resource.includes(":") ? resource : `service:${resource}`;
        const edge: GraphEdge = {
          id: edgeId(policyNode.id, "GOVERNS", targetId),
          from: policyNode.id,
          to: targetId,
          type: "GOVERNS",
          provenance: this.edgeProvenance(
            "GOVERNS",
            policyNode.provenance,
            nodeProvenance.get(targetId)
          ),
        };
        this.state.edges.set(edge.id, edge);
      }
    }

    for (const signal of this.state.costSignals.values()) {
      const signalNode: GraphNode = {
        id: `cost:${signal.serviceId}:${signal.timeBucket}`,
        type: "cost-signal",
        data: signal,
        provenance: this.provenanceForRecord(
          signal,
          "cost-signal" as NodeType,
          `cost:${signal.serviceId}:${signal.timeBucket}`
        ),
      };
      nodeProvenance.set(signalNode.id, signalNode.provenance!);
      this.state.nodes.set(signalNode.id, signalNode);
      const edge: GraphEdge = {
        id: edgeId(signalNode.id, "OBSERVED_FOR", `service:${signal.serviceId}`),
        from: signalNode.id,
        to: `service:${signal.serviceId}`,
        type: "OBSERVED_FOR",
        provenance: this.edgeProvenance(
          "OBSERVED_FOR",
          signalNode.provenance,
          nodeProvenance.get(`service:${signal.serviceId}`)
        ),
      };
      this.state.edges.set(edge.id, edge);
    }

    for (const node of this.state.streamNodes.values()) {
      this.state.nodes.set(node.id, node);
    }
    for (const edge of this.state.streamEdges.values()) {
      this.state.edges.set(edge.id, edge);
    }
  }

  private calculateServiceRisk(): Record<string, ServiceRiskProfile> {
    const risk: Record<string, ServiceRiskProfile> = {};
    const now = new Date().toISOString();

    for (const service of this.state.services.values()) {
      const serviceId = service.id;
      const incidents = Array.from(this.state.incidents.values()).filter(
        (incident) => incident.serviceId === serviceId
      );
      const costSignals = Array.from(this.state.costSignals.values()).filter(
        (signal) => signal.serviceId === serviceId
      );
      const policies = Array.from(this.state.policies.values()).filter((policy) =>
        policy.resources.some((resource) => resource.includes(serviceId))
      );

      const incidentLoad = incidents.reduce((acc, incident) => {
        const weight = INCIDENT_SEVERITY_WEIGHTS[incident.severity] ?? 0.2;
        const openMultiplier = incident.status === "open" ? 1.3 : 0.6;
        return acc + weight * openMultiplier;
      }, 0);
      const recentCostSignal = costSignals[costSignals.length - 1];
      const costPressure = recentCostSignal
        ? clamp(
            recentCostSignal.saturation * 0.6 +
              recentCostSignal.budgetBreaches * 0.25 +
              recentCostSignal.throttleCount * 0.2,
            0,
            1.2
          )
        : 0;
      const policyRisk = policies.some((policy) => policy.tags?.includes("high-risk")) ? 0.8 : 0.3;

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
    attributes?: Record<string, string | number>
  ): void {
    this.options.metrics?.observe?.(metric, value, attributes);
  }

  private metricsIncrement(
    metric: string,
    value = 1,
    attributes?: Record<string, string | number>
  ): void {
    this.options.metrics?.increment?.(metric, value, attributes);
  }

  private startSpan(name: string, attributes?: Record<string, unknown>): TraceSpan | undefined {
    return this.options.tracer?.startSpan?.(name, attributes);
  }
}

export function decryptGraphPayload<T = unknown>(
  payload: unknown,
  secret: string,
  options?: { associatedData?: string }
): T {
  if (!isEncryptedPayload(payload)) {
    throw new Error("Payload is not encrypted data");
  }
  return decryptPayload<T>(payload, secret, options?.associatedData ?? payload.associatedData);
}

export function decryptGraphNode<TData = Record<string, unknown>>(
  node: GraphNode,
  secret: string,
  options?: { associatedData?: string }
): GraphNode<TData> {
  if (!isEncryptedPayload(node.data)) {
    return node as GraphNode<TData>;
  }
  const decrypted = decryptGraphPayload<TData>(node.data, secret, options);
  return { ...node, data: decrypted };
}

export type {
  AgentTrigger,
  CostSignalConnector,
  CostSignalRecord,
  EnvironmentConnector,
  EnvironmentRecord,
  GraphEdge,
  GraphNode,
  GraphUpdate,
  GraphSnapshot,
  IncidentConnector,
  IncidentRecord,
  KnowledgeGraphEncryptionAlgorithm,
  KnowledgeGraphEncryptionMode,
  KnowledgeGraphEncryptionOptions,
  PipelineConnector,
  PipelineRecord,
  PipelineStageRecord,
  PolicyConnector,
  ProtectedNodeSummary,
  ServiceConnector,
  ServiceRecord,
  ServiceRiskProfile,
  DataResidencyOptions,
};

export * from "./osint.js";
export {
  KafkaGraphUpdateStream,
  type KafkaLikeConsumer,
  type KafkaLikeEachMessagePayload,
  type KafkaLikeMessage,
  type KafkaStreamConfig,
} from "./streams.js";
