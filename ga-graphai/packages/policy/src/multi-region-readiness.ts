import type { PolicyRule } from "common-types";

export interface RegionSloTargets {
  readP95Ms: number;
  writeP95Ms: number;
  subscriptionP95Ms: number;
  graphOneHopMs: number;
  graphThreeHopMs: number;
  ingestThroughputPerPod: number;
  ingestLatencyP95Ms: number;
}

export interface RegionDefinition {
  name: string;
  tier: "gold" | "silver" | "bronze";
  primaryWrite: boolean;
  followerReads: boolean;
  dnsWeight: number;
  failoverTargets: string[];
  capacityBuffer: "N+1" | "N+2";
  clockSkewMs: number;
  slo: RegionSloTargets;
  costCaps: {
    infra: number;
    llm: number;
    alertPercent: number;
  };
  residencyTags: string[];
  kmsRoot: boolean;
  opaEnabled: boolean;
  mtlsEnabled: boolean;
}

export interface ResidencyRule {
  residencyLabel: string;
  allowedRegions: string[];
  primaryWriteRegion: string;
  purposes: string[];
}

export interface ReplicationControls {
  strategy: "async-streams";
  conflictResolution: "crdt" | "last-writer";
  signedLedger: boolean;
  deletionSemantics: "region-scoped";
  backoutSupported: boolean;
}

export interface IngestControls {
  adapters: ("object" | "http" | "bus")[];
  privacyFilters: boolean;
  residencyGatekeeper: boolean;
  dlqEnabled: boolean;
  replaySupported: boolean;
  burnAlertsEnabled: boolean;
}

export interface GraphControls {
  regionTagsEnforced: boolean;
  constraintsPersisted: boolean;
  readReplicasPerRegion: boolean;
  backupScheduleMinutes: number;
  healthProbes: boolean;
  auditSubgraph: boolean;
}

export interface ApiEdgeControls {
  regionAwareSchema: boolean;
  queryCostGuard: boolean;
  persistedQueries: boolean;
  rateLimitsPerRegion: boolean;
  cacheHitTargetPercent: number;
  subscriptionFanoutP95Ms: number;
  residencyGate: boolean;
}

export interface TrafficControls {
  healthProbes: boolean;
  circuitBreakers: boolean;
  idempotentRetries: boolean;
  dataFreezeSupported: boolean;
  automationEnabled: boolean;
}

export interface ObservabilityFinopsControls {
  sloDashboards: boolean;
  syntheticProbes: boolean;
  traceSamplingPercent: number;
  costDashboards: boolean;
  surgeBudgets: boolean;
  alertHygiene: boolean;
}

export interface CicdControls {
  overlaysEnabled: boolean;
  policySimulation: boolean;
  postDeployValidation: boolean;
  evidenceBundles: boolean;
  sbomEnabled: boolean;
  oneClickRevert: boolean;
}

export interface CustomerReadinessControls {
  runbooksAvailable: boolean;
  migrationGuides: boolean;
  slaPerRegion: boolean;
  benchmarksPublished: boolean;
  feedbackFunnel: boolean;
}

export interface PredictiveRoutingControls {
  enabled: boolean;
  residencyAwareEdgeWasm: boolean;
  autonomousDrillScheduler: boolean;
}

export interface MultiRegionConfig {
  regions: RegionDefinition[];
  residencyRules: ResidencyRule[];
  replication: ReplicationControls;
  ingest: IngestControls;
  graph: GraphControls;
  apiEdge: ApiEdgeControls;
  traffic: TrafficControls;
  observability: ObservabilityFinopsControls;
  cicd: CicdControls;
  customer: CustomerReadinessControls;
  predictiveRouting: PredictiveRoutingControls;
}

export interface RegionAccessRequest {
  action: "read" | "write" | "ingest" | "graphql" | "subscription" | "replication";
  region: string;
  residencyLabel: string;
  purpose: string;
  dataClasses?: string[];
  environment: "dev" | "stg" | "prod";
  estimatedInfraCost?: number;
  estimatedLlmCost?: number;
  latencyMs?: number;
  isFailover?: boolean;
}

