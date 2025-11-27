import type {
  CloudProviderDescriptor,
  ExecutionOutcome,
  ExecutionTraceEntry,
  ExplainablePlan,
  ExplainablePlanStep,
  FallbackTrigger,
  MetaOrchestratorTelemetry,
  PipelineStageDefinition,
  PlannerDecision,
  PlannerExplanation,
  PlannerObservation,
  PlannerRewardSignal,
  PlannerRewardWeights,
  PolicyRule,
  PricingSignal,
  SelfHealingPolicy,
  StageFallbackStrategy,
  StageExecutionGuardrail,
} from '@ga-graphai/common-types';
import {
  OrchestrationKnowledgeGraph,
  type CostSignalRecord,
  type EnvironmentRecord,
  type GraphSnapshot,
  type IncidentRecord,
  type PipelineRecord,
  type PipelineStageRecord,
  type ServiceRecord,
} from '@ga-graphai/knowledge-graph';

export interface PricingFeed {
  getPricingSignals(): Promise<PricingSignal[]>;
}

export interface ReasoningInput {
  stage: PipelineStageDefinition;
  primary: PlannerDecision;
  fallbacks: PlannerDecision[];
  breakdown: Record<string, number>;
}

export interface ReasoningModel {
  generateNarrative(input: ReasoningInput): Promise<string> | string;
}

export interface StageExecutionRequest {
  stage: PipelineStageDefinition;
  decision: PlannerDecision;
  planMetadata: Record<string, unknown>;
}

export interface StageExecutionResult {
  status: 'success' | 'failure';
  throughputPerMinute: number;
  cost: number;
  errorRate: number;
  logs: string[];
}

export interface ExecutionAdapter {
  execute(request: StageExecutionRequest): Promise<StageExecutionResult>;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  category: 'plan' | 'execution' | 'fallback' | 'reward-update';
  summary: string;
  data: Record<string, unknown>;
}

export interface AuditSink {
  record(entry: AuditEntry): void | Promise<void>;
}

export interface MetaOrchestratorOptions {
  pipelineId: string;
  providers: CloudProviderDescriptor[];
  pricingFeed: PricingFeed;
  execution: ExecutionAdapter;
  auditSink: AuditSink;
  reasoningModel?: ReasoningModel;
  rewardWeights?: PlannerRewardWeights;
  selfHealing?: SelfHealingPolicy;
}

const DEFAULT_WEIGHTS: PlannerRewardWeights = {
  cost: 0.25,
  throughput: 0.25,
  reliability: 0.25,
  compliance: 0.2,
  sustainability: 0.05,
};

const DEFAULT_SELF_HEALING: SelfHealingPolicy = {
  maxRetries: 2,
  backoffSeconds: 5,
  triggers: ['execution-failure', 'latency-breach', 'cost-spike'],
};

