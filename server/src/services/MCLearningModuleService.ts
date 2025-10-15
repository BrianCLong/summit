import { EventEmitter } from 'events';

export type SignalDomain =
  | 'graph'
  | 'temporal'
  | 'behavioral'
  | 'cost'
  | 'quality'
  | 'communications'
  | 'logistics';

export interface PatternSignal {
  domain: SignalDomain;
  source: string;
  timestamp: Date;
  reliability: number; // 0-1 weighting for the signal quality
  payload: Record<string, number>;
  tags?: string[];
}

export interface DomainFeatureVector {
  domain: SignalDomain;
  lastUpdated: Date;
  sampleCount: number;
  aggregated: Record<string, number>;
  trend: Record<string, number>;
  reliability: number;
}

interface AggregatedFeatureState {
  mean: number;
  lastValue: number;
  weight: number;
}

interface DomainState {
  features: Map<string, AggregatedFeatureState>;
  lastUpdated: Date;
  sampleCount: number;
  reliability: number;
}

export class PatternIntelligenceFabric {
  private readonly domains = new Map<SignalDomain, DomainState>();
  private readonly history: PatternSignal[] = [];

  constructor(private readonly maxHistory = 500) {}

  ingest(signal: PatternSignal): DomainFeatureVector {
    const state = this.domains.get(signal.domain) ?? {
      features: new Map<string, AggregatedFeatureState>(),
      lastUpdated: signal.timestamp,
      sampleCount: 0,
      reliability: 0,
    };

    state.sampleCount += 1;
    state.lastUpdated = signal.timestamp;
    state.reliability = Math.min(
      1,
      (state.reliability * (state.sampleCount - 1) + signal.reliability) /
        state.sampleCount,
    );

    for (const [feature, value] of Object.entries(signal.payload)) {
      const featureState = state.features.get(feature) ?? {
        mean: 0,
        lastValue: value,
        weight: 0,
      };

      const newWeight =
        featureState.weight + Math.max(signal.reliability, 0.01);
      const newMean =
        (featureState.mean * featureState.weight +
          value * Math.max(signal.reliability, 0.01)) /
        newWeight;

      state.features.set(feature, {
        mean: newMean,
        lastValue: value,
        weight: newWeight,
      });
    }

    this.domains.set(signal.domain, state);
    this.history.push(signal);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return this.serializeDomainState(signal.domain, state);
  }

  getDomains(): SignalDomain[] {
    return Array.from(this.domains.keys());
  }

  getDomainFeatures(domain: SignalDomain): DomainFeatureVector | undefined {
    const state = this.domains.get(domain);
    return state ? this.serializeDomainState(domain, state) : undefined;
  }

  getUnifiedFeatureVector(): Record<string, number> {
    const vector: Record<string, number> = {};
    let domainCount = 0;
    let cumulativeReliability = 0;

    for (const [domain, state] of this.domains.entries()) {
      domainCount += 1;
      cumulativeReliability += state.reliability;
      for (const [feature, value] of state.features.entries()) {
        vector[`${domain}.${feature}`] = Number(value.mean.toFixed(6));
      }
    }

    if (domainCount > 0) {
      vector['meta.domainCoverage'] = domainCount;
      vector['meta.averageReliability'] = Number(
        (cumulativeReliability / domainCount).toFixed(4),
      );
    } else {
      vector['meta.domainCoverage'] = 0;
      vector['meta.averageReliability'] = 0;
    }

    return vector;
  }

  getRecentSignals(limit = 25): PatternSignal[] {
    return this.history.slice(-limit);
  }

  private serializeDomainState(
    domain: SignalDomain,
    state: DomainState,
  ): DomainFeatureVector {
    const aggregated: Record<string, number> = {};
    const trend: Record<string, number> = {};

    for (const [feature, value] of state.features.entries()) {
      aggregated[feature] = Number(value.mean.toFixed(6));
      trend[feature] = Number((value.lastValue - value.mean).toFixed(6));
    }

    return {
      domain,
      aggregated,
      trend,
      lastUpdated: state.lastUpdated,
      sampleCount: state.sampleCount,
      reliability: Number(state.reliability.toFixed(4)),
    };
  }
}

