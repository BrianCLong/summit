"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRUST_SAFETY_DEFAULTS = exports.TrustSafetyOrchestrator = exports.MetaContextOrchestrator = exports.GenerativeActionTranslator = exports.PromptEngineeringToolkit = exports.defaultTokenEstimator = exports.cosineSimilarity = exports.clampValue = exports.TokenAwareRetriever = exports.SelfConsensusEngine = exports.AutonomousEvolutionOrchestrator = exports.RecursiveSelfImprovementEngine = exports.MetaPromptPlanner = exports.HierarchicalSummarizer = exports.CollaborativeWorkspace = exports.CollaborativeContextBroker = exports.ContextAwareDecomposer = exports.MetaOrchestrator = exports.HybridSymbolicLLMPlanner = exports.TemplateReasoningModel = void 0;
exports.runHelloWorldWorkflow = runHelloWorldWorkflow;
exports.runHelloCaseWorkflow = runHelloCaseWorkflow;
exports.runPaymentsAndCreditWorkflow = runPaymentsAndCreditWorkflow;
const common_types_1 = require("@ga-graphai/common-types");
const common_types_2 = require("@ga-graphai/common-types");
const knowledge_graph_1 = require("@ga-graphai/knowledge-graph");
const DEFAULT_WEIGHTS = {
    cost: 0.25,
    throughput: 0.25,
    reliability: 0.25,
    compliance: 0.2,
    sustainability: 0.05,
};
const DEFAULT_RESILIENCE = {
    maxRetries: 2,
    backoffMs: 150,
    timeoutMs: 10000,
    circuitBreaker: {
        failureThreshold: 3,
        cooldownMs: 30000,
    },
};
const DEFAULT_FEATURE_FLAGS = {
    gracefulDegradation: true,
    enableCircuitBreaker: true,
    deterministicLogging: true,
};
const DEFAULT_SELF_HEALING = {
    maxRetries: 2,
    backoffSeconds: 5,
    triggers: ['execution-failure', 'latency-breach', 'cost-spike'],
};
function createSeededRandom(seed) {
    let state = seed + 0x6d2b79f5;
    return () => {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function mergeResilience(base, overrides) {
    return {
        maxRetries: overrides.maxRetries ?? base.maxRetries,
        backoffMs: overrides.backoffMs ?? base.backoffMs,
        timeoutMs: overrides.timeoutMs ?? base.timeoutMs,
        circuitBreaker: {
            failureThreshold: overrides.circuitBreaker?.failureThreshold ??
                base.circuitBreaker.failureThreshold,
            cooldownMs: overrides.circuitBreaker?.cooldownMs ?? base.circuitBreaker.cooldownMs,
        },
    };
}
function nowIso() {
    return new Date().toISOString();
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function normalize(values) {
    if (values.length === 0) {
        return values;
    }
    const max = Math.max(...values);
    if (max === 0) {
        return values.map(() => 0);
    }
    return values.map((value) => value / max);
}
function matchPricing(pricing, provider, region, capability) {
    return pricing.find((signal) => signal.provider === provider &&
        signal.region === region &&
        signal.service === capability);
}
function complianceScore(provider, stage) {
    if (!stage.complianceTags.length) {
        return 1;
    }
    const providerTags = new Set(provider.policyTags ?? []);
    const satisfied = stage.complianceTags.filter((tag) => providerTags.has(tag));
    return satisfied.length / stage.complianceTags.length;
}
class TemplateReasoningModel {
    generateNarrative(input) {
        const fallbackNames = input.fallbacks.map((fallback) => `${fallback.provider}/${fallback.region}`);
        const fallbackText = fallbackNames.length > 0 ? fallbackNames.join(', ') : 'none required';
        const dominantFactor = Object.entries(input.breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ??
            'balanced';
        return [
            `Selected ${input.primary.provider}/${input.primary.region} for stage ${input.stage.name}.`,
            `Dominant factor: ${dominantFactor}.`,
            `Fallback path: ${fallbackText}.`,
        ].join(' ');
    }
}
exports.TemplateReasoningModel = TemplateReasoningModel;
class CapabilityMatrixEvaluator {
    matrix;
    constructor(matrix) {
        this.matrix = matrix;
    }
    score(capability, provider, region) {
        if (!this.matrix) {
            return null;
        }
        const candidates = this.matrix.entries.filter((entry) => entry.capability === capability);
        if (candidates.length === 0) {
            return null;
        }
        const matched = candidates.find((entry) => entry.provider === provider && entry.region === region) ?? candidates.find((entry) => entry.provider === provider) ?? candidates[0];
        const throughputMax = Math.max(...candidates.map((entry) => entry.throughputPerMinute));
        const latencyMin = Math.min(...candidates.map((entry) => entry.latencyMs));
        const costMin = Math.min(...candidates.map((entry) => entry.costPerUnit));
        const performance = throughputMax === 0 ? 0 : matched.throughputPerMinute / throughputMax;
        const latency = matched.latencyMs === 0 ? 1 : clamp(latencyMin / matched.latencyMs, 0, 1);
        const cost = matched.costPerUnit === 0 ? 1 : clamp(costMin / matched.costPerUnit, 0, 1);
        const composite = (performance + latency + cost) / 3;
        return {
            provider: matched.provider,
            region: matched.region,
            capability: matched.capability,
            performance,
            latency,
            cost,
            composite,
            rationale: [
                `throughput=${matched.throughputPerMinute} (normalized ${performance.toFixed(2)})`,
                `latency=${matched.latencyMs}ms (normalized ${latency.toFixed(2)})`,
                `cost=${matched.costPerUnit} (normalized ${cost.toFixed(2)})`,
            ],
        };
    }
}
class DecisionTreePolicyEngine {
    policies;
    constructor(policies) {
        this.policies = policies;
    }
    evaluate(context) {
        const matches = this.policies
            .filter((policy) => policy.dataTypes.includes(context.dataType) || policy.dataTypes.includes('*'))
            .filter((policy) => policy.urgencies.includes(context.urgency))
            .filter((policy) => policy.costSensitivity === context.costSensitivity);
        if (matches.length === 0) {
            return null;
        }
        const preferred = matches[0];
        const module = preferred.preferredModules[0];
        const reason = preferred.rationale ?? 'policy matched on data profile';
        return {
            module,
            reason,
            policyId: preferred.id,
            confidence: 0.75 + preferred.preferredModules.length * 0.02,
        };
    }
}
class FairnessMonitor {
    counts = new Map();
    policy;
    constructor(policy) {
        this.policy = policy;
    }
    record(provider) {
        const current = this.counts.get(provider) ?? 0;
        this.counts.set(provider, current + 1);
    }
    metrics(totalStages) {
        const diversity = this.counts.size === 0 || totalStages === 0
            ? 0
            : this.counts.size / totalStages;
        const maxShare = Math.max(...Array.from(this.counts.values()), 0);
        const dominanceRatio = totalStages === 0 ? 0 : maxShare / totalStages;
        const required = this.policy?.minDiversityRatio ?? 0;
        return {
            diversity,
            dominanceRatio,
            compliant: diversity >= required,
        };
    }
    applyMitigations(score, provider) {
        if (!this.policy || !this.policy.mitigations) {
            return score;
        }
        let adjusted = score;
        for (const mitigation of this.policy.mitigations) {
            if (mitigation.signal === 'diversity' && (this.counts.get(provider) ?? 0) > 0) {
                adjusted *= 0.98;
            }
            if (mitigation.signal === 'cost' && mitigation.correctiveAction === 'penalize') {
                adjusted *= 0.99;
            }
        }
        return adjusted;
    }
}
class GovernanceTrail {
    events = [];
    record(event) {
        const normalized = {
            ...event,
            id: event.id ?? randomUUID(),
            timestamp: event.timestamp ?? nowIso(),
        };
        this.events.push(normalized);
        return normalized;
    }
    flush() {
        return [...this.events];
    }
}
class SessionArchiver {
    persist;
    constructor(persist) {
        this.persist = persist ?? common_types_2.persistReplayDescriptor;
    }
    async archive(options) {
        const environment = (0, common_types_2.buildReplayEnvironment)();
        const descriptor = (0, common_types_2.createReplayDescriptor)({
            service: 'maestro-conductor',
            flow: 'meta-orchestrator',
            request: {
                path: 'meta-orchestrator',
                method: 'EXECUTE',
                metadata: (0, common_types_2.sanitizePayload)({ plan: options.plan, outcome: options.outcome }),
            },
            environment,
            classification: 'meta-routing',
        });
        const archive = {
            id: descriptor.id,
            createdAt: descriptor.createdAt,
            owner: options.owner,
            scope: options.scope,
            labels: options.labels,
            checksum: descriptor.checksum,
        };
        await this.persist(descriptor);
        return archive;
    }
}
class PluginManager {
    plugins;
    constructor(plugins) {
        this.plugins = plugins;
    }
    async run(hook, context) {
        for (const plugin of this.plugins) {
            const candidate = plugin[hook];
            if (typeof candidate === 'function') {
                await candidate(context);
            }
        }
    }
}
class ActiveRewardShaper {
    weights;
    constructor(initial) {
        this.weights = { ...initial };
    }
    getWeights() {
        return { ...this.weights };
    }
    update(signals, stages) {
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
                this.weights.reliability = clamp(this.weights.reliability + 0.05, 0.1, 0.6);
            }
            if (signal.observedThroughput < stage.minThroughputPerMinute) {
                this.weights.throughput = clamp(this.weights.throughput + 0.05, 0.1, 0.6);
            }
            if (signal.observedCost > 0) {
                const unitCost = signal.observedCost / Math.max(signal.observedThroughput, 1);
                if (unitCost > 1) {
                    this.weights.cost = clamp(this.weights.cost + 0.05, 0.1, 0.6);
                }
            }
            if (signal.recovered) {
                this.weights.reliability = clamp(this.weights.reliability + 0.02, 0.1, 0.6);
            }
        }
        return this.getWeights();
    }
}
class HybridSymbolicLLMPlanner {
    providers;
    reasoningModel;
    capabilityEvaluator;
    decisionEngine;
    fairnessMonitor;
    governance;
    constructor(providers, options) {
        this.providers = providers;
        this.reasoningModel = options?.reasoningModel ?? new TemplateReasoningModel();
        this.capabilityEvaluator = options?.capabilityEvaluator;
        this.decisionEngine = options?.decisionEngine;
        this.fairnessMonitor = options?.fairnessMonitor;
        this.governance = options?.governance;
    }
    async plan(pipelineId, stages, observation, weights) {
        const steps = [];
        for (const stage of stages) {
            const policyDecision = this.decisionEngine?.evaluate({
                dataType: stage.dataType ?? 'generic',
                urgency: stage.urgency ?? 'medium',
                costSensitivity: stage.costSensitivity ?? 'medium',
                capability: stage.requiredCapabilities[0],
            });
            const candidates = this.scoreCandidates(stage, observation.pricing, weights, policyDecision ?? undefined);
            if (candidates.length === 0) {
                throw new Error(`no feasible providers for stage ${stage.id}`);
            }
            const [primary, ...fallbacks] = candidates.sort((a, b) => b.score - a.score);
            const explanation = await this.buildExplanation(stage, primary, fallbacks, policyDecision ?? undefined);
            this.fairnessMonitor?.record(primary.decision.provider);
            if (policyDecision) {
                this.governance?.record({
                    kind: 'selection',
                    summary: `Applied decision-tree policy ${policyDecision.policyId}`,
                    details: {
                        stageId: stage.id,
                        provider: primary.decision.provider,
                        policy: policyDecision,
                    },
                });
            }
            if (primary.capabilityScore) {
                this.governance?.record({
                    kind: 'explanation',
                    summary: 'Capability matrix influenced selection',
                    details: {
                        stageId: stage.id,
                        capability: primary.capabilityScore.capability,
                        provider: primary.capabilityScore.provider,
                        rationale: primary.capabilityScore.rationale,
                    },
                });
            }
            steps.push({
                stageId: stage.id,
                primary: primary.decision,
                fallbacks: fallbacks.slice(0, 2).map((fallback) => fallback.decision),
                explanation,
            });
        }
        const aggregateScore = steps.reduce((acc, step) => acc + (step.explanation.scoreBreakdown.aggregate ?? 0), 0);
        return {
            pipelineId,
            generatedAt: nowIso(),
            steps,
            aggregateScore,
            metadata: { weights },
        };
    }
    scoreCandidates(stage, pricing, weights, policyDecision) {
        const capabilities = stage.requiredCapabilities;
        const normalizedThroughput = normalize(this.providers.map((provider) => provider.maxThroughputPerMinute));
        const normalizedReliability = normalize(this.providers.map((provider) => provider.reliabilityScore));
        return this.providers.flatMap((provider, index) => {
            if (!capabilities.every((capability) => provider.services.includes(capability))) {
                return [];
            }
            const region = provider.regions[0];
            const capability = capabilities[0];
            const priceSignal = matchPricing(pricing, provider.name, region, capability);
            const price = priceSignal?.pricePerUnit ?? 1.5;
            const compliance = complianceScore(provider, stage);
            if (compliance === 0) {
                return [];
            }
            const throughputScore = normalizedThroughput[index] || 0;
            const reliabilityScore = normalizedReliability[index] || 0;
            const costScore = price === 0 ? 1 : clamp(1 / price, 0, 1);
            const sustainabilityScore = provider.sustainabilityScore ?? 0.5;
            const breakdown = {
                throughput: throughputScore,
                reliability: reliabilityScore,
                cost: costScore,
                compliance,
                sustainability: sustainabilityScore,
            };
            let aggregate = weights.throughput * throughputScore +
                weights.reliability * reliabilityScore +
                weights.cost * costScore +
                weights.compliance * compliance +
                (weights.sustainability ?? 0) * sustainabilityScore;
            const capabilityScore = this.capabilityEvaluator?.score(capability, provider.name, region);
            if (capabilityScore) {
                breakdown.capabilityMatrix = capabilityScore.composite;
                aggregate = aggregate * 0.7 + capabilityScore.composite * 0.3;
            }
            if (policyDecision && policyDecision.module === provider.name) {
                breakdown.policy = policyDecision.confidence;
                aggregate += 0.05;
            }
            aggregate = this.fairnessMonitor?.applyMitigations(aggregate, provider.name) ?? aggregate;
            const decision = {
                provider: provider.name,
                region,
                expectedCost: price * stage.minThroughputPerMinute,
                expectedThroughput: Math.min(provider.maxThroughputPerMinute, stage.minThroughputPerMinute),
                expectedLatency: provider.baseLatencyMs,
            };
            return [
                {
                    provider,
                    region,
                    capability,
                    score: aggregate,
                    breakdown: { ...breakdown, aggregate },
                    capabilityScore,
                    policy: policyDecision,
                    decision,
                },
            ];
        });
    }
    async buildExplanation(stage, primary, fallbacks, policyDecision) {
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
            constraints.push(`error rate <= ${stage.guardrail.maxErrorRate} with recovery ${stage.guardrail.recoveryTimeoutSeconds}s`);
        }
        if (primary.capabilityScore) {
            constraints.push(`capability matrix composite ${(primary.capabilityScore.composite * 100).toFixed(1)}%`);
        }
        if (policyDecision) {
            constraints.push(`policy ${policyDecision.policyId}: ${policyDecision.reason}`);
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
exports.HybridSymbolicLLMPlanner = HybridSymbolicLLMPlanner;
class MetaOrchestrator {
    pipelineId;
    pricingFeed;
    execution;
    auditSink;
    planner;
    rewardShaper;
    selfHealing;
    events;
    capabilityEvaluator;
    decisionEngine;
    fairnessMonitor;
    governance;
    pluginManager;
    sessionArchiver;
    archiveOwner;
    archiveScope;
    sessionArchiveLabels;
    resilience;
    featureFlags;
    circuitStates = new Map();
    mode;
    deterministicSeed;
    random;
    constructor(options) {
        this.pipelineId = options.pipelineId;
        this.pricingFeed = options.pricingFeed;
        this.execution = options.execution;
        this.auditSink = options.auditSink;
        this.capabilityEvaluator = new CapabilityMatrixEvaluator(options.capabilityMatrix);
        this.decisionEngine = new DecisionTreePolicyEngine(options.decisionPolicies ?? []);
        this.fairnessMonitor = new FairnessMonitor(options.fairness);
        this.governance = new GovernanceTrail();
        this.pluginManager = new PluginManager(options.plugins ?? []);
        this.sessionArchiver = options.sessionArchive
            ? new SessionArchiver(options.sessionArchive.persist)
            : undefined;
        this.archiveOwner = options.sessionArchive?.owner ?? 'maestro';
        this.archiveScope = options.sessionArchive?.scope ?? options.pipelineId;
        this.sessionArchiveLabels = options.sessionArchive?.labels;
        this.planner = new HybridSymbolicLLMPlanner(options.providers, {
            reasoningModel: options.reasoningModel,
            capabilityEvaluator: this.capabilityEvaluator,
            decisionEngine: this.decisionEngine,
            fairnessMonitor: this.fairnessMonitor,
            governance: this.governance,
        });
        this.rewardShaper = new ActiveRewardShaper(options.rewardWeights ?? DEFAULT_WEIGHTS);
        this.selfHealing = options.selfHealing ?? DEFAULT_SELF_HEALING;
        this.events = options.events ?? new common_types_1.StructuredEventEmitter();
        this.resilience = mergeResilience(DEFAULT_RESILIENCE, options.resilience ?? {});
        this.featureFlags = {
            ...DEFAULT_FEATURE_FLAGS,
            ...(options.featureFlags ?? {}),
        };
        this.mode = options.mode ?? 'production';
        this.deterministicSeed =
            this.mode === 'deterministic'
                ? options.deterministicSeed ?? Date.now()
                : undefined;
        this.random =
            this.mode === 'deterministic'
                ? createSeededRandom(this.deterministicSeed ?? Date.now())
                : Math.random;
    }
    async createPlan(stages, observation) {
        const pricing = observation?.pricing ?? (await this.pricingFeed.getPricingSignals());
        const rewardSignals = observation?.rewards ?? [];
        const weights = this.rewardShaper.update(rewardSignals, stages);
        await this.pluginManager.run('beforePlan', {
            pipelineId: this.pipelineId,
            metadata: { stages },
        });
        const plan = await this.planner.plan(this.pipelineId, stages, { pricing, rewards: rewardSignals }, weights);
        plan.metadata.executionMode = this.mode;
        if (this.deterministicSeed !== undefined) {
            plan.metadata.deterministicSeed = this.deterministicSeed;
        }
        const fairness = this.fairnessMonitor.metrics(plan.steps.length);
        plan.metadata.fairness = fairness;
        plan.metadata.governance = this.governance.flush();
        await this.auditSink.record({
            id: `${this.pipelineId}:${Date.now()}:plan`,
            timestamp: nowIso(),
            category: 'plan',
            summary: 'Hybrid planner generated explainable plan',
            data: { plan, fairness },
        });
        this.governance.record({
            kind: 'fairness',
            summary: 'Recorded fairness snapshot for plan',
            details: fairness,
        });
        await this.pluginManager.run('afterPlan', {
            pipelineId: this.pipelineId,
            plan,
            metadata: { fairness },
        });
        return plan;
    }
    async executePlan(stages, planMetadata = {}) {
        const startedAt = Date.now();
        const correlationId = planMetadata.correlationId;
        const traceId = planMetadata.traceId;
        let runId;
        try {
            const plan = await this.createPlan(stages);
            runId = planMetadata.runId ??
                (0, common_types_1.buildRunId)(plan, `${startedAt}`);
            const outcomeSummary = this.events.summarizeOutcome({
                plan,
                trace: [],
                rewards: [],
            });
            this.events.emitEvent('summit.maestro.run.created', {
                runId,
                pipelineId: this.pipelineId,
                stageIds: outcomeSummary.stageIds,
                metadata: plan.metadata,
            }, { correlationId, traceId });
            this.events.emitEvent('summit.maestro.run.started', {
                runId,
                pipelineId: this.pipelineId,
                stageCount: plan.steps.length,
                planScore: plan.aggregateScore,
            }, { correlationId, traceId });
            const trace = [];
            const rewards = [];
            for (const step of plan.steps) {
                const stage = stages.find((candidate) => candidate.id === step.stageId);
                if (!stage) {
                    throw new Error(`unknown stage ${step.stageId}`);
                }
                await this.pluginManager.run('beforeStage', {
                    pipelineId: this.pipelineId,
                    stage,
                    plan,
                    metadata: planMetadata,
                });
                const executionResult = await this.runStage(stage, step, planMetadata);
                trace.push(executionResult.traceEntry);
                rewards.push(executionResult.rewardSignal);
                await this.pluginManager.run('afterStage', {
                    pipelineId: this.pipelineId,
                    stage,
                    plan,
                    metadata: { traceEntry: executionResult.traceEntry },
                });
            }
            const updatedWeights = this.rewardShaper.update(rewards, stages);
            await this.auditSink.record({
                id: `${this.pipelineId}:${Date.now()}:reward`,
                timestamp: nowIso(),
                category: 'reward-update',
                summary: 'Updated reward weights after execution',
                data: { rewards, weights: updatedWeights },
            });
            const durationMs = Date.now() - startedAt;
            const outcome = { plan, trace, rewards };
            const { successCount, recoveredCount } = this.events.summarizeOutcome(outcome);
            const hasFailures = trace.some((entry) => entry.status === 'failed');
            if (hasFailures) {
                const failedStage = trace.find((entry) => entry.status === 'failed');
                this.events.emitEvent('summit.maestro.run.failed', {
                    runId,
                    pipelineId: this.pipelineId,
                    reason: 'one or more stages failed',
                    failedStageId: failedStage?.stageId,
                }, { correlationId, traceId });
            }
            this.events.emitEvent('summit.maestro.run.completed', {
                runId,
                pipelineId: this.pipelineId,
                status: hasFailures ? 'degraded' : 'success',
                traceLength: trace.length,
                successCount,
                recoveredCount,
                durationMs,
            }, { correlationId, traceId });
            if (this.sessionArchiver) {
                const archive = await this.sessionArchiver.archive({
                    plan,
                    outcome,
                    owner: this.archiveOwner ?? 'maestro',
                    scope: this.archiveScope ?? this.pipelineId,
                    labels: this.sessionArchiveLabels,
                });
                this.governance.record({
                    kind: 'archive',
                    summary: 'Archived orchestrator session for replay',
                    details: archive,
                });
            }
            await this.pluginManager.run('afterExecution', {
                pipelineId: this.pipelineId,
                plan,
                outcome,
                metadata: planMetadata,
            });
            await this.auditSink.record({
                id: `${this.pipelineId}:${Date.now()}:governance`,
                timestamp: nowIso(),
                category: 'plan',
                summary: 'Governance snapshot recorded',
                data: { events: this.governance.flush() },
            });
            return outcome;
        }
        catch (error) {
            this.events.emitEvent('summit.maestro.run.failed', {
                runId: runId ?? `${this.pipelineId}:${startedAt}`,
                pipelineId: this.pipelineId,
                reason: error instanceof Error ? error.message : 'unknown error',
                fatal: true,
            }, { correlationId, traceId });
            throw error;
        }
    }
    backoffForAttempt(attempt) {
        const jitter = this.random() * this.resilience.backoffMs;
        return this.resilience.backoffMs * attempt + jitter;
    }
    async sleep(delayMs) {
        await new Promise((resolve) => {
            setTimeout(resolve, delayMs);
        });
    }
    async executeWithResilience(stage, decision, metadata) {
        const circuitKey = `${stage.id}:${decision.provider}`;
        const existing = this.circuitStates.get(circuitKey) ?? { failures: 0 };
        const now = Date.now();
        const circuitCoolingDown = existing.openedAt &&
            now - existing.openedAt < this.resilience.circuitBreaker.cooldownMs;
        if (this.featureFlags.enableCircuitBreaker && circuitCoolingDown) {
            return {
                status: this.featureFlags.gracefulDegradation ? 'success' : 'failure',
                throughputPerMinute: this.featureFlags.gracefulDegradation
                    ? Math.max(1, stage.minThroughputPerMinute * 0.1)
                    : 0,
                cost: 0,
                errorRate: 1,
                logs: [`circuit open for ${circuitKey}`],
                degraded: this.featureFlags.gracefulDegradation,
                attempts: 0,
                featureFlags: ['circuit-breaker'],
            };
        }
        if (existing.openedAt &&
            now - existing.openedAt >= this.resilience.circuitBreaker.cooldownMs) {
            existing.failures = 0;
            existing.openedAt = undefined;
        }
        let attempts = 0;
        let lastLogs = [];
        let lastError;
        let timedOut = false;
        while (attempts <= this.resilience.maxRetries) {
            attempts += 1;
            let timeoutHandle;
            try {
                const result = await Promise.race([
                    this.execution.execute({
                        stage,
                        decision,
                        planMetadata: metadata,
                    }),
                    new Promise((_, reject) => {
                        timeoutHandle = setTimeout(() => reject(new Error(`timeout after ${this.resilience.timeoutMs}ms`)), this.resilience.timeoutMs);
                    }),
                ]);
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
                if (this.mode === 'deterministic' &&
                    this.featureFlags.deterministicLogging) {
                    result.logs = [
                        `[deterministic seed=${this.deterministicSeed}]`,
                        ...result.logs,
                    ];
                    result.featureFlags = [
                        ...(result.featureFlags ?? []),
                        'deterministic',
                    ];
                }
                if (result.status === 'success') {
                    this.circuitStates.set(circuitKey, { failures: 0 });
                    result.attempts = attempts;
                    result.timedOut = timedOut;
                    return result;
                }
                lastLogs = result.logs;
                lastError = 'execution-failure';
            }
            catch (error) {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
                lastError =
                    error instanceof Error ? error.message : 'execution timed out';
                timedOut ||= lastError.includes('timeout');
                lastLogs = [`${lastError}`];
            }
            existing.failures += 1;
            const shouldOpenCircuit = this.featureFlags.enableCircuitBreaker &&
                existing.failures >= this.resilience.circuitBreaker.failureThreshold;
            if (shouldOpenCircuit) {
                existing.openedAt = Date.now();
                break;
            }
            if (attempts <= this.resilience.maxRetries) {
                await this.sleep(this.backoffForAttempt(attempts));
            }
        }
        this.circuitStates.set(circuitKey, existing);
        const degraded = this.featureFlags.gracefulDegradation;
        return {
            status: degraded ? 'success' : 'failure',
            throughputPerMinute: degraded
                ? Math.max(1, stage.minThroughputPerMinute * 0.1)
                : 0,
            cost: 0,
            errorRate: 1,
            logs: degraded
                ? ['graceful-degradation enabled', ...lastLogs]
                : lastLogs,
            degraded,
            attempts,
            timedOut: timedOut || (lastError?.includes('timeout') ?? false),
            featureFlags: [
                ...(degraded ? ['graceful-degradation'] : []),
                ...(existing.openedAt ? ['circuit-breaker'] : []),
                ...(this.mode === 'deterministic' && this.featureFlags.deterministicLogging
                    ? ['deterministic']
                    : []),
            ],
        };
    }
    async runStage(stage, step, metadata) {
        const startedAt = nowIso();
        const primaryResult = await this.executeWithResilience(stage, step.primary, metadata);
        if (primaryResult.status === 'success') {
            const finishedAt = nowIso();
            const traceEntry = {
                stageId: stage.id,
                provider: step.primary.provider,
                status: 'success',
                startedAt,
                finishedAt,
                logs: primaryResult.logs,
                fallbackTriggered: primaryResult.degraded
                    ? 'graceful-degradation'
                    : primaryResult.timedOut
                        ? 'timeout'
                        : undefined,
                degraded: primaryResult.degraded,
                featureFlags: primaryResult.featureFlags,
            };
            const rewardSignal = {
                stageId: stage.id,
                observedThroughput: primaryResult.throughputPerMinute,
                observedCost: primaryResult.cost,
                observedErrorRate: primaryResult.degraded && stage.guardrail?.maxErrorRate
                    ? Math.min(primaryResult.errorRate, stage.guardrail.maxErrorRate)
                    : primaryResult.errorRate,
                recovered: primaryResult.degraded ?? false,
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
            const traceEntry = {
                stageId: stage.id,
                provider: step.primary.provider,
                status: 'failed',
                startedAt,
                finishedAt,
                logs: primaryResult.logs,
                fallbackTriggered: primaryResult.timedOut
                    ? 'timeout'
                    : 'execution-failure',
                featureFlags: primaryResult.featureFlags,
            };
            const rewardSignal = {
                stageId: stage.id,
                observedThroughput: primaryResult.throughputPerMinute,
                observedCost: primaryResult.cost,
                observedErrorRate: primaryResult.errorRate,
                recovered: false,
            };
            return { traceEntry, rewardSignal };
        }
        const fallbackResult = await this.invokeFallbacks(stage, step, metadata, primaryResult.logs, startedAt);
        return fallbackResult;
    }
    async invokeFallbacks(stage, step, metadata, accumulatedLogs, initialStartedAt) {
        const guardrail = stage.guardrail;
        let attempt = 0;
        const fallbacks = stage.fallbackStrategies ?? [];
        let lastStartedAt = initialStartedAt;
        for (const fallbackDecision of step.fallbacks) {
            attempt += 1;
            if (attempt > this.selfHealing.maxRetries) {
                break;
            }
            const fallbackPolicy = fallbacks.find((strategy) => strategy.provider === fallbackDecision.provider);
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
            const result = await this.executeWithResilience(stage, fallbackDecision, metadata);
            lastStartedAt = fallbackStartedAt;
            if (result.status === 'success') {
                const finishedAt = nowIso();
                const traceEntry = {
                    stageId: stage.id,
                    provider: fallbackDecision.provider,
                    status: 'recovered',
                    startedAt: fallbackStartedAt,
                    finishedAt,
                    logs: [...accumulatedLogs, ...result.logs],
                    fallbackTriggered: result.degraded
                        ? 'graceful-degradation'
                        : result.timedOut
                            ? 'timeout'
                            : 'execution-failure',
                    degraded: result.degraded,
                    featureFlags: result.featureFlags,
                };
                const rewardSignal = {
                    stageId: stage.id,
                    observedThroughput: result.throughputPerMinute,
                    observedCost: result.cost,
                    observedErrorRate: Math.min(result.errorRate, guardrail?.maxErrorRate ?? result.errorRate),
                    recovered: true,
                };
                return { traceEntry, rewardSignal };
            }
            accumulatedLogs.push(...result.logs);
        }
        const finishedAt = nowIso();
        const traceEntry = {
            stageId: stage.id,
            provider: step.primary.provider,
            status: 'failed',
            startedAt: lastStartedAt,
            finishedAt,
            logs: accumulatedLogs,
            fallbackTriggered: 'execution-failure',
        };
        const rewardSignal = {
            stageId: stage.id,
            observedThroughput: 0,
            observedCost: 0,
            observedErrorRate: guardrail?.maxErrorRate ?? 1,
            recovered: false,
        };
        return { traceEntry, rewardSignal };
    }
    deriveTelemetry(outcome) {
        const throughput = outcome.rewards.reduce((acc, reward) => acc + reward.observedThroughput, 0);
        const cost = outcome.rewards.reduce((acc, reward) => acc + reward.observedCost, 0);
        const successes = outcome.trace.filter((entry) => entry.status === 'success' || entry.status === 'recovered').length;
        const auditCompleteness = outcome.trace.length > 0 ? successes / outcome.trace.length : 0;
        const selfHealing = outcome.trace.filter((entry) => entry.status === 'recovered').length;
        const selfHealingRate = outcome.trace.length > 0 ? selfHealing / outcome.trace.length : 0;
        return {
            throughputPerMinute: throughput,
            costPerThroughputUnit: throughput === 0 ? cost : cost / throughput,
            auditCompleteness,
            selfHealingRate,
        };
    }
}
exports.MetaOrchestrator = MetaOrchestrator;
function captureMaestroReplay(options) {
    const descriptor = (0, common_types_2.createReplayDescriptor)({
        service: 'maestro-conductor',
        flow: 'maestro-reference-workflow',
        request: {
            path: 'reference-workflow',
            method: 'EXECUTE',
            payload: (0, common_types_2.sanitizePayload)({
                pipeline: options.input.pipeline,
                services: options.input.services,
                environments: options.input.environments,
                incidents: options.input.incidents,
                policies: options.input.policies,
                costSignals: options.input.costSignals,
                stageOverlays: options.input.stageOverlays,
                providers: options.input.providers,
                pricing: options.input.pricing,
                executionScripts: options.input.executionScripts,
                metadata: options.input.metadata,
            }),
        },
        context: {
            tenantId: 'reference',
            purpose: 'maestro-e2e',
            traceId: options.outcome?.trace?.[0]?.stageId,
            featureFlags: options.input.metadata?.featureFlags ?? undefined,
        },
        environment: (0, common_types_2.buildReplayEnvironment)({ env: { MAESTRO_ENV: 'test' } }),
        outcome: {
            status: options.error ? 'error' : 'success',
            message: options.error instanceof Error
                ? options.error.message
                : options.error
                    ? String(options.error)
                    : undefined,
            classification: options.classification,
        },
        originalResponse: options.outcome ?? { auditTrail: options.auditTrail },
        privacy: { notes: ['Auto-captured from reference workflow run.'] },
        tags: ['auto-captured'],
    });
    (0, common_types_2.persistReplayDescriptor)(descriptor);
}
class StaticPricingFeed {
    signals;
    constructor(signals) {
        this.signals = signals;
    }
    async getPricingSignals() {
        return this.signals;
    }
}
class ReferenceExecutionAdapter {
    script = new Map();
    constructor(scenarios) {
        for (const [provider, result] of Object.entries(scenarios)) {
            const values = Array.isArray(result) ? [...result] : [result];
            this.script.set(provider, values);
        }
    }
    async execute(request) {
        const planned = this.script.get(request.decision.provider);
        if (!planned || planned.length === 0) {
            return {
                status: 'success',
                throughputPerMinute: Math.max(request.stage.minThroughputPerMinute, 1),
                cost: request.decision.expectedCost,
                errorRate: 0.01,
                logs: ['reference-default-success'],
            };
        }
        const [result, ...remaining] = planned;
        this.script.set(request.decision.provider, remaining);
        return result;
    }
}
function stageDefinitionsFromGraph(snapshot, overlays) {
    return snapshot.nodes
        .filter((node) => node.type === 'stage')
        .map((node) => {
        const stage = node.data;
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
        };
    });
}
async function runReferenceWorkflow(input) {
    const graph = new knowledge_graph_1.OrchestrationKnowledgeGraph();
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
    const auditTrail = [];
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
    let outcome;
    try {
        outcome = await orchestrator.executePlan(stages, input.metadata ?? {});
    }
    catch (error) {
        captureMaestroReplay({
            input,
            auditTrail,
            error,
            classification: 'plan-execution-throw',
        });
        throw error;
    }
    if (outcome.trace.some((entry) => entry.status === 'failed')) {
        captureMaestroReplay({
            input,
            auditTrail,
            outcome,
            classification: 'stage-failure',
        });
    }
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
async function runHelloWorldWorkflow() {
    const pipeline = {
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
async function runHelloCaseWorkflow() {
    const pipeline = {
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
async function runPaymentsAndCreditWorkflow() {
    const pipeline = {
        id: 'payments-credit-pipeline',
        name: 'Payments and Credit Orchestration',
        stages: [
            {
                id: 'pci-ingest',
                name: 'PCI-Safe Ingest',
                pipelineId: 'payments-credit-pipeline',
                serviceId: 'service-ingest',
                environmentId: 'env-eu-active',
                capability: 'ingest',
                complianceTags: ['pci', 'aml', 'gdpr'],
            },
            {
                id: 'fraud-decision',
                name: 'Fraud and Credit Decisioning',
                pipelineId: 'payments-credit-pipeline',
                serviceId: 'service-decision',
                environmentId: 'env-eu-active',
                capability: 'ml',
                complianceTags: ['pci', 'psd2', 'sca'],
            },
            {
                id: 'audit-ledger',
                name: 'Immutable Audit and Provenance',
                pipelineId: 'payments-credit-pipeline',
                serviceId: 'service-ledger',
                environmentId: 'env-eu-active',
                capability: 'audit',
                complianceTags: ['pci', 'sox'],
            },
        ],
    };
    return runReferenceWorkflow({
        pipeline,
        services: [
            {
                id: 'service-ingest',
                name: 'EU Payments Ingest',
                tier: 'tier-0',
                owningTeam: 'payments-edge',
                dependencies: ['service-ledger'],
                soxCritical: true,
            },
            {
                id: 'service-decision',
                name: 'Fraud and Credit Brain',
                tier: 'tier-0',
                owningTeam: 'risk-brain',
                dependencies: ['service-ledger'],
                soxCritical: true,
            },
            {
                id: 'service-ledger',
                name: 'Provenance Ledger',
                tier: 'tier-1',
                owningTeam: 'controls',
            },
        ],
        environments: [
            {
                id: 'env-eu-active',
                name: 'EU Active',
                stage: 'prod',
                region: 'eu-west-1',
                deploymentMechanism: 'kubernetes',
                zeroTrustTier: 1,
                complianceTags: ['pci', 'psd2', 'sca', 'aml', 'gdpr'],
            },
        ],
        policies: [
            {
                id: 'policy-pci-boundary',
                description: 'PCI and PSD2 enforcement with deny-by-default',
                effect: 'allow',
                actions: ['ingest', 'execute', 'persist'],
                resources: [
                    'service:service-ingest',
                    'service:service-decision',
                    'service:service-ledger',
                ],
                conditions: [
                    { key: 'purpose', operator: 'equals', values: ['fraud', 'credit'] },
                    { key: 'geo', operator: 'equals', values: ['eu'] },
                    { key: 'data-sensitivity', operator: 'in', values: ['pci', 'pii'] },
                ],
                obligations: [
                    { key: 'encryption', value: 'field-level' },
                    { key: 'tokenization', value: 'pan' },
                    { key: 'residency', value: 'eu-only' },
                ],
                tags: ['pci', 'aml', 'psd2'],
            },
        ],
        costSignals: [
            {
                serviceId: 'service-ingest',
                timeBucket: new Date().toISOString().slice(0, 13),
                saturation: 0.6,
                budgetBreaches: 0,
                throttleCount: 0,
                slowQueryCount: 0,
            },
            {
                serviceId: 'service-decision',
                timeBucket: new Date().toISOString().slice(0, 13),
                saturation: 0.7,
                budgetBreaches: 0,
                throttleCount: 1,
                slowQueryCount: 1,
            },
        ],
        stageOverlays: {
            'pci-ingest': {
                requiredCapabilities: ['ingest'],
                complianceTags: ['pci', 'aml', 'gdpr'],
                minThroughputPerMinute: 1200,
                slaSeconds: 1,
                guardrail: { maxErrorRate: 0.01, recoveryTimeoutSeconds: 30 },
                fallbackStrategies: [
                    { provider: 'eu-backup', region: 'eu-west-2', trigger: 'execution-failure' },
                ],
            },
            'fraud-decision': {
                requiredCapabilities: ['ml', 'graph'],
                complianceTags: ['pci', 'psd2', 'sca', 'aml'],
                minThroughputPerMinute: 720,
                slaSeconds: 1,
                guardrail: { maxErrorRate: 0.02, recoveryTimeoutSeconds: 20 },
                fallbackStrategies: [
                    { provider: 'eu-backup', region: 'eu-west-2', trigger: 'execution-failure' },
                ],
            },
            'audit-ledger': {
                requiredCapabilities: ['audit', 'ledger'],
                complianceTags: ['pci', 'sox'],
                minThroughputPerMinute: 480,
                slaSeconds: 2,
                guardrail: { maxErrorRate: 0.005, recoveryTimeoutSeconds: 10 },
            },
        },
        providers: [
            {
                name: 'eu-trust',
                regions: ['eu-west-1'],
                services: ['ingest', 'ml', 'graph', 'audit', 'ledger'],
                reliabilityScore: 0.97,
                sustainabilityScore: 0.64,
                securityCertifications: ['pci', 'psd2', 'sca', 'gdpr', 'aml'],
                maxThroughputPerMinute: 1500,
                baseLatencyMs: 60,
                policyTags: ['pci', 'psd2', 'sca', 'aml', 'gdpr', 'sox'],
            },
            {
                name: 'eu-backup',
                regions: ['eu-west-2'],
                services: ['ingest', 'ml', 'graph', 'audit', 'ledger'],
                reliabilityScore: 0.94,
                sustainabilityScore: 0.58,
                securityCertifications: ['pci', 'psd2', 'sca', 'gdpr', 'aml'],
                maxThroughputPerMinute: 1200,
                baseLatencyMs: 68,
                policyTags: ['pci', 'psd2', 'sca', 'aml', 'gdpr', 'sox'],
            },
        ],
        pricing: [
            {
                provider: 'eu-trust',
                region: 'eu-west-1',
                service: 'ingest',
                pricePerUnit: 0.08,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-backup',
                region: 'eu-west-2',
                service: 'ingest',
                pricePerUnit: 0.06,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-trust',
                region: 'eu-west-1',
                service: 'ml',
                pricePerUnit: 0.09,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-backup',
                region: 'eu-west-2',
                service: 'ml',
                pricePerUnit: 0.07,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-trust',
                region: 'eu-west-1',
                service: 'audit',
                pricePerUnit: 0.02,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-backup',
                region: 'eu-west-2',
                service: 'audit',
                pricePerUnit: 0.025,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-trust',
                region: 'eu-west-1',
                service: 'ledger',
                pricePerUnit: 0.03,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-backup',
                region: 'eu-west-2',
                service: 'ledger',
                pricePerUnit: 0.035,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-trust',
                region: 'eu-west-1',
                service: 'graph',
                pricePerUnit: 0.05,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'eu-backup',
                region: 'eu-west-2',
                service: 'graph',
                pricePerUnit: 0.055,
                currency: 'EUR',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
        ],
        executionScripts: {
            'eu-trust': [
                {
                    status: 'success',
                    throughputPerMinute: 1300,
                    cost: 104,
                    errorRate: 0.004,
                    logs: ['tokenized ingest ok', 'residency eu enforced'],
                },
                {
                    status: 'failure',
                    throughputPerMinute: 0,
                    cost: 0,
                    errorRate: 0.08,
                    logs: ['model throttle', 'triggering fallback'],
                },
                {
                    status: 'success',
                    throughputPerMinute: 520,
                    cost: 15,
                    errorRate: 0.002,
                    logs: ['audit signed'],
                },
            ],
            'eu-backup': [
                {
                    status: 'success',
                    throughputPerMinute: 740,
                    cost: 48,
                    errorRate: 0.009,
                    logs: ['fraud decision fallback success'],
                },
                {
                    status: 'success',
                    throughputPerMinute: 1250,
                    cost: 90,
                    errorRate: 0.006,
                    logs: ['ingest backup path'],
                },
                {
                    status: 'success',
                    throughputPerMinute: 500,
                    cost: 18,
                    errorRate: 0.003,
                    logs: ['ledger sealed'],
                },
            ],
        },
        metadata: {
            release: 'pci-payments-v14',
            correlationId: 'payments-credit-ref',
            traceId: 'payments-trace-001',
        },
    });
}
var contextDecomposer_js_1 = require("./prompt/contextDecomposer.js");
Object.defineProperty(exports, "ContextAwareDecomposer", { enumerable: true, get: function () { return contextDecomposer_js_1.ContextAwareDecomposer; } });
var collaboration_js_1 = require("./prompt/collaboration.js");
Object.defineProperty(exports, "CollaborativeContextBroker", { enumerable: true, get: function () { return collaboration_js_1.CollaborativeContextBroker; } });
Object.defineProperty(exports, "CollaborativeWorkspace", { enumerable: true, get: function () { return collaboration_js_1.CollaborativeWorkspace; } });
var summarizer_js_1 = require("./prompt/summarizer.js");
Object.defineProperty(exports, "HierarchicalSummarizer", { enumerable: true, get: function () { return summarizer_js_1.HierarchicalSummarizer; } });
var planner_js_1 = require("./prompt/planner.js");
Object.defineProperty(exports, "MetaPromptPlanner", { enumerable: true, get: function () { return planner_js_1.MetaPromptPlanner; } });
var rsip_js_1 = require("./prompt/rsip.js");
Object.defineProperty(exports, "RecursiveSelfImprovementEngine", { enumerable: true, get: function () { return rsip_js_1.RecursiveSelfImprovementEngine; } });
var autonomousEvolution_js_1 = require("./prompt/autonomousEvolution.js");
Object.defineProperty(exports, "AutonomousEvolutionOrchestrator", { enumerable: true, get: function () { return autonomousEvolution_js_1.AutonomousEvolutionOrchestrator; } });
var consensus_js_1 = require("./prompt/consensus.js");
Object.defineProperty(exports, "SelfConsensusEngine", { enumerable: true, get: function () { return consensus_js_1.SelfConsensusEngine; } });
var retriever_js_1 = require("./prompt/retriever.js");
Object.defineProperty(exports, "TokenAwareRetriever", { enumerable: true, get: function () { return retriever_js_1.TokenAwareRetriever; } });
var utils_js_1 = require("./prompt/utils.js");
Object.defineProperty(exports, "clampValue", { enumerable: true, get: function () { return utils_js_1.clampValue; } });
Object.defineProperty(exports, "cosineSimilarity", { enumerable: true, get: function () { return utils_js_1.cosineSimilarity; } });
Object.defineProperty(exports, "defaultTokenEstimator", { enumerable: true, get: function () { return utils_js_1.defaultTokenEstimator; } });
var toolkit_js_1 = require("./prompt/toolkit.js");
Object.defineProperty(exports, "PromptEngineeringToolkit", { enumerable: true, get: function () { return toolkit_js_1.PromptEngineeringToolkit; } });
var intentTranslator_js_1 = require("./gen-actions/intentTranslator.js");
Object.defineProperty(exports, "GenerativeActionTranslator", { enumerable: true, get: function () { return intentTranslator_js_1.GenerativeActionTranslator; } });
var metaContextOrchestrator_js_1 = require("./metaContextOrchestrator.js");
Object.defineProperty(exports, "MetaContextOrchestrator", { enumerable: true, get: function () { return metaContextOrchestrator_js_1.MetaContextOrchestrator; } });
var trustSafetyOrchestrator_js_1 = require("./trustSafetyOrchestrator.js");
Object.defineProperty(exports, "TrustSafetyOrchestrator", { enumerable: true, get: function () { return trustSafetyOrchestrator_js_1.TrustSafetyOrchestrator; } });
Object.defineProperty(exports, "TRUST_SAFETY_DEFAULTS", { enumerable: true, get: function () { return trustSafetyOrchestrator_js_1.TRUST_SAFETY_DEFAULTS; } });