export interface RegionAccessDecision {
  allowed: boolean;
  reasons: string[];
  obligations: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

const DEFAULT_SLOS: RegionSloTargets = {
  readP95Ms: 350,
  writeP95Ms: 700,
  subscriptionP95Ms: 250,
  graphOneHopMs: 300,
  graphThreeHopMs: 1200,
  ingestThroughputPerPod: 1000,
  ingestLatencyP95Ms: 100,
};

const DEFAULT_COST_CAPS = {
  dev: 1000,
  stg: 3000,
  prod: 18000,
  llm: 5000,
  alertPercent: 80,
};

export class MultiRegionReadiness {
  constructor(private readonly config: MultiRegionConfig) {}

  validateConfig(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (this.config.regions.length === 0) {
      issues.push({
        code: "regions.missing",
        message: "At least one region must be defined to satisfy availability goals.",
        severity: "error",
      });
    }

    const primaryRegions = this.config.regions.filter((region) => region.primaryWrite);
    if (primaryRegions.length === 0) {
      issues.push({
        code: "writes.primary.missing",
        message: "Active/passive writes require at least one primary region.",
        severity: "error",
      });
    }

    for (const region of this.config.regions) {
      this.validateRegion(region, issues);
    }

    this.validateResidency(issues);
    this.validateReplication(issues);
    this.validateIngest(issues);
    this.validateGraph(issues);
    this.validateApiEdge(issues);
    this.validateTraffic(issues);
    this.validateObservability(issues);
    this.validateCicd(issues);
    this.validateCustomer(issues);
    this.validatePredictiveRouting(issues);

    return issues;
  }

  assertValid(): void {
    const issues = this.validateConfig();
    const errors = issues.filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
      const messages = errors.map((issue) => `${issue.code}: ${issue.message}`).join("; ");
      throw new Error(`Multi-region readiness validation failed: ${messages}`);
    }
  }

  evaluateRequest(request: RegionAccessRequest): RegionAccessDecision {
    const reasons: string[] = [];
    const obligations: string[] = [];
    const region = this.config.regions.find((candidate) => candidate.name === request.region);
    if (!region) {
      return {
        allowed: false,
        reasons: [`unknown-region:${request.region}`],
        obligations,
      };
    }

    this.assertValid();

    const residencyRule = this.config.residencyRules.find(
      (rule) => rule.residencyLabel === request.residencyLabel
    );

    if (!residencyRule) {
      return {
        allowed: false,
        reasons: [`residency-rule-missing:${request.residencyLabel}`],
        obligations,
      };
    }

    if (!residencyRule.allowedRegions.includes(request.region)) {
      reasons.push("deny:residency-block");
    }

    if (
      request.action === "write" &&
      request.region !== residencyRule.primaryWriteRegion &&
      !request.isFailover
    ) {
      reasons.push("deny:primary-write-only");
    }

    if (request.action === "write" && request.isFailover) {
      const allowed = region.failoverTargets.includes(residencyRule.primaryWriteRegion);
      if (!allowed) {
        reasons.push("deny:failover-target-missing");
      } else {
        obligations.push("emit-pir-template");
      }
    }

    if (request.latencyMs !== undefined) {
      const latencyOk = this.latencyWithinBudgets(request, region);
      if (!latencyOk) {
        reasons.push("deny:slo-breach");
      }
    }

    const costReason = this.checkCostGuardrails(request, region);
    if (costReason) {
      reasons.push(costReason);
      obligations.push("emit-finops-alert");
    }

    if (request.dataClasses?.length) {
      const sensitiveData = request.dataClasses.some((cls) =>
        ["production-PII", "secrets", "proprietary-client"].includes(cls)
      );
      if (sensitiveData && !region.mtlsEnabled) {
        reasons.push("deny:mtls-required");
      }
      if (sensitiveData) {
        obligations.push("apply-privacy-filter");
      }
    }

    const blockingReasons = reasons.filter((reason) => reason.startsWith("deny:"));
    const decision: RegionAccessDecision = {
      allowed: blockingReasons.length === 0,
      reasons: blockingReasons.length === 0 && reasons.length === 0 ? ["allow:compliant"] : reasons,
      obligations,
    };

    return decision;
  }

