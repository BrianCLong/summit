import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GenerativeActionTranslator,
  MetaOrchestrator,
  TemplateReasoningModel,
  type AuditEntry,
  type ExecutionAdapter,
  type ExecutionOutcome,
  type PricingFeed,
  type StageExecutionRequest,
  type StageExecutionResult,
} from '../src/index.js';
import { OrchestrationKnowledgeGraph } from '@ga-graphai/knowledge-graph';
import type {
  CloudProviderDescriptor,
  PipelineStageDefinition,
  PolicyActorContext,
  PolicyEvaluationResult,
  PricingSignal,
  StageFallbackStrategy,
} from '@ga-graphai/common-types';

class StaticPricingFeed implements PricingFeed {
  constructor(private readonly signals: PricingSignal[]) {}

  async getPricingSignals(): Promise<PricingSignal[]> {
    return this.signals;
  }
}

class DeterministicExecutionAdapter implements ExecutionAdapter {
  constructor(
    private readonly responders: Record<string, () => StageExecutionResult>,
  ) {}

  async execute(request: StageExecutionRequest): Promise<StageExecutionResult> {
    const responder = this.responders[request.decision.provider];
    if (responder) {
      return responder();
    }
    return {
      status: 'success',
      throughputPerMinute: request.stage.minThroughputPerMinute,
      cost: request.decision.expectedCost,
      errorRate: 0.01,
      logs: ['default-success'],
    };
  }
}

function allowAllPolicy(): PolicyEvaluationResult {
  return {
    allowed: true,
    effect: 'allow',
    matchedRules: ['allow-all'],
    reasons: ['policy:allow-all'],
    obligations: [],
    trace: [
      {
        ruleId: 'allow-all',
        matched: true,
        reasons: ['policy:allow-all'],
      },
    ],
  };
}

function buildProviders(): CloudProviderDescriptor[] {
  return [
    {
      name: 'aws',
      regions: ['us-east-1'],
      services: ['compute', 'ml'],
      reliabilityScore: 0.92,
      sustainabilityScore: 0.55,
      securityCertifications: ['fedramp', 'hipaa'],
      maxThroughputPerMinute: 180,
      baseLatencyMs: 60,
      policyTags: ['fedramp', 'hipaa'],
    },
    {
      name: 'azure',
      regions: ['eastus'],
      services: ['compute', 'ml'],
      reliabilityScore: 0.95,
      sustainabilityScore: 0.62,
      securityCertifications: ['fedramp', 'hipaa'],
      maxThroughputPerMinute: 170,
      baseLatencyMs: 70,
      policyTags: ['fedramp', 'hipaa'],
    },
  ];
}

function buildPricing(): PricingSignal[] {
  return [
    {
      provider: 'aws',
      region: 'us-east-1',
      service: 'compute',
      pricePerUnit: 0.8,
      currency: 'USD',
      unit: 'per-minute',
      effectiveAt: new Date().toISOString(),
    },
    {
      provider: 'azure',
      region: 'eastus',
      service: 'compute',
      pricePerUnit: 0.6,
      currency: 'USD',
      unit: 'per-minute',
      effectiveAt: new Date().toISOString(),
    },
    {
      provider: 'aws',
      region: 'us-east-1',
      service: 'ml',
      pricePerUnit: 1.2,
      currency: 'USD',
      unit: 'per-minute',
      effectiveAt: new Date().toISOString(),
    },
    {
      provider: 'azure',
      region: 'eastus',
      service: 'ml',
      pricePerUnit: 0.95,
      currency: 'USD',
      unit: 'per-minute',
      effectiveAt: new Date().toISOString(),
    },
  ];
}

function buildActor(): PolicyActorContext {
  return {
    tenantId: 'intelgraph',
    userId: 'hello-bot',
    roles: ['orchestrator'],
    region: 'us',
  };
}

