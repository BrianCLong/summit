import { describe, expect, it, beforeEach } from 'vitest';
import {
  MetaOrchestrator,
  TemplateReasoningModel,
  type AuditEntry,
  type ExecutionAdapter,
  type PricingFeed,
  type StageExecutionRequest,
  type StageExecutionResult,
} from '../src/index.js';
import type {
  CloudProviderDescriptor,
  PipelineStageDefinition,
  PricingSignal,
} from '@ga-graphai/common-types';

class MockPricingFeed implements PricingFeed {
  constructor(private signals: PricingSignal[]) {}

  setSignals(signals: PricingSignal[]): void {
    this.signals = signals;
  }

  async getPricingSignals(): Promise<PricingSignal[]> {
    return this.signals;
  }
}

class ScriptedExecutionAdapter implements ExecutionAdapter {
  private readonly script = new Map<string, StageExecutionResult[]>();

  setResponse(
    provider: string,
    result: StageExecutionResult | StageExecutionResult[],
  ): void {
    const values = Array.isArray(result) ? result : [result];
    this.script.set(provider, values);
  }

  async execute(request: StageExecutionRequest): Promise<StageExecutionResult> {
    const entries = this.script.get(request.decision.provider);
    if (!entries || entries.length === 0) {
      return {
        status: 'success',
        throughputPerMinute: request.stage.minThroughputPerMinute,
        cost: request.decision.expectedCost,
        errorRate: 0.01,
        logs: ['default-success'],
      };
    }
    const result = entries.shift();
    if (!result) {
      throw new Error('no scripted result');
    }
    this.script.set(request.decision.provider, entries);
    return result;
  }
}

