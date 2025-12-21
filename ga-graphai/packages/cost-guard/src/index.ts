import { performance } from 'node:perf_hooks';
import type {
  ClusterNodeState,
  CostGuardDecision,
  PlanBudgetInput,
  ResourceOptimizationConfig,
  QueueScalingDecision,
  ArbiterConfig,
  ArbiterDecision,
  ConsentContext,
  SloTelemetrySnapshot,
  WorkloadRequestProfile,
  ArbiterAction,
  ScalingDecision,
  QueueRuntimeSignals,
  QueueSloConfig,
  SlowQueryRecord,
  TenantBudgetProfile,
  WorkloadBalancingPlan,
  WorkloadQueueSignal,
  WorkloadSample,
  KedaScaledObjectSpec,
  QueueAlertConfig,
} from './types.js';

const DEFAULT_PROFILE: TenantBudgetProfile = {
  tenantId: 'global-default',
  maxRru: 150,
  maxLatencyMs: 1500,
  concurrencyLimit: 12,
};

export class CostGuard {
  private readonly profile: TenantBudgetProfile;
  private budgetsExceeded = 0;
  private kills = 0;
  private readonly slowQueries = new Map<string, SlowQueryRecord>();

  constructor(profile?: TenantBudgetProfile) {
    this.profile = profile ?? DEFAULT_PROFILE;
  }

  get metrics() {
    return {
      budgetsExceeded: this.budgetsExceeded,
      kills: this.kills,
      activeSlowQueries: this.slowQueries.size,
    };
  }

  planBudget(input: PlanBudgetInput): CostGuardDecision {
    const profile = input.profile ?? this.profile;
    const projectedRru = input.plan.estimatedRru;
    const projectedLatency = Math.max(
      input.plan.estimatedLatencyMs,
      input.recentLatencyP95,
    );
    const saturation = (input.activeQueries + 1) / profile.concurrencyLimit;

    if (
      input.plan.containsCartesianProduct ||
      projectedRru > profile.maxRru * 1.6
    ) {
      this.budgetsExceeded += 1;
      return {
        action: 'kill',
        reason:
          'Plan exceeds safe limits (cartesian product or excessive RRU).',
        nextCheckMs: 0,
        metrics: {
          projectedRru,
          projectedLatencyMs: projectedLatency,
          saturation,
        },
      };
    }

    if (
      projectedLatency > profile.maxLatencyMs ||
      saturation > 1 ||
      input.plan.depth > 5
    ) {
      this.budgetsExceeded += 1;
      return {
        action: 'throttle',
        reason: 'Plan approaches tenant guardrails; deferring execution.',
        nextCheckMs: 250,
        metrics: {
          projectedRru,
          projectedLatencyMs: projectedLatency,
          saturation,
        },
      };
    }

    return {
      action: 'allow',
      reason: 'Plan within guardrails.',
      nextCheckMs: 120,
      metrics: {
        projectedRru,
        projectedLatencyMs: projectedLatency,
        saturation,
      },
    };
  }

  evaluateQueueScaling(signal: WorkloadQueueSignal): QueueScalingDecision {
    const latencyPressure = signal.p95LatencyMs / this.profile.maxLatencyMs;
    const queuePressure =
      signal.queueDepth / Math.max(1, this.profile.concurrencyLimit * 1.5);
    const costPressure = signal.costPerJobUsd / 0.25;
    const budgetPressure = signal.budgetConsumptionRatio ?? 0;
    const saturation = signal.saturationRatio ?? Math.min(1, queuePressure);

    const score = Number(
      (
        queuePressure * 0.4 +
        latencyPressure * 0.35 +
        costPressure * 0.15 +
        budgetPressure * 0.05 +
        saturation * 0.05
      ).toFixed(3),
    );

    let action: QueueScalingDecision['action'] = 'hold';
    let reason =
      'Queue steady; maintain current worker footprint while tracking SLO burn.';

    if (score >= 1.05 || latencyPressure > 1.1) {
      action = 'scale_up';
      reason =
        'Latency or queue pressure breaching SLO; scale up workers to drain backlog.';
    } else if (score <= 0.35 && signal.queueDepth === 0) {
      action = 'scale_down';
      reason =
        'Queue empty and costs elevated; scale down to protect budget without harming SLOs.';
    }

    const recommendedReplicas = Math.max(
      1,
      Math.round(this.profile.concurrencyLimit * (0.6 + score / 1.5)),
    );

    return {
      action,
      score,
      recommendedReplicas,
      reason,
      inputs: signal,
    };
  }