export interface StrategyDefinition {
  id: string;
  name: string;
  featureWeights: Record<string, number>;
  riskTolerance: number; // 0-1 allowed risk tolerance
  costSensitivity: number; // 0-1 how sensitive to cost inflation
  governanceTags: string[];
  baselineReward?: number;
  description?: string;
}

export interface StrategyContext {
  missionProfile: string;
  riskTolerance: number;
  costSensitivity: number;
  tempo: 'rapid' | 'balanced' | 'cautious';
  prioritySignals?: string[];
}

export interface StrategyFeedback {
  strategyId: string;
  reward: number; // -1 to 1
  success: boolean;
  metrics: {
    cost: number;
    risk: number;
    quality: number;
    confidence: number;
  };
  notes?: string;
}

export interface StrategyRecommendation {
  id: string;
  name: string;
  score: number;
  confidence: number;
  expectedOutcomes: {
    cost: number;
    risk: number;
    quality: number;
  };
  rationale: string[];
  origin: 'portfolio' | 'evolved';
}

interface StrategyState {
  definition: StrategyDefinition;
  trials: number;
  cumulativeReward: number;
  wins: number;
  lastReward: number;
  explorationBonus: number;
  lastUpdated?: Date;
}

export interface StrategyDiagnostics {
  id: string;
  name: string;
  trials: number;
  wins: number;
  winRate: number;
  cumulativeReward: number;
  lastReward: number;
  explorationBonus: number;
  lastUpdated?: Date;
  definition: StrategyDefinition;
}

export class AdaptiveStrategyLoop {
  private readonly strategies = new Map<string, StrategyState>();

  constructor(
    private readonly randomFn: () => number = Math.random,
    private readonly explorationRate = 0.2,
  ) {}

  registerStrategy(definition: StrategyDefinition): void {
    if (this.strategies.has(definition.id)) {
      throw new Error(`Strategy with id ${definition.id} already registered`);
    }

    this.strategies.set(definition.id, {
      definition,
      trials: 0,
      cumulativeReward: 0,
      wins: 0,
      lastReward: 0,
      explorationBonus: definition.baselineReward ?? 0,
    });
  }

  listStrategies(): StrategyDefinition[] {
    return Array.from(this.strategies.values()).map(
      (state) => state.definition,
    );
  }

  getDiagnostics(strategyId?: string): StrategyDiagnostics[] {
    const states = strategyId
      ? (() => {
          const match = this.strategies.get(strategyId);
          return match ? [[strategyId, match] as const] : [];
        })()
      : Array.from(this.strategies.entries());

    return states.map(([, state]) => ({
      id: state.definition.id,
      name: state.definition.name,
      trials: state.trials,
      wins: state.wins,
      winRate: Number(
        (state.trials > 0 ? state.wins / state.trials : 0).toFixed(4),
      ),
      cumulativeReward: Number(state.cumulativeReward.toFixed(4)),
      lastReward: Number(state.lastReward.toFixed(4)),
      explorationBonus: Number(state.explorationBonus.toFixed(4)),
      lastUpdated: state.lastUpdated,
      definition: {
        ...state.definition,
        featureWeights: { ...state.definition.featureWeights },
        governanceTags: [...state.definition.governanceTags],
      },
    }));
  }

  recommendStrategies(
    context: StrategyContext,
    features: Record<string, number>,
    topK = 3,
  ): StrategyRecommendation[] {
    const scored = Array.from(this.strategies.values()).map((state) => {
      const exploitationScore = this.computeExploitationScore(
        state.definition,
        features,
      );
      const historyScore =
        state.trials > 0
          ? state.cumulativeReward / state.trials
          : (state.definition.baselineReward ?? 0);
      const explorationBoost = this.computeExplorationBoost(state);
      const riskPenalty =
        Math.max(0, context.riskTolerance - state.definition.riskTolerance) *
        0.4;
      const costPenalty =
        context.costSensitivity * state.definition.costSensitivity * 0.3;
      const tempoAdjustment = this.computeTempoAdjustment(
        context.tempo,
        state.definition,
      );

      const score =
        exploitationScore +
        historyScore +
        explorationBoost +
        tempoAdjustment -
        riskPenalty -
        costPenalty;
      const confidence = this.computeConfidence(
        state,
        features,
        riskPenalty + costPenalty,
      );

      return {
        id: state.definition.id,
        name: state.definition.name,
        score,
        confidence,
        expectedOutcomes: {
          cost: Math.max(
            0,
            1 - (state.definition.costSensitivity + riskPenalty) / 2,
          ),
          risk: Math.max(
            0,
            1 - (state.definition.riskTolerance + costPenalty) / 2,
          ),
          quality: Math.min(1, 0.6 + exploitationScore / 3 + historyScore / 4),
        },
        rationale: this.buildRationale(state, context, features, score),
        origin: 'portfolio' as const,
      } satisfies StrategyRecommendation;
    });

    const sorted = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(topK, 1));

