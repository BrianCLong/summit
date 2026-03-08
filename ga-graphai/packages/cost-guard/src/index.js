"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BUDGETS = exports.DEFAULT_JOURNEY_TARGETS = exports.DEFAULT_CACHE_CONFIG = exports.PerformanceCostOperatingSystem = exports.ReleaseMarkerEmitter = exports.TelemetryCostController = exports.AsyncJobManager = exports.ResponseShaper = exports.CacheManager = exports.TopOffenderBoard = exports.PerformanceBudgetGate = exports.DEFAULT_QUEUE_SLO = exports.DEFAULT_OPTIMIZATION_CONFIG = exports.ResourceOptimizationEngine = exports.DEFAULT_PROFILE = exports.CostGuard = void 0;
const node_perf_hooks_1 = require("node:perf_hooks");
const DEFAULT_PROFILE = {
    tenantId: 'global-default',
    maxRru: 150,
    maxLatencyMs: 1500,
    concurrencyLimit: 12,
};
exports.DEFAULT_PROFILE = DEFAULT_PROFILE;
class CostGuard {
    profile;
    budgetsExceeded = 0;
    kills = 0;
    slowQueries = new Map();
    killReasons = new Map();
    constructor(profile) {
        this.profile = profile ?? DEFAULT_PROFILE;
    }
    get metrics() {
        return {
            budgetsExceeded: this.budgetsExceeded,
            kills: this.kills,
            activeSlowQueries: this.slowQueries.size,
            killReasons: Object.fromEntries(this.killReasons),
        };
    }
    planBudget(input) {
        const profile = input.profile ?? this.profile;
        const projectedRru = input.plan.estimatedRru;
        const projectedLatency = Math.max(input.plan.estimatedLatencyMs, input.recentLatencyP95);
        const saturation = (input.activeQueries + 1) / profile.concurrencyLimit;
        if (input.plan.containsCartesianProduct ||
            projectedRru > profile.maxRru * 1.6) {
            this.budgetsExceeded += 1;
            return {
                action: 'kill',
                reason: 'Plan exceeds safe limits (cartesian product or excessive RRU).',
                reasonCode: input.plan.containsCartesianProduct
                    ? 'cartesian-product'
                    : 'rru-overage',
                nextCheckMs: 0,
                metrics: {
                    projectedRru,
                    projectedLatencyMs: projectedLatency,
                    saturation,
                },
            };
        }
        if (projectedLatency > profile.maxLatencyMs ||
            saturation > 1 ||
            input.plan.depth > 5) {
            this.budgetsExceeded += 1;
            return {
                action: 'throttle',
                reason: 'Plan approaches tenant guardrails; deferring execution.',
                reasonCode: projectedLatency > profile.maxLatencyMs
                    ? 'latency-pressure'
                    : saturation > 1
                        ? 'concurrency-saturation'
                        : 'depth-overage',
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
            reasonCode: 'within-guardrails',
            nextCheckMs: 120,
            metrics: {
                projectedRru,
                projectedLatencyMs: projectedLatency,
                saturation,
            },
        };
    }
    evaluateQueueScaling(signal) {
        const latencyPressure = signal.p95LatencyMs / this.profile.maxLatencyMs;
        const queuePressure = signal.queueDepth / Math.max(1, this.profile.concurrencyLimit * 1.5);
        const costPressure = signal.costPerJobUsd / 0.25;
        const budgetPressure = signal.budgetConsumptionRatio ?? 0;
        const saturation = signal.saturationRatio ?? Math.min(1, queuePressure);
        const score = Number((queuePressure * 0.4 +
            latencyPressure * 0.35 +
            costPressure * 0.15 +
            budgetPressure * 0.05 +
            saturation * 0.05).toFixed(3));
        let action = 'hold';
        let reason = 'Queue steady; maintain current worker footprint while tracking SLO burn.';
        if (score >= 1.05 || latencyPressure > 1.1) {
            action = 'scale_up';
            reason =
                'Latency or queue pressure breaching SLO; scale up workers to drain backlog.';
        }
        else if (score <= 0.35 && signal.queueDepth === 0) {
            action = 'scale_down';
            reason =
                'Queue empty and costs elevated; scale down to protect budget without harming SLOs.';
        }
        const recommendedReplicas = Math.max(1, Math.round(this.profile.concurrencyLimit * (0.6 + score / 1.5)));
        return {
            action,
            score,
            recommendedReplicas,
            reason,
            inputs: signal,
        };
    }
    killSlowQuery(queryId, tenantId, reason, reasonCode = 'slow-query') {
        const record = {
            queryId,
            tenantId,
            startedAt: node_perf_hooks_1.performance.now(),
            observedLatencyMs: 0,
            reason,
            reasonCode,
        };
        this.slowQueries.set(queryId, record);
        this.kills += 1;
        this.killReasons.set(reasonCode, (this.killReasons.get(reasonCode) ?? 0) + 1);
        return record;
    }
    observeQueryCompletion(queryId, latencyMs) {
        const record = this.slowQueries.get(queryId);
        if (record) {
            record.observedLatencyMs = latencyMs;
            this.slowQueries.set(queryId, record);
        }
    }
    release(queryId) {
        this.slowQueries.delete(queryId);
    }
    evaluatePolicyGate(input) {
        const reasons = [];
        const tags = new Set([...(input.budgetTags ?? []), ...(input.abacTags ?? [])]);
        if (input.denylistTags?.some((tag) => tags.has(tag))) {
            reasons.push('denylist-tag');
        }
        if (input.requiresApproval) {
            reasons.push('approval-required');
        }
        if (input.estimatedCostUsd !== undefined && input.estimatedCostUsd > 100) {
            reasons.push('cost-cap-exceeded');
        }
        if (input.action === 'export' && !tags.has('export-approved')) {
            reasons.push('export-not-approved');
        }
        let action = 'allow';
        if (reasons.some((reason) => reason.includes('denylist') || reason.includes('cost-cap'))) {
            action = 'deny';
        }
        else if (reasons.length > 0) {
            action = 'warn';
        }
        return {
            action,
            reasons,
            evaluatedAt: new Date().toISOString(),
            tags: Array.from(tags),
        };
    }
}
exports.CostGuard = CostGuard;
const DEFAULT_OPTIMIZATION_CONFIG = {
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
exports.DEFAULT_OPTIMIZATION_CONFIG = DEFAULT_OPTIMIZATION_CONFIG;
const DEFAULT_QUEUE_SLO = {
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
exports.DEFAULT_QUEUE_SLO = DEFAULT_QUEUE_SLO;
class ResourceOptimizationEngine {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
    }
    recommendScaling(currentNodes, samples) {
        const forecast = this.forecast(samples);
        const loadIndex = this.calculateLoadIndex(forecast);
        const confidence = this.calculateConfidence(samples.length);
        let action = 'hold';
        let recommendedNodes = currentNodes;
        const clamp = (value) => Math.min(this.config.maxNodes, Math.max(this.config.minNodes, Math.max(1, Math.round(value))));
        if (loadIndex > this.config.scaleUpThreshold) {
            const scaled = Math.ceil(currentNodes * Math.max(loadIndex, this.config.scaleUpThreshold));
            recommendedNodes = clamp(Math.max(currentNodes + 1, scaled));
            action = recommendedNodes > currentNodes ? 'scale_up' : 'hold';
        }
        else if (loadIndex < this.config.scaleDownThreshold) {
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
    recommendQueueAutoscaling(currentReplicas, signals, slo = DEFAULT_QUEUE_SLO) {
        const safeServiceRate = Math.max(signals.serviceRatePerSecondPerWorker, 0);
        const safeReplicas = Math.max(1, currentReplicas);
        const totalOutstanding = Math.max(0, signals.backlog + signals.inflight);
        const capacityPerSecond = safeServiceRate * safeReplicas;
        const backlogSeconds = capacityPerSecond === 0
            ? Number.POSITIVE_INFINITY
            : totalOutstanding / capacityPerSecond;
        const latencyPressure = slo.targetP95Ms === 0
            ? 0
            : signals.observedP95LatencyMs / slo.targetP95Ms;
        const backlogPressure = slo.backlogTargetSeconds === 0 || !Number.isFinite(backlogSeconds)
            ? 0
            : backlogSeconds / slo.backlogTargetSeconds;
        const costPressure = slo.maxCostPerMinuteUsd === 0
            ? 0
            : signals.spendRatePerMinuteUsd / slo.maxCostPerMinuteUsd;
        const costBurnRate = slo.costBurnThreshold && slo.costBurnThreshold > 0
            ? costPressure / slo.costBurnThreshold
            : costPressure;
        const sloBurnRate = slo.latencyBurnThreshold && slo.latencyBurnThreshold > 0
            ? Math.max(latencyPressure / slo.latencyBurnThreshold, backlogPressure)
            : Math.max(latencyPressure, backlogPressure);
        const normalizedLatency = Number(latencyPressure.toFixed(3));
        const normalizedBacklog = Number(backlogPressure.toFixed(3));
        const normalizedCost = Number(costPressure.toFixed(3));
        const normalizedBacklogSeconds = Number((Number.isFinite(backlogSeconds) ? backlogSeconds : Number.MAX_SAFE_INTEGER)
            .toFixed(1));
        const adaptiveScaleStep = Math.min(slo.maxScaleStep ?? slo.scaleStep, Math.max(slo.scaleStep, Math.ceil(slo.scaleStep * Math.max(1, sloBurnRate))));
        let recommendedReplicas = safeReplicas;
        const backlogDrivenReplicas = safeServiceRate === 0 || slo.backlogTargetSeconds === 0
            ? safeReplicas + adaptiveScaleStep
            : Math.ceil((totalOutstanding / slo.backlogTargetSeconds) / safeServiceRate);
        const latencyDrivenReplicas = latencyPressure > 1
            ? Math.ceil(safeReplicas *
                Math.min(2.5, Math.max(1.2, latencyPressure + 0.15 * adaptiveScaleStep)))
            : safeReplicas;
        if (normalizedLatency > 1 || normalizedBacklog > 1) {
            recommendedReplicas = Math.max(safeReplicas + adaptiveScaleStep, backlogDrivenReplicas, latencyDrivenReplicas);
        }
        else if (normalizedCost > 1 && normalizedLatency < 0.9 && normalizedBacklog < 0.9) {
            const reliefStep = Math.max(1, Math.floor(safeReplicas * 0.2));
            const budgetAlignedReplicas = Math.max(slo.minReplicas, Math.ceil((signals.spendRatePerMinuteUsd / slo.maxCostPerMinuteUsd) * safeReplicas * 0.8));
            recommendedReplicas = Math.min(safeReplicas - reliefStep, budgetAlignedReplicas);
        }
        recommendedReplicas = Math.min(slo.maxReplicas, Math.max(slo.minReplicas, recommendedReplicas));
        const action = recommendedReplicas > safeReplicas
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
    buildQueueAlertConfig(queueName, slo, pressures) {
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
    buildKedaScaledObject(queueName, deploymentName, namespace, decision, slo = DEFAULT_QUEUE_SLO) {
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
    balanceWorkloads(nodes) {
        if (nodes.length === 0) {
            return {
                strategy: 'maintain',
                reason: 'No nodes available to balance.',
                confidence: 0,
                allocations: [],
            };
        }
        const totalSessions = nodes.reduce((sum, node) => sum + node.activeSessions, 0);
        const totalCapacity = nodes.reduce((sum, node) => sum + node.maxSessions, 0);
        if (totalCapacity === 0) {
            return {
                strategy: 'maintain',
                reason: 'Unable to compute target distribution without capacity metadata.',
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
        const loadRatios = nodes.map((node) => Math.max(node.cpuUtilization, node.memoryUtilization, node.maxSessions === 0 ? 0 : node.activeSessions / node.maxSessions));
        const minLoad = Math.min(...loadRatios);
        const maxLoad = Math.max(...loadRatios);
        const requiresRebalance = maxLoad - minLoad > this.config.rebalanceTolerance;
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
    forecast(samples) {
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
    calculateLoadIndex(forecast) {
        const cpuRatio = this.config.targetCpuUtilization === 0
            ? 0
            : forecast.cpuUtilization / this.config.targetCpuUtilization;
        const memoryRatio = this.config.targetMemoryUtilization === 0
            ? 0
            : forecast.memoryUtilization / this.config.targetMemoryUtilization;
        const throughputRatio = this.config.targetThroughputPerNode === 0
            ? 0
            : forecast.throughputPerNode / this.config.targetThroughputPerNode;
        return Number(Math.max(cpuRatio, memoryRatio, throughputRatio).toFixed(3));
    }
    calculateConfidence(observationCount) {
        if (observationCount <= 0) {
            return 0;
        }
        return Number(Math.min(1, observationCount / this.config.confidenceWindow).toFixed(3));
    }
    buildScalingReason(action, loadIndex, forecast) {
        if (action === 'scale_up') {
            return `Predicted workload exceeds guardrails (load index ${loadIndex.toFixed(2)}); scaling up to maintain performance.`;
        }
        if (action === 'scale_down') {
            return `Forecast suggests excess capacity (load index ${loadIndex.toFixed(2)}); scaling down to improve efficiency.`;
        }
        return `Workload steady (load index ${loadIndex.toFixed(2)}); maintaining current capacity.`;
    }
    buildQueueScalingReason(action, pressure) {
        if (action === 'scale_up') {
            return `Latency/backlog pressure (${pressure.latency.toFixed(2)}/${pressure.backlog.toFixed(2)}) exceeds SLO guardrails; requesting more replicas.`;
        }
        if (action === 'scale_down') {
            return `Cost pressure ${pressure.cost.toFixed(2)} dominates while latency/backlog are healthy; reducing replicas to protect budget.`;
        }
        return `Within SLO envelopes (latency ${pressure.latency.toFixed(2)}, backlog ${pressure.backlog.toFixed(2)}, cost ${pressure.cost.toFixed(2)}); holding steady.`;
    }
}
exports.ResourceOptimizationEngine = ResourceOptimizationEngine;
var performanceOperatingSystem_js_1 = require("./performanceOperatingSystem.js");
Object.defineProperty(exports, "PerformanceBudgetGate", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.PerformanceBudgetGate; } });
Object.defineProperty(exports, "TopOffenderBoard", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.TopOffenderBoard; } });
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.CacheManager; } });
Object.defineProperty(exports, "ResponseShaper", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.ResponseShaper; } });
Object.defineProperty(exports, "AsyncJobManager", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.AsyncJobManager; } });
Object.defineProperty(exports, "TelemetryCostController", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.TelemetryCostController; } });
Object.defineProperty(exports, "ReleaseMarkerEmitter", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.ReleaseMarkerEmitter; } });
Object.defineProperty(exports, "PerformanceCostOperatingSystem", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.PerformanceCostOperatingSystem; } });
Object.defineProperty(exports, "DEFAULT_CACHE_CONFIG", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.DEFAULT_CACHE_CONFIG; } });
Object.defineProperty(exports, "DEFAULT_JOURNEY_TARGETS", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.DEFAULT_JOURNEY_TARGETS; } });
Object.defineProperty(exports, "DEFAULT_BUDGETS", { enumerable: true, get: function () { return performanceOperatingSystem_js_1.DEFAULT_BUDGETS; } });