function buildKnowledgeGraph(withCriticalIncident = false): OrchestrationKnowledgeGraph {
  const graph = new OrchestrationKnowledgeGraph();

  graph.registerServiceConnector({
    async loadServices() {
      return [
        {
          id: 'svc-hello',
          name: 'Hello Service',
          tier: 'tier-1',
          dependencies: ['svc-shared'],
        },
        {
          id: 'svc-case',
          name: 'Hello Case Engine',
          tier: 'tier-0',
          dependencies: ['svc-hello'],
          piiClassification: 'restricted',
          soxCritical: true,
        },
        { id: 'svc-shared', name: 'Shared Utility', tier: 'tier-2' },
      ];
    },
  });

  graph.registerEnvironmentConnector({
    async loadEnvironments() {
      return [
        { id: 'env-staging', name: 'Staging', stage: 'staging', region: 'us-east-1' },
        { id: 'env-prod', name: 'Production', stage: 'prod', region: 'eastus' },
      ];
    },
  });

  graph.registerPipelineConnector({
    async loadPipelines() {
      return [
        {
          id: 'pipeline-hello',
          name: 'Hello World',
          stages: [
            {
              id: 'hello-build',
              name: 'Build Artifact',
              pipelineId: 'pipeline-hello',
              serviceId: 'svc-hello',
              environmentId: 'env-staging',
              capability: 'compute',
              guardrails: {
                maxErrorRate: 0.05,
                recoveryTimeoutSeconds: 120,
                minThroughputPerMinute: 100,
                slaSeconds: 300,
                fallbackStrategies: [
                  { provider: 'aws', region: 'us-east-1', trigger: 'execution-failure' },
                ],
              },
              complianceTags: ['fedramp'],
            },
            {
              id: 'hello-case',
              name: 'Case Planner',
              pipelineId: 'pipeline-hello',
              serviceId: 'svc-case',
              environmentId: 'env-prod',
              capability: 'ml',
              guardrails: {
                maxErrorRate: 0.08,
                recoveryTimeoutSeconds: 180,
                minThroughputPerMinute: 80,
                slaSeconds: 450,
                fallbackStrategies: [
                  { provider: 'aws', region: 'us-east-1', trigger: 'execution-failure' },
                ],
              },
              complianceTags: ['hipaa'],
            },
          ],
        },
      ];
    },
  });

  graph.registerPolicyConnector({
    async loadPolicies() {
      return [
        {
          id: 'policy-default',
          description: 'Allow orchestrator automation',
          effect: 'allow',
          actions: ['orchestration.deploy'],
          resources: ['service:svc-hello', 'service:svc-case'],
          conditions: [],
          obligations: [],
        },
        {
          id: 'policy-high-risk',
          description: 'Gate risky case pushes',
          effect: 'allow',
          actions: ['orchestration.deploy'],
          resources: ['service:svc-case'],
          conditions: [],
          obligations: [],
          tags: ['high-risk'],
        },
      ];
    },
  });

  graph.registerIncidentConnector({
    async loadIncidents() {
      return withCriticalIncident
        ? [
            {
              id: 'incident-critical',
              serviceId: 'svc-case',
              environmentId: 'env-prod',
              severity: 'critical',
              occurredAt: new Date().toISOString(),
              status: 'open',
            },
          ]
        : [];
    },
  });

  graph.registerCostSignalConnector({
    async loadCostSignals() {
      return [
        {
          serviceId: 'svc-case',
          timeBucket: new Date().toISOString(),
          saturation: withCriticalIncident ? 0.85 : 0.35,
          budgetBreaches: withCriticalIncident ? 2 : 0,
          throttleCount: withCriticalIncident ? 1 : 0,
          slowQueryCount: withCriticalIncident ? 3 : 0,
        },
      ];
    },
  });

  return graph;
}

function deriveStagesFromGraph(
  graph: OrchestrationKnowledgeGraph,
  serviceId: string,
  pipelineId: string,
): PipelineStageDefinition[] {
  const pipelines = graph.queryService(serviceId)?.pipelines ?? [];
  const pipeline = pipelines.find((entry) => entry.id === pipelineId);
  if (!pipeline) {
    throw new Error(`pipeline ${pipelineId} not found for service ${serviceId}`);
  }

  return pipeline.stages.map((stage) => {
    const guardrails = (stage.guardrails ?? {}) as Record<string, unknown>;
    const fallbackStrategies = Array.isArray(guardrails.fallbackStrategies)
      ? (guardrails.fallbackStrategies as StageFallbackStrategy[])
      : [];

    return {
      id: stage.id,
      name: stage.name,
      requiredCapabilities: [stage.capability],
      complianceTags: stage.complianceTags ?? [],
      minThroughputPerMinute:
        (guardrails.minThroughputPerMinute as number | undefined) ?? 60,
      slaSeconds: (guardrails.slaSeconds as number | undefined) ?? 300,
      guardrail: {
        maxErrorRate: (guardrails.maxErrorRate as number | undefined) ?? 0.05,
        recoveryTimeoutSeconds:
          (guardrails.recoveryTimeoutSeconds as number | undefined) ?? 120,
      },
      fallbackStrategies,
    } satisfies PipelineStageDefinition;
  });
}

