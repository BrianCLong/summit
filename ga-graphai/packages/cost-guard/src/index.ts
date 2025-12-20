import { performance } from 'node:perf_hooks';
import type {
  ClusterNodeState,
  CostGuardDecision,
  PlanBudgetInput,
  ResourceOptimizationConfig,
  ScalingDecision,
  QueueRuntimeSignals,
  QueueScalingDecision,
  QueueSloConfig,
  SlowQueryRecord,
  TenantBudgetProfile,
  WorkloadBalancingPlan,
  WorkloadSample,
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
};

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

    const normalizedLatency = Number(latencyPressure.toFixed(3));
    const normalizedBacklog = Number(backlogPressure.toFixed(3));
    const normalizedCost = Number(costPressure.toFixed(3));
    const normalizedBacklogSeconds = Number(
      (Number.isFinite(backlogSeconds) ? backlogSeconds : Number.MAX_SAFE_INTEGER)
        .toFixed(1),
    );

    let recommendedReplicas = safeReplicas;
    const backlogDrivenReplicas =
      safeServiceRate === 0 || slo.backlogTargetSeconds === 0
        ? safeReplicas + slo.scaleStep
        : Math.ceil(
            (totalOutstanding / slo.backlogTargetSeconds) / safeServiceRate,
          );
    const latencyDrivenReplicas =
      latencyPressure > 1
        ? Math.ceil(
            safeReplicas * Math.min(2.5, Math.max(1.2, latencyPressure + 0.15)),
          )
        : safeReplicas;

    if (normalizedLatency > 1 || normalizedBacklog > 1) {
      recommendedReplicas = Math.max(
        safeReplicas + slo.scaleStep,
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
      },
      kedaMetric: {
        metricName: 'agent_queue_slo_pressure',
        labels: { queue: signals.queueName },
        value: Number(dominantPressure.toFixed(3)),
        query: `max_over_time(agent_queue_slo_pressure{queue="${signals.queueName}"}[2m])`,
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

export { DEFAULT_OPTIMIZATION_CONFIG, DEFAULT_QUEUE_SLO };
export type {
  ClusterNodeState,
  CostGuardDecision,
  PlanBudgetInput,
  ResourceOptimizationConfig,
  ScalingDecision,
  QueueRuntimeSignals,
  QueueScalingDecision,
  QueueSloConfig,
  SlowQueryRecord,
  TenantBudgetProfile,
  WorkloadBalancingPlan,
  WorkloadSample,
} from './types.js';
