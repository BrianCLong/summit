import { describe, expect, it } from "vitest";
import {
  CostGuard,
  DEFAULT_OPTIMIZATION_CONFIG,
  DEFAULT_PROFILE,
  DEFAULT_QUEUE_SLO,
  ResourceOptimizationEngine,
} from "../src/index.js";

describe("CostGuard", () => {
  it("allows lightweight plans", () => {
    const guard = new CostGuard();
    const decision = guard.planBudget({
      tenantId: "tenant-a",
      plan: {
        estimatedRru: 40,
        estimatedLatencyMs: 300,
        depth: 2,
        operations: 25,
        containsCartesianProduct: false,
      },
      activeQueries: 3,
      recentLatencyP95: 400,
    });
    expect(decision.action).toBe("allow");
    expect(decision.metrics.projectedLatencyMs).toBeGreaterThan(0);
  });

  it("throttles when latency or saturation is high", () => {
    const guard = new CostGuard({ ...DEFAULT_PROFILE, concurrencyLimit: 2 });
    const decision = guard.planBudget({
      tenantId: "tenant-b",
      plan: {
        estimatedRru: 80,
        estimatedLatencyMs: 1400,
        depth: 6,
        operations: 120,
        containsCartesianProduct: false,
      },
      activeQueries: 2,
      recentLatencyP95: 2000,
    });
    expect(decision.action).toBe("throttle");
    expect(guard.metrics.budgetsExceeded).toBe(1);
  });

  it("kills dangerous query plans and tracks slow queries", () => {
    const guard = new CostGuard();
    const decision = guard.planBudget({
      tenantId: "tenant-c",
      plan: {
        estimatedRru: 500,
        estimatedLatencyMs: 8000,
        depth: 3,
        operations: 60,
        containsCartesianProduct: true,
      },
      activeQueries: 1,
      recentLatencyP95: 1200,
    });
    expect(decision.action).toBe("kill");
    expect(decision.reasonCode).toBeDefined();
    const record = guard.killSlowQuery(
      "query-1",
      "tenant-c",
      "exceeded budget",
      "cartesian-product"
    );
    guard.observeQueryCompletion(record.queryId, 3200);
    expect(guard.metrics.kills).toBe(1);
    expect(guard.metrics.activeSlowQueries).toBe(1);
    expect(guard.metrics.killReasons["cartesian-product"]).toBe(1);
    guard.release(record.queryId);
    expect(guard.metrics.activeSlowQueries).toBe(0);
  });

  it("evaluates policy gates with allow/deny reasons", () => {
    const guard = new CostGuard();
    const decision = guard.evaluatePolicyGate({
      tenantId: "tenant-policy",
      action: "export",
      budgetTags: ["budget:low"],
      abacTags: ["class:restricted"],
      estimatedCostUsd: 180,
      denylistTags: ["class:restricted"],
    });
    expect(decision.action).toBe("deny");
    expect(decision.reasons).toContain("denylist-tag");
    expect(decision.reasons).toContain("cost-cap-exceeded");
  });

  it("produces adaptive queue scaling signals that blend cost and latency", () => {
    const guard = new CostGuard({ ...DEFAULT_PROFILE, maxLatencyMs: 1200 });
    const hotSignal = guard.evaluateQueueScaling({
      queueDepth: 28,
      p95LatencyMs: 1800,
      costPerJobUsd: 0.42,
      budgetConsumptionRatio: 0.65,
      saturationRatio: 0.9,
    });

    expect(hotSignal.action).toBe("scale_up");
    expect(hotSignal.recommendedReplicas).toBeGreaterThan(guard.metrics.kills + 1);

    const idleSignal = guard.evaluateQueueScaling({
      queueDepth: 0,
      p95LatencyMs: 120,
      costPerJobUsd: 0.55,
      budgetConsumptionRatio: 0.92,
      saturationRatio: 0.1,
    });

    expect(idleSignal.action).toBe("scale_down");
    expect(idleSignal.score).toBeLessThan(0.4);
  });
});