describe('Hello-World and Hello-Case orchestrations', () => {
  let auditTrail: AuditEntry[];

  beforeEach(() => {
    auditTrail = [];
  });

  it('runs the Hello-World path end-to-end through IntelGraph context', async () => {
    const graph = buildKnowledgeGraph();
    await graph.refresh();

    const helloContext = graph.queryService('svc-hello');
    expect(helloContext?.pipelines?.[0]?.stages).toHaveLength(2);

    const translator = new GenerativeActionTranslator({
      knowledgeGraph: graph,
      policyEvaluator: () => allowAllPolicy(),
      auditSink: { record: (entry) => auditTrail.push(entry) },
      defaultRollbackWindowMinutes: 15,
    });

    const intentPlan = translator.translate({
      type: 'deploy',
      targetServiceId: 'svc-hello',
      environmentId: 'env-staging',
      requestedBy: buildActor(),
      metadata: { release: 'hello-world' },
    });

    expect(intentPlan.guardrail.requiresApproval).toBe(false);
    expect(intentPlan.steps[1]?.command).toContain('run-stage --stage hello-build');
    expect(intentPlan.risk?.factors.incidentLoad).toBeDefined();
    expect(intentPlan.risk?.score).toBeGreaterThan(0);

    const stages = deriveStagesFromGraph(graph, 'svc-hello', 'pipeline-hello');
    expect(stages[0]?.fallbackStrategies?.[0]?.provider).toBe('aws');

    const orchestrator = new MetaOrchestrator({
      pipelineId: 'pipeline-hello',
      providers: buildProviders(),
      pricingFeed: new StaticPricingFeed(buildPricing()),
      execution: new DeterministicExecutionAdapter({
        azure: () => ({
          status: 'success',
          throughputPerMinute: 140,
          cost: 90,
          errorRate: 0.01,
          logs: ['azure-primary'],
        }),
      }),
      auditSink: { record: (entry) => auditTrail.push(entry) },
      reasoningModel: new TemplateReasoningModel(),
    });

    const outcome = await orchestrator.executePlan(stages, {
      rollout: 'hello-world',
    });
    const telemetry = orchestrator.deriveTelemetry(outcome);

    expect(outcome.plan.steps).toHaveLength(2);
    expect(outcome.trace.every((entry) => entry.status === 'success')).toBe(true);
    expect(telemetry.auditCompleteness).toBeCloseTo(1, 1);
    expect(auditTrail.some((entry) => entry.category === 'plan')).toBe(true);
  });

  it('runs the Hello-Case path with fallback, approvals, and load reshaping', async () => {
    const graph = buildKnowledgeGraph(true);
    await graph.refresh();

    const caseContext = graph.queryService('svc-case');
    expect(caseContext?.incidents?.some((incident) => incident.status === 'open')).toBe(true);

    const approvalQueue = { enqueue: vi.fn() };
    const translator = new GenerativeActionTranslator({
      knowledgeGraph: graph,
      policyEvaluator: () => allowAllPolicy(),
      auditSink: { record: (entry) => auditTrail.push(entry) },
      approvalQueue,
      defaultRollbackWindowMinutes: 10,
    });

    const intentPlan = translator.translate({
      type: 'deploy',
      targetServiceId: 'svc-case',
      environmentId: 'env-prod',
      requestedBy: buildActor(),
      riskTolerance: 'low',
      metadata: { caseId: 'CASE-123' },
    });

    expect(intentPlan.guardrail.requiresApproval).toBe(true);
    expect(approvalQueue.enqueue).toHaveBeenCalled();

    const orchestrator = new MetaOrchestrator({
      pipelineId: 'pipeline-hello',
      providers: buildProviders(),
      pricingFeed: new StaticPricingFeed(buildPricing()),
      execution: new DeterministicExecutionAdapter({
        azure: () => ({
          status: 'failure',
          throughputPerMinute: 50,
          cost: 120,
          errorRate: 0.2,
          logs: ['azure-degraded'],
        }),
        aws: () => ({
          status: 'success',
          throughputPerMinute: 150,
          cost: 85,
          errorRate: 0.02,
          logs: ['aws-recovery'],
        }),
      }),
      auditSink: { record: (entry) => auditTrail.push(entry) },
      reasoningModel: new TemplateReasoningModel(),
      selfHealing: { maxRetries: 1, backoffSeconds: 1, triggers: ['execution-failure'] },
    });

    const stages = deriveStagesFromGraph(graph, 'svc-case', 'pipeline-hello');
    const outcomes = await Promise.all(
      Array.from({ length: 3 }).map((_, index) =>
        orchestrator.executePlan(stages, { rollout: `hello-case-${index}` }),
      ),
    );

    const basePlan: ExecutionOutcome['plan'] = outcomes[0]?.plan ?? {
      pipelineId: 'pipeline-hello',
      generatedAt: new Date().toISOString(),
      steps: [],
      aggregateScore: 0,
      metadata: {},
    };

    const mergedOutcome = outcomes.reduce<ExecutionOutcome>((acc, current, index) => {
      if (index === 0) {
        acc.plan = current.plan;
      }
      acc.trace.push(...current.trace);
      acc.rewards.push(...current.rewards);
      return acc;
    }, { plan: basePlan, trace: [], rewards: [] });

    const traces = mergedOutcome.trace;
    const telemetry = orchestrator.deriveTelemetry(mergedOutcome);

    expect(traces.some((entry) => entry.status === 'recovered')).toBe(true);
    expect(telemetry.selfHealingRate).toBeGreaterThan(0);
    expect(auditTrail.some((entry) => entry.category === 'fallback')).toBe(true);
    expect(auditTrail.some((entry) => entry.category === 'reward-update')).toBe(true);
  });
});