  buildPolicyRules(): PolicyRule[] {
    return this.config.residencyRules.map((rule) => ({
      id: `residency-${rule.residencyLabel}`,
      description: `Residency enforcement for ${rule.residencyLabel}`,
      effect: "allow",
      actions: ["read", "write", "ingest", "graphql", "subscription", "replication"],
      resources: ["tenant-data"],
      conditions: [
        { attribute: "region", operator: "includes", value: rule.allowedRegions },
        { attribute: "purpose", operator: "includes", value: rule.purposes },
      ],
      obligations: [{ type: "emit-audit" }, { type: "record-provenance" }],
    }));
  }

  private validateRegion(region: RegionDefinition, issues: ValidationIssue[]): void {
    const { slo } = region;
    if (slo.readP95Ms > DEFAULT_SLOS.readP95Ms) {
      issues.push({
        code: `slo.read.${region.name}`,
        message: `Read p95 must be <= ${DEFAULT_SLOS.readP95Ms}ms`,
        severity: "error",
      });
    }
    if (slo.writeP95Ms > DEFAULT_SLOS.writeP95Ms) {
      issues.push({
        code: `slo.write.${region.name}`,
        message: `Write p95 must be <= ${DEFAULT_SLOS.writeP95Ms}ms`,
        severity: "error",
      });
    }
    if (slo.subscriptionP95Ms > DEFAULT_SLOS.subscriptionP95Ms) {
      issues.push({
        code: `slo.subs.${region.name}`,
        message: `Subscription p95 must be <= ${DEFAULT_SLOS.subscriptionP95Ms}ms`,
        severity: "error",
      });
    }
    if (slo.graphOneHopMs > DEFAULT_SLOS.graphOneHopMs) {
      issues.push({
        code: `slo.graph1.${region.name}`,
        message: `Graph 1-hop must be <= ${DEFAULT_SLOS.graphOneHopMs}ms`,
        severity: "error",
      });
    }
    if (slo.graphThreeHopMs > DEFAULT_SLOS.graphThreeHopMs) {
      issues.push({
        code: `slo.graph3.${region.name}`,
        message: `Graph 2-3 hop must be <= ${DEFAULT_SLOS.graphThreeHopMs}ms`,
        severity: "error",
      });
    }
    if (slo.ingestThroughputPerPod < DEFAULT_SLOS.ingestThroughputPerPod) {
      issues.push({
        code: `ingest.throughput.${region.name}`,
        message: `Ingest throughput per pod must be >= ${DEFAULT_SLOS.ingestThroughputPerPod}`,
        severity: "error",
      });
    }
    if (slo.ingestLatencyP95Ms > DEFAULT_SLOS.ingestLatencyP95Ms) {
      issues.push({
        code: `ingest.latency.${region.name}`,
        message: `Ingest latency p95 must be <= ${DEFAULT_SLOS.ingestLatencyP95Ms}ms`,
        severity: "error",
      });
    }
    if (region.capacityBuffer === "N+1" && region.primaryWrite && !region.followerReads) {
      issues.push({
        code: `capacity.buffer.${region.name}`,
        message: "Primary write regions must expose follower reads to honour N+1 resilience.",
        severity: "warning",
      });
    }
    if (region.clockSkewMs > 50) {
      issues.push({
        code: `clock.skew.${region.name}`,
        message: "Clock skew must be <= 50ms to protect provenance ordering.",
        severity: "error",
      });
    }
    if (!region.kmsRoot) {
      issues.push({
        code: `kms.root.${region.name}`,
        message: "Regional KMS root is required.",
        severity: "error",
      });
    }
    if (!region.opaEnabled) {
      issues.push({
        code: `opa.${region.name}`,
        message: "OPA must be enabled for ABAC enforcement.",
        severity: "error",
      });
    }
    if (!region.mtlsEnabled) {
      issues.push({
        code: `mtls.${region.name}`,
        message: "mTLS must be enforced at the edge and mesh.",
        severity: "error",
      });
    }
  }