    const variants = sorted.flatMap((recommendation) =>
      this.generateEvolutionaryVariants(recommendation, features, context),
    );

    return [...sorted, ...variants].slice(0, topK);
  }

  updateFeedback(feedback: StrategyFeedback): void {
    const state = this.strategies.get(feedback.strategyId);
    if (!state) {
      throw new Error(`Unknown strategy ${feedback.strategyId}`);
    }

    state.trials += 1;
    state.cumulativeReward += feedback.reward;
    state.lastReward = feedback.reward;
    if (feedback.success) {
      state.wins += 1;
    }
    state.lastUpdated = new Date();

    const performanceDelta =
      feedback.reward - (state.definition.baselineReward ?? 0);
    state.explorationBonus = Math.max(
      0.05,
      state.explorationBonus * 0.7 + performanceDelta * 0.3 + 0.05,
    );

    if (feedback.success && performanceDelta > 0.25) {
      const mutated = this.mutateStrategy(state.definition, feedback.metrics);
      if (!this.strategies.has(mutated.id)) {
        this.registerStrategy(mutated);
      }
    }
  }

  private computeExploitationScore(
    definition: StrategyDefinition,
    features: Record<string, number>,
  ): number {
    let score = 0;
    for (const [feature, weight] of Object.entries(definition.featureWeights)) {
      const featureValue = features[feature] ?? 0;
      score += featureValue * weight;
    }
    return score;
  }

  private computeExplorationBoost(state: StrategyState): number {
    const base = this.explorationRate / Math.max(1, state.trials);
    return Number((base + state.explorationBonus * 0.1).toFixed(6));
  }

  private computeTempoAdjustment(
    tempo: StrategyContext['tempo'],
    definition: StrategyDefinition,
  ): number {
    const tempoWeight = definition.featureWeights['meta.domainCoverage'] ?? 0;
    if (tempo === 'rapid') {
      return tempoWeight * 0.1;
    }
    if (tempo === 'cautious') {
      return -tempoWeight * 0.05;
    }
    return 0;
  }

  private computeConfidence(
    state: StrategyState,
    features: Record<string, number>,
    penalty: number,
  ): number {
    const coverage = features['meta.domainCoverage'] ?? 0;
    const historicalConfidence =
      state.trials > 0 ? state.wins / state.trials : 0.5;
    const adjusted = Math.max(
      0.1,
      Math.min(0.95, 0.4 + 0.1 * coverage + historicalConfidence - penalty),
    );
    return Number(adjusted.toFixed(4));
  }

  private buildRationale(
    state: StrategyState,
    context: StrategyContext,
    features: Record<string, number>,
    score: number,
  ): string[] {
    const explanations = [
      `Score ${score.toFixed(3)} for mission ${context.missionProfile}`,
    ];
    if (context.prioritySignals?.length) {
      explanations.push(
        `Prioritized signals: ${context.prioritySignals.join(', ')}`,
      );
    }
    const coverage = features['meta.domainCoverage'] ?? 0;
    explanations.push(`Pattern coverage across ${coverage} domains`);
    explanations.push(`Historical wins: ${state.wins}/${state.trials}`);
    return explanations;
  }

  private generateEvolutionaryVariants(
    recommendation: StrategyRecommendation,
    features: Record<string, number>,
    context: StrategyContext,
  ): StrategyRecommendation[] {
    const baseState = this.strategies.get(recommendation.id);
    if (!baseState) {
      return [];
    }

    const variantWeights: Record<string, number> = {};
    for (const [feature, weight] of Object.entries(
      baseState.definition.featureWeights,
    )) {
      const modifier = 0.85 + this.randomFn() * 0.3; // mutate between -15% and +15%
      variantWeights[feature] = Number((weight * modifier).toFixed(6));
    }

    const mutatedScore = this.computeExploitationScore(
      { ...baseState.definition, featureWeights: variantWeights },
      features,
    );

    const explorationBias =
      (context.tempo === 'rapid' ? 0.1 : 0.05) + this.randomFn() * 0.05;
    const score = mutatedScore + explorationBias;

    return [
      {
        id: `${recommendation.id}::variant`,
        name: `${recommendation.name} (variant)`,
        score,
        confidence: Number((recommendation.confidence * 0.9).toFixed(4)),
        expectedOutcomes: {
          cost: Number(
            (recommendation.expectedOutcomes.cost * 1.02).toFixed(4),
          ),
          risk: Number(
            (recommendation.expectedOutcomes.risk * 0.98).toFixed(4),
          ),
          quality: Number(
            (recommendation.expectedOutcomes.quality * 1.01).toFixed(4),
          ),
        },
        rationale: [
          ...recommendation.rationale,
          'Evolutionary search exploration candidate',
        ],
        origin: 'evolved',
      },
    ];
  }

  private mutateStrategy(
    definition: StrategyDefinition,
    metrics: StrategyFeedback['metrics'],
  ): StrategyDefinition {
    const mutationFactor = 0.9 + this.randomFn() * 0.2;
    const mutatedWeights: Record<string, number> = {};
    for (const [feature, weight] of Object.entries(definition.featureWeights)) {
      mutatedWeights[feature] = Number((weight * mutationFactor).toFixed(6));
    }

    const suffix = Math.floor(this.randomFn() * 1000)
      .toString()
      .padStart(3, '0');

    return {
      ...definition,
      id: `${definition.id}-evolved-${suffix}`,
      name: `${definition.name} Evolved ${suffix}`,
      featureWeights: mutatedWeights,
      baselineReward: Math.min(
        1,
        (definition.baselineReward ?? 0.3) * 0.8 + metrics.quality * 0.2,
      ),
    };
  }
}