function nowIso(): string {
  return new Date().toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(values: number[]): number[] {
  if (values.length === 0) {
    return values;
  }
  const max = Math.max(...values);
  if (max === 0) {
    return values.map(() => 0);
  }
  return values.map((value) => value / max);
}

function matchPricing(
  pricing: PricingSignal[],
  provider: string,
  region: string,
  capability: string,
): PricingSignal | undefined {
  return pricing.find(
    (signal) =>
      signal.provider === provider &&
      signal.region === region &&
      signal.service === capability,
  );
}

function complianceScore(
  provider: CloudProviderDescriptor,
  stage: PipelineStageDefinition,
): number {
  if (!stage.complianceTags.length) {
    return 1;
  }
  const providerTags = new Set(provider.policyTags ?? []);
  const satisfied = stage.complianceTags.filter((tag) => providerTags.has(tag));
  return satisfied.length / stage.complianceTags.length;
}

export class TemplateReasoningModel implements ReasoningModel {
  generateNarrative(input: ReasoningInput): string {
    const fallbackNames = input.fallbacks.map(
      (fallback) => `${fallback.provider}/${fallback.region}`,
    );
    const fallbackText =
      fallbackNames.length > 0 ? fallbackNames.join(', ') : 'none required';
    const dominantFactor =
      Object.entries(input.breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      'balanced';
    return [
      `Selected ${input.primary.provider}/${input.primary.region} for stage ${input.stage.name}.`,
      `Dominant factor: ${dominantFactor}.`,
      `Fallback path: ${fallbackText}.`,
    ].join(' ');
  }
}

class ActiveRewardShaper {
  private weights: PlannerRewardWeights;

  constructor(initial: PlannerRewardWeights) {
    this.weights = { ...initial };
  }

  getWeights(): PlannerRewardWeights {
    return { ...this.weights };
  }

  update(
    signals: PlannerRewardSignal[],
    stages: PipelineStageDefinition[],
  ): PlannerRewardWeights {
    if (signals.length === 0) {
      return this.getWeights();
    }
    const stageById = new Map(stages.map((stage) => [stage.id, stage]));
    for (const signal of signals) {
      const stage = stageById.get(signal.stageId);
      if (!stage) {
        continue;
      }
      if (signal.observedErrorRate > (stage.guardrail?.maxErrorRate ?? 0.05)) {
        this.weights.reliability = clamp(
          this.weights.reliability + 0.05,
          0.1,
          0.6,
        );
      }
      if (signal.observedThroughput < stage.minThroughputPerMinute) {
        this.weights.throughput = clamp(
          this.weights.throughput + 0.05,
          0.1,
          0.6,
        );
      }
      if (signal.observedCost > 0) {
        const unitCost =
          signal.observedCost / Math.max(signal.observedThroughput, 1);
        if (unitCost > 1) {
          this.weights.cost = clamp(this.weights.cost + 0.05, 0.1, 0.6);
        }
      }
      if (signal.recovered) {
        this.weights.reliability = clamp(
          this.weights.reliability + 0.02,
          0.1,
          0.6,
        );
      }
    }
    return this.getWeights();
  }
}

interface CandidateScore {
  provider: CloudProviderDescriptor;
  region: string;
  capability: string;
  score: number;
  breakdown: Record<string, number>;
  decision: PlannerDecision;
}

export class HybridSymbolicLLMPlanner {
  private readonly providers: CloudProviderDescriptor[];
  private readonly reasoningModel: ReasoningModel;

  constructor(
    providers: CloudProviderDescriptor[],
    reasoningModel?: ReasoningModel,
  ) {
    this.providers = providers;
    this.reasoningModel = reasoningModel ?? new TemplateReasoningModel();
  }

  async plan(
    pipelineId: string,
    stages: PipelineStageDefinition[],
    observation: PlannerObservation,
    weights: PlannerRewardWeights,
  ): Promise<ExplainablePlan> {
    const steps: ExplainablePlanStep[] = [];
    for (const stage of stages) {
      const candidates = this.scoreCandidates(
        stage,
        observation.pricing,
        weights,
      );
      if (candidates.length === 0) {
        throw new Error(`no feasible providers for stage ${stage.id}`);
      }
      const [primary, ...fallbacks] = candidates.sort(
        (a, b) => b.score - a.score,
      );
      const explanation = await this.buildExplanation(
        stage,
        primary,
        fallbacks,
      );
      steps.push({
        stageId: stage.id,
        primary: primary.decision,
        fallbacks: fallbacks.slice(0, 2).map((fallback) => fallback.decision),
        explanation,
      });
    }
    const aggregateScore = steps.reduce(
      (acc, step) => acc + (step.explanation.scoreBreakdown.aggregate ?? 0),
      0,
    );
    return {
      pipelineId,
      generatedAt: nowIso(),
      steps,
      aggregateScore,
      metadata: { weights },
    };
  }

  private scoreCandidates(
    stage: PipelineStageDefinition,
    pricing: PricingSignal[],
    weights: PlannerRewardWeights,
  ): CandidateScore[] {
    const capabilities = stage.requiredCapabilities;
    const normalizedThroughput = normalize(
      this.providers.map((provider) => provider.maxThroughputPerMinute),
    );
    const normalizedReliability = normalize(
      this.providers.map((provider) => provider.reliabilityScore),
    );
    return this.providers.flatMap((provider, index) => {
      if (
        !capabilities.every((capability) =>
          provider.services.includes(capability),
        )
      ) {
        return [] as CandidateScore[];
      }
      const region = provider.regions[0];
      const capability = capabilities[0];
      const priceSignal = matchPricing(
        pricing,
        provider.name,
        region,
        capability,
      );
      const price = priceSignal?.pricePerUnit ?? 1.5;
      const compliance = complianceScore(provider, stage);
      if (compliance === 0) {
        return [] as CandidateScore[];
      }
      const throughputScore = normalizedThroughput[index] || 0;
      const reliabilityScore = normalizedReliability[index] || 0;
      const costScore = price === 0 ? 1 : clamp(1 / price, 0, 1);
      const sustainabilityScore = provider.sustainabilityScore ?? 0.5;
      const aggregate =
        weights.throughput * throughputScore +
        weights.reliability * reliabilityScore +
        weights.cost * costScore +
        weights.compliance * compliance +
        (weights.sustainability ?? 0) * sustainabilityScore;
      const decision: PlannerDecision = {
        provider: provider.name,
        region,
        expectedCost: price * stage.minThroughputPerMinute,
        expectedThroughput: Math.min(
          provider.maxThroughputPerMinute,
          stage.minThroughputPerMinute,
        ),
        expectedLatency: provider.baseLatencyMs,
      };
      return [
        {
          provider,
          region,
          capability,
          score: aggregate,
          breakdown: {
            throughput: throughputScore,
            reliability: reliabilityScore,
            cost: costScore,
            compliance,
            sustainability: sustainabilityScore,
            aggregate,
          },
          decision,
        },
      ];
    });
  }

  private async buildExplanation(
    stage: PipelineStageDefinition,
    primary: CandidateScore,
    fallbacks: CandidateScore[],
  ): Promise<PlannerExplanation> {
    const narrative = await this.reasoningModel.generateNarrative({
      stage,
      primary: primary.decision,
      fallbacks: fallbacks.map((fallback) => fallback.decision),
      breakdown: primary.breakdown,
    });
    const constraints = [`requires ${stage.requiredCapabilities.join(', ')}`];
    if (stage.complianceTags.length > 0) {
      constraints.push(`compliance tags ${stage.complianceTags.join(', ')}`);
    }
    if (stage.guardrail) {
      constraints.push(
        `error rate <= ${stage.guardrail.maxErrorRate} with recovery ${stage.guardrail.recoveryTimeoutSeconds}s`,
      );
    }
    return {
      stageId: stage.id,
      provider: primary.decision.provider,
      narrative,
      scoreBreakdown: primary.breakdown,
      constraints,
    };
  }
}

export class MetaOrchestrator {
  private readonly pipelineId: string;
  private readonly pricingFeed: PricingFeed;
  private readonly execution: ExecutionAdapter;
  private readonly auditSink: AuditSink;
  private readonly planner: HybridSymbolicLLMPlanner;
  private readonly rewardShaper: ActiveRewardShaper;
  private readonly selfHealing: SelfHealingPolicy;

  constructor(options: MetaOrchestratorOptions) {
    this.pipelineId = options.pipelineId;
    this.pricingFeed = options.pricingFeed;
    this.execution = options.execution;
    this.auditSink = options.auditSink;
    this.planner = new HybridSymbolicLLMPlanner(
      options.providers,
      options.reasoningModel,
    );
    this.rewardShaper = new ActiveRewardShaper(
      options.rewardWeights ?? DEFAULT_WEIGHTS,
    );
    this.selfHealing = options.selfHealing ?? DEFAULT_SELF_HEALING;
  }

  async createPlan(
    stages: PipelineStageDefinition[],
    observation?: PlannerObservation,
  ): Promise<ExplainablePlan> {
    const pricing =
      observation?.pricing ?? (await this.pricingFeed.getPricingSignals());
    const rewardSignals = observation?.rewards ?? [];
    const weights = this.rewardShaper.update(rewardSignals, stages);
    const plan = await this.planner.plan(
      this.pipelineId,
      stages,
      { pricing, rewards: rewardSignals },
      weights,
    );
    await this.auditSink.record({
      id: `${this.pipelineId}:${Date.now()}:plan`,
      timestamp: nowIso(),
      category: 'plan',
      summary: 'Hybrid planner generated explainable plan',
      data: plan,
    });
    return plan;
  }

  async executePlan(
    stages: PipelineStageDefinition[],
    planMetadata: Record<string, unknown> = {},
  ): Promise<ExecutionOutcome> {
    const plan = await this.createPlan(stages);
    const trace: ExecutionTraceEntry[] = [];
    const rewards: PlannerRewardSignal[] = [];

    for (const step of plan.steps) {
      const stage = stages.find((candidate) => candidate.id === step.stageId);
      if (!stage) {
        throw new Error(`unknown stage ${step.stageId}`);
      }
      const executionResult = await this.runStage(stage, step, planMetadata);
      trace.push(executionResult.traceEntry);
      rewards.push(executionResult.rewardSignal);
    }

    const updatedWeights = this.rewardShaper.update(rewards, stages);
    await this.auditSink.record({
      id: `${this.pipelineId}:${Date.now()}:reward`,
      timestamp: nowIso(),
      category: 'reward-update',
      summary: 'Updated reward weights after execution',
      data: { rewards, weights: updatedWeights },
    });

    return { plan, trace, rewards };
  }

  private async runStage(
    stage: PipelineStageDefinition,
    step: ExplainablePlanStep,
    metadata: Record<string, unknown>,
  ): Promise<{
    traceEntry: ExecutionTraceEntry;
    rewardSignal: PlannerRewardSignal;
  }> {
    const startedAt = nowIso();
    const primaryResult = await this.execution.execute({
      stage,
      decision: step.primary,
      planMetadata: metadata,
    });
    if (primaryResult.status === 'success') {
      const finishedAt = nowIso();
      const traceEntry: ExecutionTraceEntry = {
        stageId: stage.id,
        provider: step.primary.provider,
        status: 'success',
        startedAt,
        finishedAt,
        logs: primaryResult.logs,
      };
      const rewardSignal: PlannerRewardSignal = {
        stageId: stage.id,
        observedThroughput: primaryResult.throughputPerMinute,
        observedCost: primaryResult.cost,
        observedErrorRate: primaryResult.errorRate,
        recovered: false,
      };
      await this.auditSink.record({
        id: `${stage.id}:${Date.now()}:execution`,
        timestamp: finishedAt,
        category: 'execution',
        summary: `Stage ${stage.name} completed on ${step.primary.provider}`,
        data: { result: primaryResult, decision: step.primary },
      });
      return { traceEntry, rewardSignal };
    }

    if (!this.selfHealing.triggers.includes('execution-failure')) {
      const finishedAt = nowIso();
      const traceEntry: ExecutionTraceEntry = {
        stageId: stage.id,
        provider: step.primary.provider,
        status: 'failed',
        startedAt,
        finishedAt,
        logs: primaryResult.logs,
        fallbackTriggered: 'execution-failure',
      };
      const rewardSignal: PlannerRewardSignal = {
        stageId: stage.id,
        observedThroughput: primaryResult.throughputPerMinute,
        observedCost: primaryResult.cost,
        observedErrorRate: primaryResult.errorRate,
        recovered: false,
      };
      return { traceEntry, rewardSignal };
    }

    const fallbackResult = await this.invokeFallbacks(
      stage,
      step,
      metadata,
      primaryResult.logs,
      startedAt,
    );
    return fallbackResult;
  }

  private async invokeFallbacks(
    stage: PipelineStageDefinition,
    step: ExplainablePlanStep,
    metadata: Record<string, unknown>,
    accumulatedLogs: string[],
    initialStartedAt: string,
  ): Promise<{
    traceEntry: ExecutionTraceEntry;
    rewardSignal: PlannerRewardSignal;
  }> {
    const guardrail = stage.guardrail;
    let attempt = 0;
    const fallbacks: StageFallbackStrategy[] = stage.fallbackStrategies ?? [];
    let lastStartedAt = initialStartedAt;
    for (const fallbackDecision of step.fallbacks) {
      attempt += 1;
      if (attempt > this.selfHealing.maxRetries) {
        break;
      }
      const fallbackPolicy = fallbacks.find(
        (strategy) => strategy.provider === fallbackDecision.provider,
      );
      if (!fallbackPolicy) {
        continue;
      }
      if (!this.selfHealing.triggers.includes(fallbackPolicy.trigger)) {
        continue;
      }
      if (fallbackPolicy.trigger !== 'execution-failure') {
        continue;
      }
      if (!this.selfHealing.triggers.includes('execution-failure')) {
        continue;
      }
      await this.auditSink.record({
        id: `${stage.id}:${Date.now()}:fallback`,
        timestamp: nowIso(),
        category: 'fallback',
        summary: `Triggering fallback ${fallbackDecision.provider} for stage ${stage.name}`,
        data: { fallbackDecision, stage },
      });
      const fallbackStartedAt = nowIso();
      const result = await this.execution.execute({
        stage,
        decision: fallbackDecision,
        planMetadata: metadata,
      });
      lastStartedAt = fallbackStartedAt;
      if (result.status === 'success') {
        const finishedAt = nowIso();
        const traceEntry: ExecutionTraceEntry = {
          stageId: stage.id,
          provider: fallbackDecision.provider,
          status: 'recovered',
          startedAt: fallbackStartedAt,
          finishedAt,
          logs: [...accumulatedLogs, ...result.logs],
          fallbackTriggered: 'execution-failure',
        };
        const rewardSignal: PlannerRewardSignal = {
          stageId: stage.id,
          observedThroughput: result.throughputPerMinute,
          observedCost: result.cost,
          observedErrorRate: Math.min(
            result.errorRate,
            guardrail?.maxErrorRate ?? result.errorRate,
          ),
          recovered: true,
        };
        return { traceEntry, rewardSignal };
      }
      accumulatedLogs.push(...result.logs);
    }
    const finishedAt = nowIso();
    const traceEntry: ExecutionTraceEntry = {
      stageId: stage.id,
      provider: step.primary.provider,
      status: 'failed',
      startedAt: lastStartedAt,
      finishedAt,
      logs: accumulatedLogs,
      fallbackTriggered: 'execution-failure',
    };
    const rewardSignal: PlannerRewardSignal = {
      stageId: stage.id,
      observedThroughput: 0,
      observedCost: 0,
      observedErrorRate: guardrail?.maxErrorRate ?? 1,
      recovered: false,
    };
    return { traceEntry, rewardSignal };
  }

  deriveTelemetry(outcome: ExecutionOutcome): MetaOrchestratorTelemetry {
    const throughput = outcome.rewards.reduce(
      (acc, reward) => acc + reward.observedThroughput,
      0,
    );
    const cost = outcome.rewards.reduce(
      (acc, reward) => acc + reward.observedCost,
      0,
    );
    const successes = outcome.trace.filter(
      (entry) => entry.status === 'success' || entry.status === 'recovered',
    ).length;
    const auditCompleteness =
      outcome.trace.length > 0 ? successes / outcome.trace.length : 0;
    const selfHealing = outcome.trace.filter(
      (entry) => entry.status === 'recovered',
    ).length;
    const selfHealingRate =
      outcome.trace.length > 0 ? selfHealing / outcome.trace.length : 0;
    return {
      throughputPerMinute: throughput,
      costPerThroughputUnit: throughput === 0 ? cost : cost / throughput,
      auditCompleteness,
      selfHealingRate,
    };
  }
}

interface ReferenceStageOverlay {
  requiredCapabilities?: string[];
  complianceTags?: string[];
  minThroughputPerMinute: number;
  slaSeconds: number;
  guardrail?: StageExecutionGuardrail;
  fallbackStrategies?: StageFallbackStrategy[];
}

interface ReferenceWorkflowInput {
  pipeline: PipelineRecord;
  services: ServiceRecord[];
  environments: EnvironmentRecord[];
  incidents?: IncidentRecord[];
  policies?: PolicyRule[];
  costSignals?: CostSignalRecord[];
  stageOverlays: Record<string, ReferenceStageOverlay>;
  providers: CloudProviderDescriptor[];
  pricing: PricingSignal[];
  executionScripts: Record<string, StageExecutionResult | StageExecutionResult[]>;
  metadata?: Record<string, unknown>;
}

export interface ReferenceWorkflowResult {
  stages: PipelineStageDefinition[];
  graphSnapshot: GraphSnapshot;
  plan: ExplainablePlan;
  outcome: ExecutionOutcome;
  telemetry: MetaOrchestratorTelemetry;
  auditTrail: AuditEntry[];
}

class StaticPricingFeed implements PricingFeed {
  constructor(private signals: PricingSignal[]) {}

  async getPricingSignals(): Promise<PricingSignal[]> {
    return this.signals;
  }
}

class ReferenceExecutionAdapter implements ExecutionAdapter {
  private readonly script = new Map<string, StageExecutionResult[]>();

  constructor(scenarios: Record<string, StageExecutionResult | StageExecutionResult[]>) {
    for (const [provider, result] of Object.entries(scenarios)) {
      const values = Array.isArray(result) ? [...result] : [result];
      this.script.set(provider, values);
    }
  }

  async execute(request: StageExecutionRequest): Promise<StageExecutionResult> {
    const planned = this.script.get(request.decision.provider);
    if (!planned || planned.length === 0) {
      return {
        status: 'success',
        throughputPerMinute: Math.max(request.stage.minThroughputPerMinute, 1),
        cost: request.decision.expectedCost,
        errorRate: 0.01,
        logs: ['reference-default-success'],
      } satisfies StageExecutionResult;
    }
    const [result, ...remaining] = planned;
    this.script.set(request.decision.provider, remaining);
    return result;
  }
}

function stageDefinitionsFromGraph(
  snapshot: GraphSnapshot,
  overlays: Record<string, ReferenceStageOverlay>,
): PipelineStageDefinition[] {
  return snapshot.nodes
    .filter((node) => node.type === 'stage')
    .map((node) => {
      const stage = node.data as PipelineStageRecord;
      const overlay = overlays[stage.id];
      if (!overlay) {
        throw new Error(`Missing overlay for stage ${stage.id}`);
      }
      return {
        id: stage.id,
        name: stage.name,
        requiredCapabilities: overlay.requiredCapabilities ?? [stage.capability],
        complianceTags: overlay.complianceTags ?? stage.complianceTags ?? [],
        minThroughputPerMinute: overlay.minThroughputPerMinute,
        slaSeconds: overlay.slaSeconds,
        guardrail: overlay.guardrail,
        fallbackStrategies: overlay.fallbackStrategies,
      } satisfies PipelineStageDefinition;
    });
}

async function runReferenceWorkflow(
  input: ReferenceWorkflowInput,
): Promise<ReferenceWorkflowResult> {
  const graph = new OrchestrationKnowledgeGraph();
  graph.registerPipelineConnector({
    loadPipelines: async () => [input.pipeline],
  });
  graph.registerServiceConnector({
    loadServices: async () => input.services,
  });
  graph.registerEnvironmentConnector({
    loadEnvironments: async () => input.environments,
  });
  if (input.incidents?.length) {
    graph.registerIncidentConnector({
      loadIncidents: async () => input.incidents ?? [],
    });
  }
  if (input.policies?.length) {
    graph.registerPolicyConnector({
      loadPolicies: async () => input.policies ?? [],
    });
  }
  if (input.costSignals?.length) {
    graph.registerCostSignalConnector({
      loadCostSignals: async () => input.costSignals ?? [],
    });
  }
  const graphSnapshot = await graph.refresh();

  const auditTrail: AuditEntry[] = [];
  const orchestrator = new MetaOrchestrator({
    pipelineId: input.pipeline.id,
    providers: input.providers,
    pricingFeed: new StaticPricingFeed(input.pricing),
    execution: new ReferenceExecutionAdapter(input.executionScripts),
    auditSink: {
      record: (entry) => {
        auditTrail.push(entry);
      },
    },
    reasoningModel: new TemplateReasoningModel(),
  });

  const stages = stageDefinitionsFromGraph(graphSnapshot, input.stageOverlays);
  const outcome = await orchestrator.executePlan(stages, input.metadata ?? {});
  const telemetry = orchestrator.deriveTelemetry(outcome);

  return {
    stages,
    graphSnapshot,
    plan: outcome.plan,
    outcome,
    telemetry,
    auditTrail,
  };
}

export async function runHelloWorldWorkflow(): Promise<ReferenceWorkflowResult> {
  const pipeline: PipelineRecord = {
    id: 'hello-world-pipeline',
    name: 'Hello World Reference Pipeline',
    stages: [
      {
        id: 'hello-world-stage',
        name: 'Hello World Build',
        pipelineId: 'hello-world-pipeline',
        serviceId: 'service-hello-world',
        environmentId: 'env-ref-dev',
        capability: 'compute',
        complianceTags: ['fedramp'],
      },
    ],
  };

  return runReferenceWorkflow({
    pipeline,
    services: [
      {
        id: 'service-hello-world',
        name: 'Hello World API',
        owningTeam: 'demo',
        tier: 'tier-1',
        dependencies: ['service-hello-world-db'],
      },
      {
        id: 'service-hello-world-db',
        name: 'Hello World DB',
        tier: 'tier-2',
      },
    ],
    environments: [
      {
        id: 'env-ref-dev',
        name: 'Reference Dev',
        stage: 'dev',
        region: 'us-east-1',
        deploymentMechanism: 'containers',
        complianceTags: ['fedramp'],
      },
    ],
    policies: [
      {
        id: 'policy-ref-fedramp',
        description: 'Reference FedRAMP policy',
        effect: 'allow',
        actions: ['deploy'],
        resources: ['service:service-hello-world'],
        conditions: [],
        obligations: [],
        tags: ['reference'],
      },
    ],
    stageOverlays: {
      'hello-world-stage': {
        requiredCapabilities: ['compute'],
        complianceTags: ['fedramp'],
        minThroughputPerMinute: 90,
        slaSeconds: 900,
        guardrail: { maxErrorRate: 0.05, recoveryTimeoutSeconds: 120 },
      },
    },
    providers: [
      {
        name: 'azure',
        regions: ['eastus'],
        services: ['compute', 'ml'],
        reliabilityScore: 0.96,
        sustainabilityScore: 0.62,
        securityCertifications: ['fedramp'],
        maxThroughputPerMinute: 150,
        baseLatencyMs: 65,
        policyTags: ['fedramp'],
      },
      {
        name: 'aws',
        regions: ['us-east-1'],
        services: ['compute', 'ml'],
        reliabilityScore: 0.94,
        sustainabilityScore: 0.55,
        securityCertifications: ['fedramp'],
        maxThroughputPerMinute: 140,
        baseLatencyMs: 70,
        policyTags: ['fedramp'],
      },
    ],
    pricing: [
      {
        provider: 'azure',
        region: 'eastus',
        service: 'compute',
        pricePerUnit: 0.8,
        currency: 'USD',
        unit: 'per-minute',
        effectiveAt: new Date().toISOString(),
      },
      {
        provider: 'aws',
        region: 'us-east-1',
        service: 'compute',
        pricePerUnit: 1.1,
        currency: 'USD',
        unit: 'per-minute',
        effectiveAt: new Date().toISOString(),
      },
    ],
    executionScripts: {
      azure: {
        status: 'success',
        throughputPerMinute: 120,
        cost: 96,
        errorRate: 0.01,
        logs: ['hello-world-primary'],
      },
    },
    metadata: { release: 'hello-world' },
  });
}

export async function runHelloCaseWorkflow(): Promise<ReferenceWorkflowResult> {
  const pipeline: PipelineRecord = {
    id: 'hello-case-pipeline',
    name: 'Hello Case Reference Pipeline',
    stages: [
      {
        id: 'hello-case-triage',
        name: 'Hello Case Triage',
        pipelineId: 'hello-case-pipeline',
        serviceId: 'service-hello-case',
        environmentId: 'env-ref-staging',
        capability: 'ml',
        complianceTags: ['hipaa', 'pci'],
      },
    ],
  };

  return runReferenceWorkflow({
    pipeline,
    services: [
      {
        id: 'service-hello-case',
        name: 'Hello Case API',
        tier: 'tier-0',
        dependencies: ['service-hello-world'],
        soxCritical: true,
      },
    ],
    environments: [
      {
        id: 'env-ref-staging',
        name: 'Reference Staging',
        stage: 'staging',
        region: 'us-west-2',
        zeroTrustTier: 2,
        complianceTags: ['hipaa', 'pci'],
      },
    ],
    incidents: [
      {
        id: 'case-incident-1',
        serviceId: 'service-hello-case',
        environmentId: 'env-ref-staging',
        severity: 'high',
        occurredAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        status: 'open',
        rootCauseCategory: 'dependency',
      },
    ],
    policies: [
      {
        id: 'policy-hello-case',
        description: 'Hello Case compliance envelope',
        effect: 'allow',
        actions: ['deploy', 'execute'],
        resources: ['service:service-hello-case'],
        conditions: [],
        obligations: [],
        tags: ['high-risk'],
      },
    ],
    costSignals: [
      {
        serviceId: 'service-hello-case',
        timeBucket: new Date().toISOString().slice(0, 13),
        saturation: 0.8,
        budgetBreaches: 1,
        throttleCount: 1,
        slowQueryCount: 2,
      },
    ],
    stageOverlays: {
      'hello-case-triage': {
        requiredCapabilities: ['ml'],
        complianceTags: ['hipaa', 'pci'],
        minThroughputPerMinute: 140,
        slaSeconds: 600,
        guardrail: { maxErrorRate: 0.05, recoveryTimeoutSeconds: 60 },
        fallbackStrategies: [
          { provider: 'aws', region: 'us-west-2', trigger: 'execution-failure' },
        ],
      },
    },
    providers: [
      {
        name: 'azure',
        regions: ['eastus'],
        services: ['compute', 'ml'],
        reliabilityScore: 0.93,
        sustainabilityScore: 0.7,
        securityCertifications: ['fedramp', 'hipaa', 'pci'],
        maxThroughputPerMinute: 110,
        baseLatencyMs: 60,
        policyTags: ['hipaa', 'pci'],
      },
      {
        name: 'aws',
        regions: ['us-west-2'],
        services: ['compute', 'ml'],
        reliabilityScore: 0.97,
        sustainabilityScore: 0.6,
        securityCertifications: ['fedramp', 'hipaa', 'pci'],
        maxThroughputPerMinute: 150,
        baseLatencyMs: 72,
        policyTags: ['hipaa', 'pci'],
      },
    ],
    pricing: [
      {
        provider: 'azure',
        region: 'eastus',
        service: 'ml',
        pricePerUnit: 0.9,
        currency: 'USD',
        unit: 'per-minute',
        effectiveAt: new Date().toISOString(),
      },
      {
        provider: 'aws',
        region: 'us-west-2',
        service: 'ml',
        pricePerUnit: 1.05,
        currency: 'USD',
        unit: 'per-minute',
        effectiveAt: new Date().toISOString(),
      },
    ],
    executionScripts: {
      azure: [
        {
          status: 'failure',
          throughputPerMinute: 80,
          cost: 140,
          errorRate: 0.18,
          logs: ['hello-case-primary-failure'],
        },
      ],
      aws: [
        {
          status: 'success',
          throughputPerMinute: 165,
          cost: 125,
          errorRate: 0.01,
          logs: ['hello-case-fallback-success'],
        },
      ],
    },
    metadata: { caseId: 'HELLO-CASE-001' },
  });
}

export type {
  AuditEntry,
  AuditSink,
  CloudProviderDescriptor,
  ExecutionAdapter,
  ExecutionOutcome,
  ExecutionTraceEntry,
  ExplainablePlan,
  ExplainablePlanStep,
  FallbackTrigger,
  MetaOrchestratorTelemetry,
  PipelineStageDefinition,
  PricingFeed,
  PlannerDecision,
  PlannerExplanation,
  PlannerObservation,
  PlannerRewardSignal,
  PlannerRewardWeights,
  PricingSignal,
  ReasoningInput,
  ReasoningModel,
  StageExecutionRequest,
  StageExecutionResult,
};

export {
  ContextAwareDecomposer,
  type ContextAwareDecompositionOptions,
  type ContextSegment,
  type DecomposedContext,
  type SalientSegment
} from './prompt/contextDecomposer.js';
export { CollaborativeContextBroker, type AgentAssignment, type BrokerOptions, type ContextDiff, type ContextState } from './prompt/collaboration.js';
export {
  HierarchicalSummarizer,
  type HierarchicalSummarizerOptions,
  type HierarchicalSummaryResult,
  type SummarizationLayer
} from './prompt/summarizer.js';
export {
  MetaPromptPlanner,
  type PlannedPrompt,
  type PlannerFeedback,
  type PlannerOptions,
  type PromptModule,
  type PromptModuleContext
} from './prompt/planner.js';
export {
  RecursiveSelfImprovementEngine,
  type QualityAspect,
  type RSIPIterationLog,
  type RSIPOptions,
  type RSIPRunResult
} from './prompt/rsip.js';
export {
  SelfConsensusEngine,
  type CandidateGenerationOptions,
  type ConsensusCluster,
  type ConsensusResult
} from './prompt/consensus.js';
export {
  TokenAwareRetriever,
  type RetrievedContext,
  type RetrievableDocument,
  type TokenAwareRetrievalOptions,
  type RetrievedDocument
} from './prompt/retriever.js';
export { type SimilarityFunction } from './prompt/types.js';
export { clampValue, cosineSimilarity, defaultTokenEstimator, type TokenEstimator } from './prompt/utils.js';
export { PromptEngineeringToolkit, type PromptEngineeringToolkitOptions, type PromptOptimizationInput, type PromptOptimizationReport } from './prompt/toolkit.js';
export {
  GenerativeActionTranslator,
  type ActionPlan,
  type ActionStep,
  type GenerativeActionTranslatorOptions,
  type OrchestrationIntent,
} from './gen-actions/intentTranslator.js';