  private validateResidency(issues: ValidationIssue[]): void {
    for (const rule of this.config.residencyRules) {
      if (!rule.allowedRegions.includes(rule.primaryWriteRegion)) {
        issues.push({
          code: `residency.primary.${rule.residencyLabel}`,
          message: "Primary write region must be part of the allowed residency set.",
          severity: "error",
        });
      }
      if (rule.purposes.length === 0) {
        issues.push({
          code: `residency.purpose.${rule.residencyLabel}`,
          message: "Residency rules must define supported purposes.",
          severity: "error",
        });
      }
    }
  }

  private validateReplication(issues: ValidationIssue[]): void {
    const replication = this.config.replication;
    if (replication.strategy !== "async-streams") {
      issues.push({
        code: "replication.strategy",
        message: "Replication must use async streams for multi-region durability.",
        severity: "error",
      });
    }
    if (!replication.signedLedger) {
      issues.push({
        code: "replication.ledger",
        message: "Replication movement must be signed for auditability.",
        severity: "error",
      });
    }
    if (replication.deletionSemantics !== "region-scoped") {
      issues.push({
        code: "replication.deletion",
        message: "Deletion semantics must be region-scoped with RTBF support.",
        severity: "error",
      });
    }
    if (!replication.backoutSupported) {
      issues.push({
        code: "replication.backout",
        message: "Backout path for bad replication must be supported.",
        severity: "error",
      });
    }
  }

  private validateIngest(issues: ValidationIssue[]): void {
    const ingest = this.config.ingest;
    if (ingest.adapters.length === 0) {
      issues.push({
        code: "ingest.adapters",
        message: "At least one regional adapter is required.",
        severity: "error",
      });
    }
    if (!ingest.privacyFilters || !ingest.residencyGatekeeper) {
      issues.push({
        code: "ingest.privacy",
        message: "Privacy filters and residency gatekeeper must run before export.",
        severity: "error",
      });
    }
    if (!ingest.dlqEnabled) {
      issues.push({
        code: "ingest.dlq",
        message: "DLQ must be enabled for backpressure protection.",
        severity: "error",
      });
    }
    if (!ingest.replaySupported) {
      issues.push({
        code: "ingest.replay",
        message: "Replay/backfill must be supported cross-region.",
        severity: "error",
      });
    }
    if (!ingest.burnAlertsEnabled) {
      issues.push({
        code: "ingest.burn-alerts",
        message: "Burn-rate alerts for ingest SLOs must be enabled.",
        severity: "error",
      });
    }
  }

  private validateGraph(issues: ValidationIssue[]): void {
    const graph = this.config.graph;
    if (!graph.regionTagsEnforced) {
      issues.push({
        code: "graph.tags",
        message: "Region tags on nodes and edges must be enforced.",
        severity: "error",
      });
    }
    if (!graph.constraintsPersisted) {
      issues.push({
        code: "graph.constraints",
        message: "Constraints and indexes must be persisted.",
        severity: "error",
      });
    }
    if (!graph.readReplicasPerRegion) {
      issues.push({
        code: "graph.replicas",
        message: "Read replicas must exist per region.",
        severity: "error",
      });
    }
    if (graph.backupScheduleMinutes > 60) {
      issues.push({
        code: "graph.backup",
        message: "Backups should run at least hourly.",
        severity: "warning",
      });
    }
    if (!graph.healthProbes) {
      issues.push({
        code: "graph.health",
        message: "Health probes for heap/GC/raft must be enabled.",
        severity: "error",
      });
    }
    if (!graph.auditSubgraph) {
      issues.push({
        code: "graph.audit",
        message: "Audit subgraph for cross-region edges is required.",
        severity: "error",
      });
    }
  }