  killSlowQuery(
    queryId: string,
    tenantId: string,
    reason: string,
  ): SlowQueryRecord {
    const record: SlowQueryRecord = {
      queryId,
      tenantId,
      startedAt: performance.now(),
      observedLatencyMs: 0,
      reason,
    };
    this.slowQueries.set(queryId, record);
    this.kills += 1;
    return record;
  }

  observeQueryCompletion(queryId: string, latencyMs: number): void {
    const record = this.slowQueries.get(queryId);
    if (record) {
      record.observedLatencyMs = latencyMs;
      this.slowQueries.set(queryId, record);
    }
  }

  release(queryId: string): void {
    this.slowQueries.delete(queryId);
  }
}

export { DEFAULT_PROFILE };
const DEFAULT_OPTIMIZATION_CONFIG: ResourceOptimizationConfig = {
  smoothingFactor: 0.6,
  targetCpuUtilization: 0.65,
  targetMemoryUtilization: 0.7,
  targetThroughputPerNode: 120,
  scaleUpThreshold: 0.82,
  scaleDownThreshold: 0.48,
  minNodes: 2,
  maxNodes: 64,
  rebalanceTolerance: 0.15,
  confidenceWindow: 6,
};

const DEFAULT_QUEUE_SLO: QueueSloConfig = {
  targetP95Ms: 1500,
  maxCostPerMinuteUsd: 18,
  backlogTargetSeconds: 90,
  minReplicas: 2,
  maxReplicas: 64,
  scaleStep: 2,
  stabilizationSeconds: 180,
  maxScaleStep: 6,
  errorBudgetMinutes: 30,
  latencyBurnThreshold: 1.2,
  costBurnThreshold: 1.05,
};

const DEFAULT_ARBITER_CONFIG: ArbiterConfig = {
  readLatencyTargetMs: 350,
  writeLatencyTargetMs: 700,
  ingestLatencyTargetMs: 100,
  maxErrorRate: 0.01,
  costBudgetPerMillionUsd: 2,
  costAlertThreshold: 0.8,
  maxRru: 250,
  dpEpsilonCeiling: 1.0,
  offPeakWindowUtc: { startHour: 1, endHour: 5 },
};

export class AdaptiveCostSafetyArbiter {
  private readonly config: ArbiterConfig;

  constructor(config?: Partial<ArbiterConfig>) {
    this.config = { ...DEFAULT_ARBITER_CONFIG, ...config };
  }