describe("ResourceOptimizationEngine", () => {
  it("recommends scaling up when predictive load exceeds thresholds", () => {
    const engine = new ResourceOptimizationEngine();
    const samples = [
      {
        timestamp: 1,
        cpuUtilization: 0.62,
        memoryUtilization: 0.58,
        throughputPerNode: 110,
      },
      {
        timestamp: 2,
        cpuUtilization: 0.74,
        memoryUtilization: 0.67,
        throughputPerNode: 128,
      },
      {
        timestamp: 3,
        cpuUtilization: 0.88,
        memoryUtilization: 0.73,
        throughputPerNode: 140,
      },
    ];
    const decision = engine.recommendScaling(6, samples);
    expect(decision.action).toBe("scale_up");
    expect(decision.recommendedNodes).toBeGreaterThan(6);
    expect(decision.forecast.cpuUtilization).toBeGreaterThan(0.7);
    expect(decision.loadIndex).toBeGreaterThan(DEFAULT_OPTIMIZATION_CONFIG.scaleUpThreshold);
  });

  it("recommends scaling down when load falls below thresholds", () => {
    const engine = new ResourceOptimizationEngine({ minNodes: 2 });
    const samples = [
      {
        timestamp: 1,
        cpuUtilization: 0.28,
        memoryUtilization: 0.26,
        throughputPerNode: 52,
      },
      {
        timestamp: 2,
        cpuUtilization: 0.24,
        memoryUtilization: 0.22,
        throughputPerNode: 48,
      },
      {
        timestamp: 3,
        cpuUtilization: 0.21,
        memoryUtilization: 0.2,
        throughputPerNode: 44,
      },
    ];
    const decision = engine.recommendScaling(8, samples);
    expect(decision.action).toBe("scale_down");
    expect(decision.recommendedNodes).toBeLessThan(8);
    expect(decision.recommendedNodes).toBeGreaterThanOrEqual(2);
  });

  it("produces workload balancing guidance for uneven clusters", () => {
    const engine = new ResourceOptimizationEngine({ rebalanceTolerance: 0.1 });
    const plan = engine.balanceWorkloads([
      {
        nodeId: "node-a",
        cpuUtilization: 0.86,
        memoryUtilization: 0.74,
        activeSessions: 92,
        maxSessions: 100,
      },
      {
        nodeId: "node-b",
        cpuUtilization: 0.38,
        memoryUtilization: 0.4,
        activeSessions: 34,
        maxSessions: 100,
      },
      {
        nodeId: "node-c",
        cpuUtilization: 0.41,
        memoryUtilization: 0.36,
        activeSessions: 38,
        maxSessions: 100,
      },
    ]);

    expect(plan.strategy).toBe("rebalance");
    const overloaded = plan.allocations.find((allocation) => allocation.nodeId === "node-a");
    const underloaded = plan.allocations.find((allocation) => allocation.nodeId === "node-b");
    expect(overloaded?.delta).toBeLessThan(0);
    expect(underloaded?.delta).toBeGreaterThan(0);
  });

  it("suggests scaling up when latency and backlog exceed SLOs", () => {
    const engine = new ResourceOptimizationEngine();
    const decision = engine.recommendQueueAutoscaling(
      3,
      {
        queueName: "agent-default",
        backlog: 240,
        inflight: 30,
        arrivalRatePerSecond: 5,
        serviceRatePerSecondPerWorker: 1.5,
        observedP95LatencyMs: 2400,
        costPerJobUsd: 0.02,
        spendRatePerMinuteUsd: 5,
      },
      { ...DEFAULT_QUEUE_SLO, targetP95Ms: 1500, backlogTargetSeconds: 60 }
    );

    expect(decision.action).toBe("scale_up");
    expect(decision.recommendedReplicas).toBeGreaterThan(3);
    expect(decision.telemetry.latencyPressure).toBeGreaterThan(1);
    expect(decision.kedaMetric.metricName).toBe("agent_queue_slo_pressure");
    expect(decision.telemetry.sloBurnRate).toBeGreaterThan(1);
    expect(decision.alerts.fastBurnRateQuery).toContain("agent_queue_slo_pressure");
  });

  it("scales down when cost pressure dominates and performance is healthy", () => {
    const engine = new ResourceOptimizationEngine();
    const decision = engine.recommendQueueAutoscaling(
      10,
      {
        queueName: "agent-default",
        backlog: 10,
        inflight: 2,
        arrivalRatePerSecond: 1,
        serviceRatePerSecondPerWorker: 3,
        observedP95LatencyMs: 600,
        costPerJobUsd: 0.12,
        spendRatePerMinuteUsd: 36,
      },
      { ...DEFAULT_QUEUE_SLO, maxCostPerMinuteUsd: 20, minReplicas: 2 }
    );

    expect(decision.action).toBe("scale_down");
    expect(decision.recommendedReplicas).toBeLessThan(10);
    expect(decision.telemetry.costPressure).toBeGreaterThan(1);
    expect(decision.telemetry.latencyPressure).toBeLessThan(1);
    expect(decision.telemetry.costBurnRate).toBeGreaterThanOrEqual(decision.telemetry.costPressure);
  });

  it("produces KEDA scaled object and alert config for queues", () => {
    const engine = new ResourceOptimizationEngine();
    const decision = engine.recommendQueueAutoscaling(
      4,
      {
        queueName: "agent-priority",
        backlog: 120,
        inflight: 14,
        arrivalRatePerSecond: 4,
        serviceRatePerSecondPerWorker: 1.1,
        observedP95LatencyMs: 2100,
        costPerJobUsd: 0.15,
        spendRatePerMinuteUsd: 14,
      },
      {
        ...DEFAULT_QUEUE_SLO,
        targetP95Ms: 1300,
        backlogTargetSeconds: 80,
        latencyBurnThreshold: 1.1,
        costBurnThreshold: 1.2,
      }
    );

    const scaledObject = engine.buildKedaScaledObject(
      "agent-priority",
      "worker-agent",
      "workloads",
      decision
    );

    expect(scaledObject.metadata.name).toBe("worker-agent-keda");
    expect(scaledObject.spec.scaleTargetRef.name).toBe("worker-agent");
    expect(scaledObject.spec.triggers).toHaveLength(2);
    expect(scaledObject.spec.triggers[0].metadata.query).toContain("agent_queue_slo_pressure");
    expect(decision.alerts.costAnomalyQuery).toContain("agent_queue_cost_pressure");
  });
});