  private validateApiEdge(issues: ValidationIssue[]): void {
    const api = this.config.apiEdge;
    if (!api.regionAwareSchema) {
      issues.push({
        code: "api.schema",
        message: "Global GraphQL schema must be region-aware.",
        severity: "error",
      });
    }
    if (!api.queryCostGuard) {
      issues.push({
        code: "api.cost-guard",
        message: "Query cost guard must be in place.",
        severity: "error",
      });
    }
    if (!api.persistedQueries) {
      issues.push({
        code: "api.persisted",
        message: "Persisted queries must be enforced.",
        severity: "error",
      });
    }
    if (!api.rateLimitsPerRegion) {
      issues.push({
        code: "api.rates",
        message: "Rate limits must be applied per region.",
        severity: "error",
      });
    }
    if (api.cacheHitTargetPercent < 70) {
      issues.push({
        code: "api.cache",
        message: "Edge caching target must be at least 70% hit rate.",
        severity: "error",
      });
    }
    if (api.subscriptionFanoutP95Ms > DEFAULT_SLOS.subscriptionP95Ms) {
      issues.push({
        code: "api.subs",
        message: "Subscription fan-out must be <= 250ms p95.",
        severity: "error",
      });
    }
    if (!api.residencyGate) {
      issues.push({
        code: "api.residency",
        message: "Residency gates must deny cross-border access.",
        severity: "error",
      });
    }
  }

  private validateTraffic(issues: ValidationIssue[]): void {
    const traffic = this.config.traffic;
    if (!traffic.healthProbes) {
      issues.push({
        code: "traffic.health",
        message: "Health probes must feed weighted routing.",
        severity: "error",
      });
    }
    if (!traffic.circuitBreakers) {
      issues.push({
        code: "traffic.circuit-breakers",
        message: "Circuit breakers are required.",
        severity: "error",
      });
    }
    if (!traffic.idempotentRetries) {
      issues.push({
        code: "traffic.idempotent",
        message: "Idempotent retries must be configured for writes.",
        severity: "error",
      });
    }
    if (!traffic.dataFreezeSupported) {
      issues.push({
        code: "traffic.freeze",
        message: "Data freeze modes must be available.",
        severity: "error",
      });
    }
    if (!traffic.automationEnabled) {
      issues.push({
        code: "traffic.automation",
        message: "Push-button automation for failover/backout is required.",
        severity: "error",
      });
    }
  }

  private validateObservability(issues: ValidationIssue[]): void {
    const obs = this.config.observability;
    if (!obs.sloDashboards) {
      issues.push({
        code: "obs.slo",
        message: "SLO dashboards must exist per region/tenant.",
        severity: "error",
      });
    }
    if (!obs.syntheticProbes) {
      issues.push({
        code: "obs.synthetic",
        message: "Synthetic probes from POPs every minute are required.",
        severity: "error",
      });
    }
    if (obs.traceSamplingPercent < 10) {
      issues.push({
        code: "obs.trace-sampling",
        message: "Trace sampling must be at least 10% on critical paths.",
        severity: "error",
      });
    }
    if (!obs.costDashboards) {
      issues.push({
        code: "obs.cost",
        message: "Cost dashboards per region/POP must be enabled.",
        severity: "error",
      });
    }
    if (!obs.surgeBudgets) {
      issues.push({
        code: "obs.surge-budgets",
        message: "Surge budgets with 80% alerting must be enforced.",
        severity: "error",
      });
    }
    if (!obs.alertHygiene) {
      issues.push({
        code: "obs.alert-hygiene",
        message: "Alert hygiene program must be active.",
        severity: "error",
      });
    }
  }

