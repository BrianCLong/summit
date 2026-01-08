import { beforeEach, describe, expect, it } from "vitest";
import {
  MetaOrchestrator,
  type AuditEntry,
  type ExecutionAdapter,
  type PricingFeed,
  type StageExecutionRequest,
  type StageExecutionResult,
} from "../src/index.js";
import type {
  CloudProviderDescriptor,
  PipelineStageDefinition,
  PricingSignal,
} from "@ga-graphai/common-types";

class LocalPricingFeed implements PricingFeed {
  constructor(private signals: PricingSignal[]) {}

  setSignals(signals: PricingSignal[]): void {
    this.signals = signals;
  }

  async getPricingSignals(): Promise<PricingSignal[]> {
    return this.signals;
  }
}

describe("MetaOrchestrator resilience middleware", () => {
  let providers: CloudProviderDescriptor[];
  let stage: PipelineStageDefinition;
  let pricing: PricingSignal[];
  let auditTrail: AuditEntry[];

  beforeEach(() => {
    providers = [
      {
        name: "azure",
        regions: ["eastus"],
        services: ["compute"],
        reliabilityScore: 0.97,
        securityCertifications: ["fedramp"],
        maxThroughputPerMinute: 120,
        baseLatencyMs: 50,
        policyTags: ["fedramp"],
      },
      {
        name: "aws",
        regions: ["us-east-1"],
        services: ["compute"],
        reliabilityScore: 0.95,
        securityCertifications: ["fedramp"],
        maxThroughputPerMinute: 110,
        baseLatencyMs: 60,
        policyTags: ["fedramp"],
      },
    ];

    stage = {
      id: "resilience-stage",
      name: "Resilience Stage",
      requiredCapabilities: ["compute"],
      complianceTags: ["fedramp"],
      minThroughputPerMinute: 80,
      slaSeconds: 120,
      guardrail: {
        maxErrorRate: 0.1,
        recoveryTimeoutSeconds: 10,
      },
      fallbackStrategies: [{ provider: "aws", region: "us-east-1", trigger: "execution-failure" }],
    };

    pricing = [
      {
        provider: "azure",
        region: "eastus",
        service: "compute",
        pricePerUnit: 1,
        currency: "USD",
        unit: "per-minute",
        effectiveAt: new Date().toISOString(),
      },
      {
        provider: "aws",
        region: "us-east-1",
        service: "compute",
        pricePerUnit: 1.2,
        currency: "USD",
        unit: "per-minute",
        effectiveAt: new Date().toISOString(),
      },
    ];

    auditTrail = [];
  });

  it("retries with timeout and succeeds on a subsequent attempt", async () => {
    class TimeoutThenSuccessAdapter implements ExecutionAdapter {
      public calls = 0;

      async execute(request: StageExecutionRequest): Promise<StageExecutionResult> {
        this.calls += 1;
        if (this.calls === 1) {
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
        return {
          status: "success",
          throughputPerMinute: request.stage.minThroughputPerMinute,
          cost: request.decision.expectedCost ?? 0.5,
          errorRate: 0.05,
          logs: [`attempt-${this.calls}`],
        };
      }
    }

    const execution = new TimeoutThenSuccessAdapter();
    const orchestrator = new MetaOrchestrator({
      pipelineId: "resilience-pipeline",
      providers,
      pricingFeed: new LocalPricingFeed(pricing),
      execution,
      auditSink: { record: (entry) => auditTrail.push(entry) },
      resilience: { timeoutMs: 5, maxRetries: 1, backoffMs: 1 },
      featureFlags: { gracefulDegradation: false },
    });

    const outcome = await orchestrator.executePlan([stage]);

    expect(outcome.trace[0].status).toBe("success");
    expect(outcome.trace[0].fallbackTriggered).toBe("timeout");
    expect(execution.calls).toBe(2);
  });

  it("opens the circuit breaker and gracefully degrades when failures persist", async () => {
    class AlwaysFailingAdapter implements ExecutionAdapter {
      public calls = 0;

      async execute(): Promise<StageExecutionResult> {
        this.calls += 1;
        return {
          status: "failure",
          throughputPerMinute: 0,
          cost: 0,
          errorRate: 1,
          logs: [`failure-${this.calls}`],
        };
      }
    }

    const execution = new AlwaysFailingAdapter();
    const orchestrator = new MetaOrchestrator({
      pipelineId: "resilience-pipeline",
      providers,
      pricingFeed: new LocalPricingFeed(pricing),
      execution,
      auditSink: { record: (entry) => auditTrail.push(entry) },
      resilience: {
        maxRetries: 0,
        backoffMs: 1,
        timeoutMs: 10,
        circuitBreaker: { failureThreshold: 1, cooldownMs: 1000 },
      },
      featureFlags: { gracefulDegradation: true, enableCircuitBreaker: true },
    });

    const firstOutcome = await orchestrator.executePlan([stage]);
    const secondOutcome = await orchestrator.executePlan([stage]);

    expect(firstOutcome.trace[0].degraded).toBe(true);
    expect(secondOutcome.trace[0].featureFlags).toContain("circuit-breaker");
    expect(secondOutcome.trace[0].fallbackTriggered).toBe("graceful-degradation");
  });

  it("enables deterministic mode with seeded logging", async () => {
    class DeterministicAdapter implements ExecutionAdapter {
      public calls = 0;

      async execute(request: StageExecutionRequest): Promise<StageExecutionResult> {
        this.calls += 1;
        return {
          status: "success",
          throughputPerMinute: request.stage.minThroughputPerMinute,
          cost: request.decision.expectedCost ?? 1,
          errorRate: 0.02,
          logs: [`run-${this.calls}`],
        };
      }
    }

    const execution = new DeterministicAdapter();
    const orchestrator = new MetaOrchestrator({
      pipelineId: "deterministic-pipeline",
      providers,
      pricingFeed: new LocalPricingFeed(pricing),
      execution,
      auditSink: { record: (entry) => auditTrail.push(entry) },
      featureFlags: { deterministicLogging: true },
      mode: "deterministic",
      deterministicSeed: 123,
    });

    const outcome = await orchestrator.executePlan([stage]);
    const traceEntry = outcome.trace[0];

    expect(outcome.plan.metadata.executionMode).toBe("deterministic");
    expect(outcome.plan.metadata.deterministicSeed).toBe(123);
    expect(traceEntry.logs[0]).toContain("deterministic seed=123");
    expect(traceEntry.featureFlags).toContain("deterministic");
  });
});