export interface SimulationScenario {
  id: string;
  name: string;
  durationHours: number;
  environment: {
    volatility: number;
    adversarySkill: number;
    supportLevel: number;
  };
  objectives: string[];
}

export interface SimulationResult {
  strategyId: string;
  effectiveness: number;
  efficiency: number;
  resilience: number;
  summary: string;
}

export class MissionControlSimulationLab {
  constructor(private readonly randomFn: () => number = Math.random) {}

  runScenario(
    strategies: StrategyRecommendation[],
    scenario: SimulationScenario,
    features: Record<string, number>,
  ): SimulationResult[] {
    const results = strategies.map((strategy) => {
      const patternCoverage = features['meta.domainCoverage'] ?? 1;
      const volatilityPenalty = scenario.environment.volatility * 0.1;
      const adversaryPressure = scenario.environment.adversarySkill * 0.05;
      const supportBoost = scenario.environment.supportLevel * 0.08;

      const stochasticInfluence = this.randomFn() * 0.1;
      const effectiveness = Number(
        (
          strategy.score * 0.6 +
          strategy.confidence * 0.2 +
          patternCoverage * 0.05 -
          volatilityPenalty -
          adversaryPressure +
          supportBoost +
          stochasticInfluence
        ).toFixed(4),
      );

      const efficiency = Number(
        (
          strategy.expectedOutcomes.cost * 0.5 +
          strategy.expectedOutcomes.quality * 0.3 +
          supportBoost * 0.2 -
          volatilityPenalty * 0.3
        ).toFixed(4),
      );

      const resilience = Number(
        (
          strategy.expectedOutcomes.risk * 0.5 +
          strategy.confidence * 0.3 +
          (scenario.environment.supportLevel > 0.5 ? 0.05 : 0) +
          this.randomFn() * 0.05
        ).toFixed(4),
      );

      return {
        strategyId: strategy.id,
        effectiveness,
        efficiency,
        resilience,
        summary: `Scenario ${scenario.name} evaluated ${strategy.name} with effectiveness ${effectiveness.toFixed(
          3,
        )}`,
      } satisfies SimulationResult;
    });

    return results.sort((a, b) => b.effectiveness - a.effectiveness);
  }
}

export interface GovernancePolicy {
  maxRisk: number;
  maxCost: number;
  minConfidence: number;
  requiredTags: string[];
  minQuality: number;
}