  private validateCicd(issues: ValidationIssue[]): void {
    const cicd = this.config.cicd;
    if (!cicd.overlaysEnabled) {
      issues.push({
        code: "cicd.overlays",
        message: "Monorepo overlays for region-specific deploys must be enabled.",
        severity: "error",
      });
    }
    if (!cicd.policySimulation) {
      issues.push({
        code: "cicd.policy-sim",
        message: "Policy simulation in CI/CD is required.",
        severity: "error",
      });
    }
    if (!cicd.postDeployValidation) {
      issues.push({
        code: "cicd.pdv",
        message: "Post-deploy validation per region must run.",
        severity: "error",
      });
    }
    if (!cicd.evidenceBundles) {
      issues.push({
        code: "cicd.evidence",
        message: "Evidence bundles must attach to releases.",
        severity: "error",
      });
    }
    if (!cicd.sbomEnabled) {
      issues.push({
        code: "cicd.sbom",
        message: "SBOM/SCA must be produced.",
        severity: "error",
      });
    }
    if (!cicd.oneClickRevert) {
      issues.push({
        code: "cicd.revert",
        message: "One-click revert jobs must exist.",
        severity: "error",
      });
    }
  }

  private validateCustomer(issues: ValidationIssue[]): void {
    const customer = this.config.customer;
    if (!customer.runbooksAvailable) {
      issues.push({
        code: "customer.runbooks",
        message: "Runbooks for multi-region adoption must be available.",
        severity: "error",
      });
    }
    if (!customer.migrationGuides) {
      issues.push({
        code: "customer.migrations",
        message: "Migration guides from single to multi-region must be shipped.",
        severity: "error",
      });
    }
    if (!customer.slaPerRegion) {
      issues.push({
        code: "customer.sla",
        message: "SLA/support tiers must map to regions.",
        severity: "error",
      });
    }
    if (!customer.benchmarksPublished) {
      issues.push({
        code: "customer.benchmarks",
        message: "Public benchmarks with reproducible evidence are required.",
        severity: "error",
      });
    }
    if (!customer.feedbackFunnel) {
      issues.push({
        code: "customer.feedback",
        message: "Feedback funnel with exec scorecards must be active.",
        severity: "error",
      });
    }
  }

  private validatePredictiveRouting(issues: ValidationIssue[]): void {
    const pr = this.config.predictiveRouting;
    if (!pr.enabled) {
      issues.push({
        code: "predictive-routing.enabled",
        message: "Predictive cost-aware routing must be enabled.",
        severity: "warning",
      });
    }
    if (!pr.residencyAwareEdgeWasm) {
      issues.push({
        code: "predictive-routing.wasm",
        message: "Residency-aware edge WASM must be deployed.",
        severity: "warning",
      });
    }
    if (!pr.autonomousDrillScheduler) {
      issues.push({
        code: "predictive-routing.drills",
        message: "Autonomous drill scheduler should be active to tune capacity buffers.",
        severity: "warning",
      });
    }
  }

  private latencyWithinBudgets(request: RegionAccessRequest, region: RegionDefinition): boolean {
    if (request.action === "read" || request.action === "graphql") {
      return (request.latencyMs ?? 0) <= region.slo.readP95Ms;
    }
    if (request.action === "subscription") {
      return (request.latencyMs ?? 0) <= region.slo.subscriptionP95Ms;
    }
    return (request.latencyMs ?? 0) <= region.slo.writeP95Ms;
  }

  private checkCostGuardrails(
    request: RegionAccessRequest,
    region: RegionDefinition
  ): string | undefined {
    const budget = region.costCaps.infra ?? DEFAULT_COST_CAPS[request.environment];
    const llmBudget = region.costCaps.llm ?? DEFAULT_COST_CAPS.llm;

    const infraCost = request.estimatedInfraCost ?? 0;
    const infraAlertThreshold =
      (budget * (region.costCaps.alertPercent || DEFAULT_COST_CAPS.alertPercent)) / 100;
    if (infraCost > budget) {
      return "deny:infra-cost-cap-exceeded";
    }
    if (infraCost >= infraAlertThreshold) {
      return "warn:infra-cost-alert";
    }

    const llmCost = request.estimatedLlmCost ?? 0;
    const llmAlertThreshold =
      (llmBudget * (region.costCaps.alertPercent || DEFAULT_COST_CAPS.alertPercent)) / 100;
    if (llmCost > llmBudget) {
      return "deny:llm-cost-cap-exceeded";
    }
    if (llmCost >= llmAlertThreshold) {
      return "warn:llm-cost-alert";
    }

    return undefined;
  }
}