describe('MetaOrchestrator', () => {
  let providers: CloudProviderDescriptor[];
  let stage: PipelineStageDefinition;
  let pricing: PricingSignal[];
  let pricingFeed: MockPricingFeed;
  let execution: ScriptedExecutionAdapter;
  let auditTrail: AuditEntry[];

  beforeEach(() => {
    providers = [
      {
        name: 'aws',
        regions: ['us-east-1'],
        services: ['compute', 'ml'],
        reliabilityScore: 0.94,
        sustainabilityScore: 0.5,
        securityCertifications: ['fedramp', 'pci'],
        maxThroughputPerMinute: 140,
        baseLatencyMs: 70,
        policyTags: ['fedramp', 'pci'],
        dataResidencyTags: ['fedramp', 'us-east-1'],
        sovereignRegions: ['us-gov-west-1'],
      },
      {
        name: 'azure',
        regions: ['eastus'],
        services: ['compute', 'ml'],
        reliabilityScore: 0.97,
        sustainabilityScore: 0.7,
        securityCertifications: ['fedramp', 'hipaa'],
        maxThroughputPerMinute: 120,
        baseLatencyMs: 65,
        policyTags: ['fedramp', 'hipaa', 'sovereign'],
        dataResidencyTags: ['fedramp', 'eastus'],
        sovereignRegions: ['eastus'],
      },
      {
        name: 'oci',
        regions: ['us-phoenix-1'],
        services: ['compute'],
        reliabilityScore: 0.92,
        sustainabilityScore: 0.6,
        securityCertifications: ['iso'],
        maxThroughputPerMinute: 130,
        baseLatencyMs: 80,
        policyTags: ['iso', 'sovereign'],
        dataResidencyTags: ['iso', 'us-phoenix-1'],
        sovereignRegions: ['us-phoenix-1'],
      },
    ];

    stage = {
      id: 'build-stage',
      name: 'Secure Build',
      requiredCapabilities: ['compute'],
      complianceTags: ['fedramp'],
      minThroughputPerMinute: 100,
      slaSeconds: 600,
      guardrail: {
        maxErrorRate: 0.05,
        recoveryTimeoutSeconds: 120,
      },
      fallbackStrategies: [
        { provider: 'aws', region: 'us-east-1', trigger: 'execution-failure' },
      ],
      dataResidency: ['fedramp'],
      sensitivityLevel: 3,
    };

    pricing = [
      {
        provider: 'aws',
        region: 'us-east-1',
        service: 'compute',
        pricePerUnit: 1.1,
        currency: 'USD',
        unit: 'per-minute',
        effectiveAt: new Date().toISOString(),
      },
      {
        provider: 'azure',
        region: 'eastus',
        service: 'compute',
        pricePerUnit: 0.9,
        currency: 'USD',
        unit: 'per-minute',
        effectiveAt: new Date().toISOString(),
      },
    ];

    pricingFeed = new MockPricingFeed(pricing);
    execution = new ScriptedExecutionAdapter();
    auditTrail = [];
  });

  it('produces an explainable plan that favours cost and reliability', async () => {
    const orchestrator = new MetaOrchestrator({
      pipelineId: 'pipeline-x',
      providers,
      pricingFeed,
      execution,
      auditSink: {
        record: (entry) => {
          auditTrail.push(entry);
        },
      },
      reasoningModel: new TemplateReasoningModel(),
    });

    const plan = await orchestrator.createPlan([stage]);
    expect(plan.steps[0].primary.provider).toBe('azure');
    expect(plan.steps[0].fallbacks[0].provider).toBe('aws');
    expect(plan.steps[0].explanation.narrative).toContain('Secure Build');
    expect(plan.steps[0].primary.residency).toBe('fedramp');
    expect(plan.steps[0].primary.privacyCost).toBeGreaterThan(0);
    expect(auditTrail.some((entry) => entry.category === 'plan')).toBe(true);
  });

  it('responds to pricing changes by switching providers', async () => {
    const orchestrator = new MetaOrchestrator({
      pipelineId: 'pipeline-x',
      providers,
      pricingFeed,
      execution,
      auditSink: { record: () => undefined },
      reasoningModel: new TemplateReasoningModel(),
    });

    const initialPlan = await orchestrator.createPlan([stage]);
    expect(initialPlan.steps[0].primary.provider).toBe('azure');

    pricingFeed.setSignals([
      {
        provider: 'aws',
        region: 'us-east-1',
        service: 'compute',
        pricePerUnit: 0.6,
        currency: 'USD',
        unit: 'per-minute',
        effectiveAt: new Date().toISOString(),
      },
      {
        provider: 'azure',
        region: 'eastus',
        service: 'compute',
        pricePerUnit: 1.9,
        currency: 'USD',
        unit: 'per-minute',
        effectiveAt: new Date().toISOString(),
      },
    ]);

    const updatedPlan = await orchestrator.createPlan([stage]);
    expect(updatedPlan.steps[0].primary.provider).toBe('aws');
  });

  it('self-heals by invoking fallbacks and records rewards', async () => {
    execution.setResponse('azure', [
      {
        status: 'failure',
        throughputPerMinute: 40,
        cost: 120,
        errorRate: 0.2,
        logs: ['azure failure'],
      },
    ]);
    execution.setResponse('aws', [
      {
        status: 'success',
        throughputPerMinute: 130,
        cost: 80,
        errorRate: 0.01,
        logs: ['aws recovery'],
      },
    ]);

    const orchestrator = new MetaOrchestrator({
      pipelineId: 'pipeline-x',
      providers,
      pricingFeed,
      execution,
      auditSink: {
        record: (entry) => {
          auditTrail.push(entry);
        },
      },
      reasoningModel: new TemplateReasoningModel(),
    });

    const outcome = await orchestrator.executePlan([stage], {
      commit: 'abc123',
    });
    expect(outcome.trace[0].status).toBe('recovered');
    expect(outcome.trace[0].provider).toBe('aws');
    expect(outcome.rewards[0].recovered).toBe(true);
    expect(outcome.rewards[0].observedThroughput).toBe(130);
    expect(auditTrail.some((entry) => entry.category === 'fallback')).toBe(
      true,
    );
    expect(auditTrail.some((entry) => entry.category === 'reward-update')).toBe(
      true,
    );

    const telemetry = orchestrator.deriveTelemetry(outcome);
    expect(telemetry.throughputPerMinute).toBe(130);
    expect(telemetry.selfHealingRate).toBeGreaterThan(0);
  });

  it('enforces sovereign placement for sensitive stages', async () => {
    const orchestrator = new MetaOrchestrator({
      pipelineId: 'pipeline-x',
      providers,
      pricingFeed,
      execution,
      auditSink: { record: () => undefined },
      reasoningModel: new TemplateReasoningModel(),
    });

    const sovereignStage: PipelineStageDefinition = {
      ...stage,
      id: 'sovereign-stage',
      dataResidency: ['sovereign'],
      sovereignRequired: true,
      sensitivityLevel: 5,
    };

    const plan = await orchestrator.createPlan([sovereignStage]);
    expect(plan.steps[0].primary.policyReasons).toContain(
      'sovereign routing enforced',
    );
    expect(plan.steps[0].primary.residency).toBeDefined();
  });
});