  evaluate(
    request: WorkloadRequestProfile,
    consent: ConsentContext,
    telemetry: SloTelemetrySnapshot,
  ): ArbiterDecision {
    const consentViolation = this.validateConsent(consent);
    if (consentViolation) {
      return this.buildDecision('deny', consentViolation, request, consent, telemetry, 0);
    }

    const latencyTarget =
      request.kind === 'write'
        ? this.config.writeLatencyTargetMs
        : this.config.readLatencyTargetMs;
    const latencyPressure =
      latencyTarget === 0 ? 0 : request.expectedLatencyMs / latencyTarget;
    const observedPressure =
      latencyTarget === 0 ? 0 : telemetry.apiLatencyP95Ms / latencyTarget;
    const ingestPressure =
      this.config.ingestLatencyTargetMs === 0
        ? 0
        : telemetry.ingestLatencyP95Ms / this.config.ingestLatencyTargetMs;

    const perCallBudget = this.config.costBudgetPerMillionUsd / 1_000_000;
    const projectedCostPressure =
      perCallBudget === 0 ? 0 : request.estimatedCostUsd / perCallBudget;
    const budgetBurn =
      this.config.costBudgetPerMillionUsd === 0
        ? 0
        : telemetry.costPerMillionRequestsUsd / this.config.costBudgetPerMillionUsd;

    const rruPressure = request.estimatedRru / Math.max(1, this.config.maxRru);
    const dpPressure = this.computeDpPressure(request);
    const maxPressure = Math.max(
      latencyPressure,
      observedPressure,
      ingestPressure,
      projectedCostPressure,
      budgetBurn,
      rruPressure,
      dpPressure,
    );

    if (dpPressure > 1) {
      return this.buildDecision(
        'throttle',
        `Differential privacy epsilon must be ≤ ${this.config.dpEpsilonCeiling}.`,
        request,
        consent,
        telemetry,
        15 * 60 * 1000,
        this.config.dpEpsilonCeiling,
      );
    }

    if (rruPressure > 1.5 || projectedCostPressure > 1.2) {
      return this.buildDecision(
        'reroute',
        'Workload exceeds budget guardrails; defer to off-peak window with throttling.',
        request,
        consent,
        telemetry,
        10 * 60 * 1000,
        undefined,
        this.config.offPeakWindowUtc,
      );
    }

    if (
      request.operation === 'bulk-export' &&
      (budgetBurn >= this.config.costAlertThreshold || observedPressure > 1.05)
    ) {
      return this.buildDecision(
        'defer',
        'Bulk export gated to protect SLO and cost budget; reschedule during off-peak.',
        request,
        consent,
        telemetry,
        20 * 60 * 1000,
        undefined,
        request.preferredWindowUtc ?? this.config.offPeakWindowUtc,
      );
    }

    if (
      telemetry.apiErrorRate > this.config.maxErrorRate ||
      observedPressure > 1.2 ||
      latencyPressure > 1.2
    ) {
      return this.buildDecision(
        'throttle',
        'Live SLO burn detected; throttling request until latency/error rate recovers.',
        request,
        consent,
        telemetry,
        5 * 60 * 1000,
      );
    }

    if (maxPressure > this.config.costAlertThreshold) {
      return this.buildDecision(
        'throttle',
        'Pressure approaching guardrails; applying soft throttle with rapid review.',
        request,
        consent,
        telemetry,
        2 * 60 * 1000,
      );
    }

    return this.buildDecision(
      'allow',
      'Request within cost, SLO, and consent guardrails.',
      request,
      consent,
      telemetry,
      60 * 1000,
    );
  }

  private validateConsent(consent: ConsentContext): string | null {
    if (consent.revoked && !consent.breakGlass) {
      return 'Consent revoked; request denied unless break-glass policy applied.';
    }
    if (!consent.consented && !consent.breakGlass) {
      return 'Consent missing for requested purpose; deny by default.';
    }
    if (
      consent.consentedPurposes &&
      consent.consentedPurposes.length > 0 &&
      !consent.consentedPurposes.includes(consent.purpose) &&
      !consent.breakGlass
    ) {
      return 'Purpose not authorized under consent scope.';
    }
    return null;
  }

  private computeDpPressure(request: WorkloadRequestProfile): number {
    if (!request.usesDifferentialPrivacy) {
      return 0;
    }
    const epsilon = request.dpEpsilon ?? Number.POSITIVE_INFINITY;
    return epsilon / this.config.dpEpsilonCeiling;
  }

  private buildDecision(
    action: ArbiterAction,
    reason: string,
    request: WorkloadRequestProfile,
    consent: ConsentContext,
    telemetry: SloTelemetrySnapshot,
    nextReviewMs: number,
    requiredDpEpsilon?: number,
    targetWindowUtc?: { startHour: number; endHour: number },
  ): ArbiterDecision {
    return {
      action,
      reason,
      nextReviewMs,
      targetWindowUtc,
      requiredDpEpsilon,
      audit: {
        tenantId: request.tenantId,
        action,
        reason,
        timestamp: Date.now(),
        telemetry,
        consent,
        request: {
          operation: request.operation,
          kind: request.kind,
          estimatedCostUsd: request.estimatedCostUsd,
          estimatedRru: request.estimatedRru,
          expectedLatencyMs: request.expectedLatencyMs,
          dataSensitivity: request.dataSensitivity,
          usesDifferentialPrivacy: request.usesDifferentialPrivacy,
          dpEpsilon: request.dpEpsilon,
          burstScore: request.burstScore,
        },
      },
    };
  }
}

export class ResourceOptimizationEngine {
  private readonly config: ResourceOptimizationConfig;