export interface GovernanceDecision {
  strategyId: string;
  approved: boolean;
  reasons: string[];
  metrics: {
    risk: number;
    cost: number;
    confidence: number;
    quality: number;
    complianceScore: number;
  };
  timestamp: Date;
}

export class GovernanceGate {
  private readonly auditTrail: GovernanceDecision[] = [];

  constructor(
    private policy: GovernancePolicy = {
      maxRisk: 0.6,
      maxCost: 0.7,
      minConfidence: 0.55,
      requiredTags: ['mission-control'],
      minQuality: 0.6,
    },
  ) {}

  evaluate(
    strategy: StrategyRecommendation,
    definition: StrategyDefinition,
    metrics: StrategyFeedback['metrics'],
  ): GovernanceDecision {
    const reasons: string[] = [];
    if (metrics.risk > this.policy.maxRisk) {
      reasons.push(
        `Risk score ${metrics.risk.toFixed(2)} exceeds threshold ${this.policy.maxRisk}`,
      );
    }
    if (metrics.cost > this.policy.maxCost) {
      reasons.push(
        `Cost score ${metrics.cost.toFixed(2)} exceeds threshold ${this.policy.maxCost}`,
      );
    }
    if (strategy.confidence < this.policy.minConfidence) {
      reasons.push(
        `Confidence ${strategy.confidence.toFixed(2)} below minimum ${this.policy.minConfidence.toFixed(2)}`,
      );
    }
    if (metrics.quality < this.policy.minQuality) {
      reasons.push(
        `Quality ${metrics.quality.toFixed(2)} below minimum ${this.policy.minQuality.toFixed(2)}`,
      );
    }
    const missingTags = this.policy.requiredTags.filter(
      (tag) => !definition.governanceTags.includes(tag),
    );
    if (missingTags.length > 0) {
      reasons.push(
        `Missing required governance tags: ${missingTags.join(', ')}`,
      );
    }

    const complianceScore = Number(
      (
        1 -
        (Math.max(0, metrics.risk - this.policy.maxRisk) +
          Math.max(0, metrics.cost - this.policy.maxCost) +
          Math.max(0, this.policy.minConfidence - strategy.confidence) +
          Math.max(0, this.policy.minQuality - metrics.quality)) /
          4
      ).toFixed(4),
    );

    const approved = reasons.length === 0;
    const decision: GovernanceDecision = {
      strategyId: strategy.id,
      approved,
      reasons,
      metrics: {
        risk: Number(metrics.risk.toFixed(4)),
        cost: Number(metrics.cost.toFixed(4)),
        confidence: Number(strategy.confidence.toFixed(4)),
        quality: Number(metrics.quality.toFixed(4)),
        complianceScore,
      },
      timestamp: new Date(),
    };

    this.auditTrail.push(decision);
    return decision;
  }

  updatePolicy(policy: Partial<GovernancePolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  getPolicy(): GovernancePolicy {
    return { ...this.policy };
  }

  getAuditTrail(limit = 50): GovernanceDecision[] {
    return this.auditTrail.slice(-limit);
  }
}

export interface TelemetryEvent {
  type: string;
  timestamp: Date;
  payload?: Record<string, unknown>;
}

export interface TelemetrySnapshot {
  counts: Record<string, number>;
  events: TelemetryEvent[];
  explorationToExploitation: number;
  signalsPerDomain: Record<string, number>;
}

export class TelemetryPipeline {
  private readonly events: TelemetryEvent[] = [];
  private readonly counters: Record<string, number> = {};
  private readonly signalDomainCount: Record<string, number> = {};
  readonly emitter = new EventEmitter();

  record(event: string, payload?: Record<string, unknown>): void {
    this.counters[event] = (this.counters[event] ?? 0) + 1;
    if (event === 'signal.ingested' && payload?.domain) {
      const domain = String(payload.domain);
      this.signalDomainCount[domain] =
        (this.signalDomainCount[domain] ?? 0) + 1;
    }

    const telemetryEvent: TelemetryEvent = {
      type: event,
      timestamp: new Date(),
      payload,
    };
    this.events.push(telemetryEvent);
    if (this.events.length > 200) {
      this.events.shift();
    }
    this.emitter.emit(event, telemetryEvent);
  }

