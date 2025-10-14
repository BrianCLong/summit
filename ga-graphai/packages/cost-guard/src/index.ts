import { performance } from 'node:perf_hooks';
import type {
  ClusterNodeState,
  CostGuardDecision,
  PlanBudgetInput,
  ResourceOptimizationConfig,
  ScalingDecision,
  SlowQueryRecord,
  TenantBudgetProfile,
  WorkloadBalancingPlan,
  WorkloadSample
} from './types.js';

const DEFAULT_PROFILE: TenantBudgetProfile = {
  tenantId: 'global-default',
  maxRru: 150,
  maxLatencyMs: 1500,
  concurrencyLimit: 12
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
      activeSlowQueries: this.slowQueries.size
    };
  }

  planBudget(input: PlanBudgetInput): CostGuardDecision {
    const profile = input.profile ?? this.profile;
    const projectedRru = input.plan.estimatedRru;
    const projectedLatency = Math.max(input.plan.estimatedLatencyMs, input.recentLatencyP95);
    const saturation = (input.activeQueries + 1) / profile.concurrencyLimit;

    if (input.plan.containsCartesianProduct || projectedRru > profile.maxRru * 1.6) {
      this.budgetsExceeded += 1;
      return {
        action: 'kill',
        reason: 'Plan exceeds safe limits (cartesian product or excessive RRU).',
        nextCheckMs: 0,
        metrics: { projectedRru, projectedLatencyMs: projectedLatency, saturation }
      };
    }

    if (projectedLatency > profile.maxLatencyMs || saturation > 1 || input.plan.depth > 5) {
      this.budgetsExceeded += 1;
      return {
        action: 'throttle',
        reason: 'Plan approaches tenant guardrails; deferring execution.',
        nextCheckMs: 250,
        metrics: { projectedRru, projectedLatencyMs: projectedLatency, saturation }
      };
    }

    return {
      action: 'allow',
      reason: 'Plan within guardrails.',
      nextCheckMs: 120,
      metrics: { projectedRru, projectedLatencyMs: projectedLatency, saturation }
    };
  }

  killSlowQuery(queryId: string, tenantId: string, reason: string): SlowQueryRecord {
    const record: SlowQueryRecord = {
      queryId,
      tenantId,
      startedAt: performance.now(),
      observedLatencyMs: 0,
      reason
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
  confidenceWindow: 6
};

export class ResourceOptimizationEngine {
  private readonly config: ResourceOptimizationConfig;

  constructor(config?: Partial<ResourceOptimizationConfig>) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
  }

  recommendScaling(currentNodes: number, samples: WorkloadSample[]): ScalingDecision {
    const forecast = this.forecast(samples);
    const loadIndex = this.calculateLoadIndex(forecast);
    const confidence = this.calculateConfidence(samples.length);

    let action: ScalingDecision['action'] = 'hold';
    let recommendedNodes = currentNodes;
    const clamp = (value: number) =>
      Math.min(this.config.maxNodes, Math.max(this.config.minNodes, Math.max(1, Math.round(value))));

    if (loadIndex > this.config.scaleUpThreshold) {
      const scaled = Math.ceil(currentNodes * Math.max(loadIndex, this.config.scaleUpThreshold));
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
      forecast
    };
  }

  balanceWorkloads(nodes: ClusterNodeState[]): WorkloadBalancingPlan {
    if (nodes.length === 0) {
      return {
        strategy: 'maintain',
        reason: 'No nodes available to balance.',
        confidence: 0,
        allocations: []
      };
    }

    const totalSessions = nodes.reduce((sum, node) => sum + node.activeSessions, 0);
    const totalCapacity = nodes.reduce((sum, node) => sum + node.maxSessions, 0);

    if (totalCapacity === 0) {
      return {
        strategy: 'maintain',
        reason: 'Unable to compute target distribution without capacity metadata.',
        confidence: this.calculateConfidence(nodes.length),
        allocations: nodes.map(node => ({ nodeId: node.nodeId, targetSessions: node.activeSessions, delta: 0 }))
      };
    }

    const targetRatio = totalSessions / totalCapacity;
    const allocations = nodes.map(node => {
      const targetSessions = Math.round(targetRatio * node.maxSessions);
      return {
        nodeId: node.nodeId,
        targetSessions,
        delta: targetSessions - node.activeSessions
      };
    });

    const loadRatios = nodes.map(node =>
      Math.max(
        node.cpuUtilization,
        node.memoryUtilization,
        node.maxSessions === 0 ? 0 : node.activeSessions / node.maxSessions
      )
    );
    const minLoad = Math.min(...loadRatios);
    const maxLoad = Math.max(...loadRatios);
    const requiresRebalance = maxLoad - minLoad > this.config.rebalanceTolerance;

    return {
      strategy: requiresRebalance ? 'rebalance' : 'maintain',
      reason: requiresRebalance
        ? 'Detected uneven workload distribution across nodes; rebalance recommended.'
        : 'Workload distribution within acceptable tolerance.',
      confidence: this.calculateConfidence(nodes.length),
      allocations: requiresRebalance ? allocations : allocations.map(allocation => ({ ...allocation, delta: 0 }))
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
      throughputPerNode: Number(throughput.toFixed(3))
    };
  }

  private calculateLoadIndex(forecast: ScalingDecision['forecast']): number {
    const cpuRatio =
      this.config.targetCpuUtilization === 0 ? 0 : forecast.cpuUtilization / this.config.targetCpuUtilization;
    const memoryRatio =
      this.config.targetMemoryUtilization === 0 ? 0 : forecast.memoryUtilization / this.config.targetMemoryUtilization;
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
    return Number(Math.min(1, observationCount / this.config.confidenceWindow).toFixed(3));
  }

  private buildScalingReason(
    action: ScalingDecision['action'],
    loadIndex: number,
    forecast: ScalingDecision['forecast']
  ): string {
    if (action === 'scale_up') {
      return `Predicted workload exceeds guardrails (load index ${loadIndex.toFixed(
        2
      )}); scaling up to maintain performance.`;
    }
    if (action === 'scale_down') {
      return `Forecast suggests excess capacity (load index ${loadIndex.toFixed(
        2
      )}); scaling down to improve efficiency.`;
    }
    return `Workload steady (load index ${loadIndex.toFixed(2)}); maintaining current capacity.`;
  }
}

export { DEFAULT_OPTIMIZATION_CONFIG };
export type {
  ClusterNodeState,
  CostGuardDecision,
  PlanBudgetInput,
  ResourceOptimizationConfig,
  ScalingDecision,
  SlowQueryRecord,
  TenantBudgetProfile,
  WorkloadBalancingPlan,
  WorkloadSample
} from './types.js';