  constructor(config?: Partial<ResourceOptimizationConfig>) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
  }

  recommendScaling(
    currentNodes: number,
    samples: WorkloadSample[],
  ): ScalingDecision {
    const forecast = this.forecast(samples);
    const loadIndex = this.calculateLoadIndex(forecast);
    const confidence = this.calculateConfidence(samples.length);

    let action: ScalingDecision['action'] = 'hold';
    let recommendedNodes = currentNodes;
    const clamp = (value: number) =>
      Math.min(
        this.config.maxNodes,
        Math.max(this.config.minNodes, Math.max(1, Math.round(value))),
      );

    if (loadIndex > this.config.scaleUpThreshold) {
      const scaled = Math.ceil(
        currentNodes * Math.max(loadIndex, this.config.scaleUpThreshold),
      );
      recommendedNodes = clamp(Math.max(currentNodes + 1, scaled));
      action = recommendedNodes > currentNodes ? 'scale_up' : 'hold';
    } else if (loadIndex < this.config.scaleDownThreshold) {
      const scaled = Math.floor(currentNodes * Math.max(loadIndex, 0.4));
      recommendedNodes = clamp(Math.min(currentNodes - 1, scaled));
      action = recommendedNodes < currentNodes ? 'scale_down' : 'hold';
    }

    const reason = this.buildScalingReason(action, loadIndex, forecast);

    return {
      action,
      recommendedNodes,
      reason,
      confidence,
      loadIndex,
      forecast,
    };
  }

  recommendQueueAutoscaling(
    currentReplicas: number,
    signals: QueueRuntimeSignals,
    slo: QueueSloConfig = DEFAULT_QUEUE_SLO,
  ): QueueScalingDecision {
    const safeServiceRate = Math.max(signals.serviceRatePerSecondPerWorker, 0);
    const safeReplicas = Math.max(1, currentReplicas);
    const totalOutstanding = Math.max(0, signals.backlog + signals.inflight);
    const capacityPerSecond = safeServiceRate * safeReplicas;
    const backlogSeconds =
      capacityPerSecond === 0
        ? Number.POSITIVE_INFINITY
        : totalOutstanding / capacityPerSecond;

    const latencyPressure =
      slo.targetP95Ms === 0
        ? 0
        : signals.observedP95LatencyMs / slo.targetP95Ms;
    const backlogPressure =
      slo.backlogTargetSeconds === 0 || !Number.isFinite(backlogSeconds)
        ? 0
        : backlogSeconds / slo.backlogTargetSeconds;
    const costPressure =
      slo.maxCostPerMinuteUsd === 0
        ? 0
        : signals.spendRatePerMinuteUsd / slo.maxCostPerMinuteUsd;
    const costBurnRate =
      slo.costBurnThreshold && slo.costBurnThreshold > 0
        ? costPressure / slo.costBurnThreshold
        : costPressure;

    const sloBurnRate =
      slo.latencyBurnThreshold && slo.latencyBurnThreshold > 0
        ? Math.max(latencyPressure / slo.latencyBurnThreshold, backlogPressure)
        : Math.max(latencyPressure, backlogPressure);

    const normalizedLatency = Number(latencyPressure.toFixed(3));
    const normalizedBacklog = Number(backlogPressure.toFixed(3));
    const normalizedCost = Number(costPressure.toFixed(3));
    const normalizedBacklogSeconds = Number(
      (Number.isFinite(backlogSeconds) ? backlogSeconds : Number.MAX_SAFE_INTEGER)
        .toFixed(1),
    );

    const adaptiveScaleStep = Math.min(
      slo.maxScaleStep ?? slo.scaleStep,
      Math.max(
        slo.scaleStep,
        Math.ceil(slo.scaleStep * Math.max(1, sloBurnRate)),
      ),
    );

    let recommendedReplicas = safeReplicas;
    const backlogDrivenReplicas =
      safeServiceRate === 0 || slo.backlogTargetSeconds === 0
        ? safeReplicas + adaptiveScaleStep
        : Math.ceil(
            (totalOutstanding / slo.backlogTargetSeconds) / safeServiceRate,
          );
    const latencyDrivenReplicas =
      latencyPressure > 1
        ? Math.ceil(
            safeReplicas *
              Math.min(
                2.5,
                Math.max(1.2, latencyPressure + 0.15 * adaptiveScaleStep),
              ),
          )
        : safeReplicas;

    if (normalizedLatency > 1 || normalizedBacklog > 1) {
      recommendedReplicas = Math.max(
        safeReplicas + adaptiveScaleStep,
        backlogDrivenReplicas,
        latencyDrivenReplicas,
      );
    } else if (normalizedCost > 1 && normalizedLatency < 0.9 && normalizedBacklog < 0.9) {
      const reliefStep = Math.max(1, Math.floor(safeReplicas * 0.2));
      const budgetAlignedReplicas = Math.max(
        slo.minReplicas,
        Math.ceil((signals.spendRatePerMinuteUsd / slo.maxCostPerMinuteUsd) * safeReplicas * 0.8),
      );
      recommendedReplicas = Math.min(
        safeReplicas - reliefStep,
        budgetAlignedReplicas,
      );
    }

    recommendedReplicas = Math.min(
      slo.maxReplicas,
      Math.max(slo.minReplicas, recommendedReplicas),
    );

    const action: ScalingDecision['action'] =
      recommendedReplicas > safeReplicas
        ? 'scale_up'
        : recommendedReplicas < safeReplicas
          ? 'scale_down'
          : 'hold';

    const dominantPressure = Math.max(normalizedLatency, normalizedBacklog, normalizedCost);
    const reason = this.buildQueueScalingReason(action, {
      latency: normalizedLatency,
      backlog: normalizedBacklog,
      cost: normalizedCost,
    });

    return {
      action,
      recommendedReplicas,
      reason,
      telemetry: {
        latencyPressure: normalizedLatency,
        backlogPressure: normalizedBacklog,
        costPressure: normalizedCost,
        backlogSeconds: normalizedBacklogSeconds,
        sloTargetSeconds: slo.backlogTargetSeconds,
        sloBurnRate: Number(sloBurnRate.toFixed(3)),
        costBurnRate: Number(costBurnRate.toFixed(3)),
        adaptiveScaleStep,
      },
      kedaMetric: {
        metricName: 'agent_queue_slo_pressure',
        labels: { queue: signals.queueName },
        value: Number(dominantPressure.toFixed(3)),
        query: `max_over_time(agent_queue_slo_pressure{queue="${signals.queueName}"}[2m])`,
      },
      alerts: this.buildQueueAlertConfig(signals.queueName, slo, {
        latency: normalizedLatency,
        backlog: normalizedBacklog,
        cost: normalizedCost,
      }),
    };
  }

  buildQueueAlertConfig(
    queueName: string,
    slo: QueueSloConfig,
    pressures: { latency: number; backlog: number; cost: number },
  ): QueueAlertConfig {
    const labels = { queue: queueName };
    const fastBurn = `max_over_time(agent_queue_slo_pressure{queue="${queueName}"}[5m])`;
    const slowBurn = `max_over_time(agent_queue_slo_pressure{queue="${queueName}"}[30m])`;
    const costAnomaly = `avg_over_time(agent_queue_cost_pressure{queue="${queueName}"}[10m])`;

    const latencyBudget = slo.latencyBurnThreshold ?? 1;
    const costBudget = slo.costBurnThreshold ?? 1;
    const fastBurnThreshold = Math.max(latencyBudget, pressures.latency);
    const slowBurnThreshold = Math.max(1, latencyBudget * 0.75);
    const costThreshold = Math.max(costBudget, pressures.cost);
    const fastBurnRateQuery = `${fastBurn} > ${fastBurnThreshold.toFixed(2)}`;
    const slowBurnRateQuery = `${slowBurn} > ${slowBurnThreshold.toFixed(2)}`;
    const costAnomalyQuery = `${costAnomaly} > ${costThreshold.toFixed(2)}`;

    return {
      fastBurnRateQuery,
      slowBurnRateQuery,
      costAnomalyQuery,
      labels,
    };
  }

  buildKedaScaledObject(
    queueName: string,
    deploymentName: string,
    namespace: string,
    decision: QueueScalingDecision,
    slo: QueueSloConfig = DEFAULT_QUEUE_SLO,
  ): KedaScaledObjectSpec {
    const metric = decision.kedaMetric;
    const minReplicaCount = slo.minReplicas;
    const maxReplicaCount = slo.maxReplicas;

    return {
      apiVersion: 'keda.sh/v1alpha1',
      kind: 'ScaledObject',
      metadata: {
        name: `${deploymentName}-keda`,
        namespace,
        labels: {
          'queue.graphai.io/name': queueName,
          'slo.graphai.io/enabled': 'true',
        },
      },
      spec: {
        scaleTargetRef: {
          name: deploymentName,
        },
        pollingInterval: 15,
        cooldownPeriod: slo.stabilizationSeconds,
        minReplicaCount,
        maxReplicaCount,
        fallback: {
          failureThreshold: 3,
          replicas: Math.max(minReplicaCount, 1),
        },
        advanced: {
          horizontalPodAutoscalerConfig: {
            behavior: {
              scaleDown: {
                stabilizationWindowSeconds: slo.stabilizationSeconds,
                policies: [
                  { type: 'Pods', value: Math.max(1, slo.scaleStep), periodSeconds: 60 },
                  { type: 'Percent', value: 20, periodSeconds: 60 },
                ],
              },
              scaleUp: {
                stabilizationWindowSeconds: Math.max(60, slo.stabilizationSeconds / 3),
                policies: [
                  { type: 'Pods', value: decision.telemetry.adaptiveScaleStep, periodSeconds: 60 },
                  { type: 'Percent', value: 50, periodSeconds: 60 },
                ],
              },
            },
          },
        },
        triggers: [
          {
            type: 'prometheus',
            metadata: {
              serverAddress: 'http://prometheus.monitoring.svc:9090',
              metricName: metric.metricName,
              threshold: `${Math.max(1, decision.telemetry.sloBurnRate).toFixed(2)}`,
              query: metric.query,
            },
          },
          {
            type: 'prometheus',
            metadata: {
              serverAddress: 'http://prometheus.monitoring.svc:9090',
              metricName: 'agent_queue_cost_pressure',
              threshold: `${Math.max(1, decision.telemetry.costBurnRate).toFixed(2)}`,
              query: `avg_over_time(agent_queue_cost_pressure{queue="${queueName}"}[5m])`,
            },
          },
        ],
      },
    };
  }

  balanceWorkloads(nodes: ClusterNodeState[]): WorkloadBalancingPlan {
    if (nodes.length === 0) {
      return {
        strategy: 'maintain',
        reason: 'No nodes available to balance.',
        confidence: 0,
        allocations: [],
      };
    }

    const totalSessions = nodes.reduce(
      (sum, node) => sum + node.activeSessions,
      0,
    );
    const totalCapacity = nodes.reduce(
      (sum, node) => sum + node.maxSessions,
      0,
    );

    if (totalCapacity === 0) {
      return {
        strategy: 'maintain',
        reason:
          'Unable to compute target distribution without capacity metadata.',
        confidence: this.calculateConfidence(nodes.length),
        allocations: nodes.map((node) => ({
          nodeId: node.nodeId,
          targetSessions: node.activeSessions,
          delta: 0,
        })),
      };
    }

    const targetRatio = totalSessions / totalCapacity;
    const allocations = nodes.map((node) => {
      const targetSessions = Math.round(targetRatio * node.maxSessions);
      return {
        nodeId: node.nodeId,
        targetSessions,
        delta: targetSessions - node.activeSessions,
      };
    });

    const loadRatios = nodes.map((node) =>
      Math.max(
        node.cpuUtilization,
        node.memoryUtilization,
        node.maxSessions === 0 ? 0 : node.activeSessions / node.maxSessions,
      ),
    );
    const minLoad = Math.min(...loadRatios);
    const maxLoad = Math.max(...loadRatios);
    const requiresRebalance =
      maxLoad - minLoad > this.config.rebalanceTolerance;

    return {
      strategy: requiresRebalance ? 'rebalance' : 'maintain',
      reason: requiresRebalance
        ? 'Detected uneven workload distribution across nodes; rebalance recommended.'
        : 'Workload distribution within acceptable tolerance.',
      confidence: this.calculateConfidence(nodes.length),
      allocations: requiresRebalance
        ? allocations
        : allocations.map((allocation) => ({ ...allocation, delta: 0 })),
    };
  }

  private forecast(samples: WorkloadSample[]): ScalingDecision['forecast'] {
    if (samples.length === 0) {
      return { cpuUtilization: 0, memoryUtilization: 0, throughputPerNode: 0 };
    }

    const alpha = this.config.smoothingFactor;
    let cpu = samples[0].cpuUtilization;
    let memory = samples[0].memoryUtilization;
    let throughput = samples[0].throughputPerNode;

    for (let i = 1; i < samples.length; i += 1) {
      const sample = samples[i];
      cpu = alpha * sample.cpuUtilization + (1 - alpha) * cpu;
      memory = alpha * sample.memoryUtilization + (1 - alpha) * memory;
      throughput = alpha * sample.throughputPerNode + (1 - alpha) * throughput;
    }

    return {
      cpuUtilization: Number(cpu.toFixed(3)),
      memoryUtilization: Number(memory.toFixed(3)),
      throughputPerNode: Number(throughput.toFixed(3)),
    };
  }

  private calculateLoadIndex(forecast: ScalingDecision['forecast']): number {
    const cpuRatio =
      this.config.targetCpuUtilization === 0
        ? 0
        : forecast.cpuUtilization / this.config.targetCpuUtilization;
    const memoryRatio =
      this.config.targetMemoryUtilization === 0
        ? 0
        : forecast.memoryUtilization / this.config.targetMemoryUtilization;
    const throughputRatio =
      this.config.targetThroughputPerNode === 0
        ? 0
        : forecast.throughputPerNode / this.config.targetThroughputPerNode;

    return Number(Math.max(cpuRatio, memoryRatio, throughputRatio).toFixed(3));
  }

  private calculateConfidence(observationCount: number): number {
    if (observationCount <= 0) {
      return 0;
    }
    return Number(
      Math.min(1, observationCount / this.config.confidenceWindow).toFixed(3),
    );
  }

  private buildScalingReason(
    action: ScalingDecision['action'],
    loadIndex: number,
    forecast: ScalingDecision['forecast'],
  ): string {
    if (action === 'scale_up') {
      return `Predicted workload exceeds guardrails (load index ${loadIndex.toFixed(
        2,
      )}); scaling up to maintain performance.`;
    }
    if (action === 'scale_down') {
      return `Forecast suggests excess capacity (load index ${loadIndex.toFixed(
        2,
      )}); scaling down to improve efficiency.`;
    }
    return `Workload steady (load index ${loadIndex.toFixed(2)}); maintaining current capacity.`;
  }

  private buildQueueScalingReason(
    action: ScalingDecision['action'],
    pressure: { latency: number; backlog: number; cost: number },
  ): string {
    if (action === 'scale_up') {
      return `Latency/backlog pressure (${pressure.latency.toFixed(
        2,
      )}/${pressure.backlog.toFixed(2)}) exceeds SLO guardrails; requesting more replicas.`;
    }
    if (action === 'scale_down') {
      return `Cost pressure ${pressure.cost.toFixed(
        2,
      )} dominates while latency/backlog are healthy; reducing replicas to protect budget.`;
    }
    return `Within SLO envelopes (latency ${pressure.latency.toFixed(
      2,
    )}, backlog ${pressure.backlog.toFixed(2)}, cost ${pressure.cost.toFixed(2)}); holding steady.`;
  }
}

export { DEFAULT_OPTIMIZATION_CONFIG, DEFAULT_QUEUE_SLO, DEFAULT_ARBITER_CONFIG };
export type {
  ClusterNodeState,
  CostGuardDecision,
  PlanBudgetInput,
  ArbiterAction,
  ArbiterConfig,
  ArbiterDecision,
  ConsentContext,
  ResourceOptimizationConfig,
  ScalingDecision,
  QueueRuntimeSignals,
  QueueScalingDecision,
  QueueSloConfig,
  QueueAlertConfig,
  KedaScaledObjectSpec,
  SlowQueryRecord,
  TenantBudgetProfile,
  WorkloadBalancingPlan,
  WorkloadQueueSignal,
  WorkloadSample,
  SloTelemetrySnapshot,
  WorkloadRequestProfile,
} from './types.js';