  getSnapshot(): TelemetrySnapshot {
    const exploration = this.counters['strategy.exploration'] ?? 0;
    const exploitation = this.counters['strategy.recommendation'] ?? 1;
    return {
      counts: { ...this.counters },
      events: this.events.slice(-25),
      explorationToExploitation: Number(
        (exploration / exploitation).toFixed(4),
      ),
      signalsPerDomain: { ...this.signalDomainCount },
    };
  }
}

export interface LearningEvaluationOptions {
  topK?: number;
  scenario?: SimulationScenario;
}

export interface StrategyEvaluation {
  recommendations: StrategyRecommendation[];
  simulation?: SimulationResult[];
}

export class MCLearningModuleService {
  constructor(
    private readonly patternFabric = new PatternIntelligenceFabric(),
    private readonly strategyLoop = new AdaptiveStrategyLoop(),
    private readonly simulationLab = new MissionControlSimulationLab(),
    private readonly governanceGate = new GovernanceGate(),
    private readonly telemetry = new TelemetryPipeline(),
  ) {}

  ingestSignal(signal: PatternSignal): DomainFeatureVector {
    const vector = this.patternFabric.ingest(signal);
    this.telemetry.record('signal.ingested', {
      domain: signal.domain,
      source: signal.source,
    });
    return vector;
  }

  registerStrategy(definition: StrategyDefinition): void {
    this.strategyLoop.registerStrategy(definition);
    this.telemetry.record('strategy.registered', { strategyId: definition.id });
  }

  listStrategies(): StrategyDefinition[] {
    return this.strategyLoop.listStrategies();
  }

  getStrategyDiagnostics(strategyId?: string): StrategyDiagnostics[] {
    const diagnostics = this.strategyLoop.getDiagnostics(strategyId);
    this.telemetry.record('strategy.diagnostics.requested', {
      scope: strategyId ?? 'all',
      count: diagnostics.length,
    });
    return diagnostics;
  }

  evaluateStrategies(
    context: StrategyContext,
    options: LearningEvaluationOptions = {},
  ): StrategyEvaluation {
    const features = this.patternFabric.getUnifiedFeatureVector();
    const recommendations = this.strategyLoop.recommendStrategies(
      context,
      features,
      options.topK ?? 3,
    );
    this.telemetry.record('strategy.recommendation', {
      missionProfile: context.missionProfile,
      count: recommendations.length,
    });

    let simulation: SimulationResult[] | undefined;
    if (options.scenario) {
      simulation = this.simulationLab.runScenario(
        recommendations,
        options.scenario,
        features,
      );
      this.telemetry.record('simulation.executed', {
        scenarioId: options.scenario.id,
        strategyCount: recommendations.length,
      });
    }

    return { recommendations, simulation };
  }

  submitFeedback(feedback: StrategyFeedback): void {
    this.strategyLoop.updateFeedback(feedback);
    this.telemetry.record(
      feedback.success
        ? 'strategy.feedback.success'
        : 'strategy.feedback.failure',
      {
        strategyId: feedback.strategyId,
        reward: feedback.reward,
      },
    );
  }

  requestDeployment(
    strategyId: string,
    feedbackMetrics: StrategyFeedback['metrics'],
    context: StrategyContext,
  ): GovernanceDecision {
    const strategies = this.evaluateStrategies(context, {
      topK: this.strategyLoop.listStrategies().length,
    });
    const recommendation = strategies.recommendations.find(
      (rec) => rec.id === strategyId,
    );
    if (!recommendation) {
      throw new Error(`Strategy ${strategyId} not evaluated for deployment`);
    }

    const definition = this.strategyLoop
      .listStrategies()
      .find((strategy) => strategy.id === strategyId);
    if (!definition) {
      throw new Error(`Strategy ${strategyId} not registered`);
    }

    const decision = this.governanceGate.evaluate(
      recommendation,
      definition,
      feedbackMetrics,
    );
    this.telemetry.record(
      decision.approved ? 'governance.approved' : 'governance.rejected',
      {
        strategyId,
        reasons: decision.reasons,
      },
    );
    return decision;
  }

  getTelemetrySnapshot(): TelemetrySnapshot {
    return this.telemetry.getSnapshot();
  }

  getPatternFabric(): PatternIntelligenceFabric {
    return this.patternFabric;
  }

  getGovernanceAudit(limit = 20): GovernanceDecision[] {
    return this.governanceGate.getAuditTrail(limit);
  }
}

export default MCLearningModuleService;
