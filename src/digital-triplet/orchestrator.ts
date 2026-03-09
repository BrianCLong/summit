import { PolicyAgent } from './agents/policy.js';
import { SafetySentinel } from './agents/safety.js';
import { AdversarialScanner } from './adversarial.js';
import { ActionConsensusEngine } from './consensus.js';
import { CohesionEngine } from './cohesion.js';
import { EntropyCalibrator } from './entropy.js';
import { AntifragilityEngine } from './antifragility.js';
import { ProvenanceAttestor } from './attestation.js';
import { FusionEngine } from './fusion.js';
import { ResilienceForecaster } from './forecaster.js';
import { RecoveryPlanner } from './recovery.js';
import { StabilityAnalyzer } from './stability.js';
import { TripletRegistry } from './registry.js';
import {
  CognitiveSignal,
  DigitalSignal,
  FeedbackAction,
  IntentResolution,
  ConsensusResult,
  MetricsSink,
  LayerSignal,
  PhysicalSignal,
  RecoveryPlan,
  TripletDefinition,
  TripletState,
} from './types.js';
import { NoopMetricsSink } from './metrics.js';
import { VolatilityScanner } from './volatility.js';

interface OrchestratorOptions {
  readonly driftDecay: number;
  readonly resilienceDecay: number;
  readonly policy: {
    readonly driftThreshold: number;
    readonly resilienceFloor: number;
  };
  readonly safety?: {
    readonly shockThreshold: number;
    readonly anomalyWindow: number;
  };
  readonly fusionSalt?: string;
  readonly metricsSink?: MetricsSink;
}

export class TripletOrchestrator {
  private readonly registry = new TripletRegistry();
  private readonly policyAgent: PolicyAgent;
  private readonly safety: SafetySentinel;
  private readonly adversarial = new AdversarialScanner();
  private readonly cohesion = new CohesionEngine();
  private readonly entropy = new EntropyCalibrator();
  private readonly antifragility = new AntifragilityEngine();
  private readonly attestor = new ProvenanceAttestor();
  private readonly fusion: FusionEngine;
  private readonly forecaster = new ResilienceForecaster();
  private readonly recovery = new RecoveryPlanner();
  private readonly consensus = new ActionConsensusEngine();
  private readonly stability = new StabilityAnalyzer();
  private readonly volatility = new VolatilityScanner();
  private readonly metrics: MetricsSink;

  constructor(private readonly options: OrchestratorOptions) {
    this.policyAgent = new PolicyAgent(options.policy);
    this.safety = new SafetySentinel(
      options.safety ?? { shockThreshold: 50, anomalyWindow: 4 },
    );
    this.fusion = new FusionEngine(options.fusionSalt);
    this.metrics = options.metricsSink ?? new NoopMetricsSink();
  }

  registerTriplet(definition: TripletDefinition): TripletState {
    const state = this.registry.register(definition);
    this.metrics.record({ type: 'triplet-registered', tripletId: definition.id, at: Date.now() });
    return state;
  }

  ingestPhysicalSignal(tripletId: string, signal: PhysicalSignal): TripletState {
    const nextState = this.registry.updateState(tripletId, (state) => ({
      ...state,
      lastPhysical: signal,
      driftScore: this.applyDrift(state.driftScore, signal.metrics),
    }));
    this.metrics.record({
      type: 'signal-ingested',
      tripletId,
      at: signal.timestamp,
      attributes: { layer: 'physical' },
    });
    return nextState;
  }

  advanceDigitalModel(tripletId: string, signal: DigitalSignal): TripletState {
    const nextState = this.registry.updateState(tripletId, (state) => ({
      ...state,
      lastDigital: signal,
      resilienceScore: this.applyResilience(state.resilienceScore),
    }));
    this.metrics.record({
      type: 'signal-ingested',
      tripletId,
      at: signal.timestamp,
      attributes: { layer: 'digital' },
    });
    return nextState;
  }

  applyCognitiveIntent(tripletId: string, signal: CognitiveSignal): TripletState {
    const nextState = this.registry.updateState(tripletId, (state) => ({
      ...state,
      lastCognitive: signal,
      resilienceScore: Math.min(1.5, state.resilienceScore + signal.confidence * 0.05),
    }));
    this.metrics.record({
      type: 'signal-ingested',
      tripletId,
      at: signal.timestamp,
      attributes: { layer: 'cognitive' },
    });
    return nextState;
  }

  cycleCognitive(tripletId: string): IntentResolution {
    const state = this.registry.getState(tripletId);
    if (!state) {
      throw new Error(`Triplet ${tripletId} not found`);
    }
    const resolution = this.policyAgent.evaluate(state);
    this.metrics.record({
      type: 'policy-evaluation',
      tripletId,
      at: Date.now(),
      attributes: { driftScore: state.driftScore, resilienceScore: state.resilienceScore },
    });
    const cognitive: CognitiveSignal = {
      type: 'cognitive',
      agentId: 'policy-agent',
      timestamp: Date.now(),
      intent: 'stabilize',
      recommendations: resolution.nextActions.map((action) => action.summary),
      confidence: resolution.nextActions.length === 0 ? 0.5 : 0.9,
    };
    this.applyCognitiveIntent(tripletId, cognitive);
    return resolution;
  }

  tick(tripletId: string, signals: LayerSignal[]): { state: TripletState; actions: FeedbackAction[] } {
    const definition = this.registry.getDefinition(tripletId);
    if (!definition) {
      throw new Error(`Triplet ${tripletId} not found`);
    }

    let currentState = this.registry.getState(tripletId);
    if (!currentState) {
      currentState = this.registry.register(definition);
    }

    signals.forEach((signal) => {
      if (signal.type === 'physical') {
        currentState = this.ingestPhysicalSignal(tripletId, signal);
      } else if (signal.type === 'digital') {
        currentState = this.advanceDigitalModel(tripletId, signal);
      } else {
        currentState = this.applyCognitiveIntent(tripletId, signal);
      }
    });

    const safetyActions = this.safety.guard(currentState, signals);
    const adversarial = this.adversarial.scan(tripletId, signals, this.registry.getState(tripletId) as TripletState);
    if (adversarial.findings > 0) {
      this.metrics.record({
        type: 'adversary-detected',
        tripletId,
        at: Date.now(),
        attributes: { score: adversarial.score, findings: adversarial.findings },
      });
    }
    const cognitive = this.cycleCognitive(tripletId);
    const fused = this.alignFusion(tripletId);
    const attestation = this.attest(tripletId, signals);

    const volatilityScore = this.volatility.scan(tripletId, signals, currentState);
    const cohesionScore = this.cohesion.compute(signals, this.registry.getState(tripletId) as TripletState);
    const entropyScore = this.entropy.measure(tripletId, signals, this.registry.getState(tripletId) as TripletState);
    this.metrics.record({
      type: 'cohesion-updated',
      tripletId,
      at: Date.now(),
      attributes: { cohesion: cohesionScore },
    });
    this.metrics.record({
      type: 'entropy-updated',
      tripletId,
      at: Date.now(),
      attributes: { entropy: entropyScore },
    });
    const recoveryPlan = this.prepareRecovery(this.registry.getState(tripletId) as TripletState, {
      cohesionScore,
      volatilityScore,
      entropyScore,
    });

    const consensus = this.applyConsensus(
      tripletId,
      fused.intentBudget,
      [...safetyActions, ...adversarial.actions, ...cognitive.nextActions, ...recoveryPlan.actions],
      safetyActions.length,
    );

    const antifragilityIndex = this.antifragility.score(
      this.registry.getState(tripletId) as TripletState,
      volatilityScore,
      recoveryPlan.readiness,
    );
    this.metrics.record({
      type: 'antifragility-updated',
      tripletId,
      at: Date.now(),
      attributes: { antifragility: antifragilityIndex },
    });

    const healthIndex = this.stability.assess(
      this.registry.getState(tripletId) as TripletState,
      volatilityScore,
      consensus.actions.length,
      cohesionScore,
      entropyScore,
      recoveryPlan.readiness,
    );

    const auditedState = this.registry.updateState(tripletId, (state) => ({
      ...state,
      volatilityScore,
      cohesionScore,
      entropyScore,
      recoveryReadiness: recoveryPlan.readiness,
      adversarialFindings: adversarial.findings,
      antifragilityIndex,
      assuranceScore: attestation.assurance,
      provenanceHash: attestation.hash,
      healthIndex,
      lastAuditAt: Date.now(),
    }));

    if (safetyActions.length > 0) {
      this.metrics.record({
        type: 'anomaly-detected',
        tripletId,
        at: Date.now(),
        attributes: { anomalies: safetyActions.length },
      });
    }

    if (consensus.actions.length > 0) {
      this.metrics.record({
        type: 'feedback-emitted',
        tripletId,
        at: Date.now(),
        attributes: { actions: consensus.actions.length },
      });
    }

    this.metrics.record({
      type: 'state-audited',
      tripletId,
      at: auditedState.lastAuditAt,
      attributes: {
        volatility: volatilityScore,
        health: healthIndex,
        cohesion: cohesionScore,
        entropy: entropyScore,
        recovery: recoveryPlan.readiness,
        adversarial: adversarial.score,
        antifragility: antifragilityIndex,
        assurance: attestation.assurance,
      },
    });

    return { state: auditedState, actions: consensus.actions };
  }

  getDefinition(tripletId: string): TripletDefinition | undefined {
    return this.registry.getDefinition(tripletId);
  }

  getState(tripletId: string): TripletState | undefined {
    return this.registry.getState(tripletId);
  }

  private applyDrift(currentDrift: number, metrics: Record<string, number>): number {
    const meanDeviation =
      Object.values(metrics).reduce((acc, value) => acc + Math.abs(value), 0) /
      Math.max(1, Object.keys(metrics).length);
    const next = currentDrift * this.options.driftDecay + meanDeviation * 0.01;
    return Math.min(5, Number(next.toFixed(4)));
  }

  private applyResilience(resilience: number): number {
    const next = resilience * this.options.resilienceDecay + 0.01;
    return Math.min(2, Number(next.toFixed(4)));
  }

  private attest(tripletId: string, signals: LayerSignal[]): { hash: string; assurance: number } {
    const state = this.registry.getState(tripletId);
    if (!state) {
      throw new Error(`Triplet ${tripletId} not found`);
    }
    const result = this.attestor.attest(tripletId, state, signals);
    this.metrics.record({
      type: 'attestation-updated',
      tripletId,
      at: Date.now(),
      attributes: { assurance: result.assurance },
    });
    this.metrics.record({
      type: 'assurance-updated',
      tripletId,
      at: Date.now(),
      attributes: { assurance: result.assurance },
    });
    return result;
  }

  private alignFusion(tripletId: string): TripletState {
    const state = this.registry.getState(tripletId);
    if (!state) {
      throw new Error(`Triplet ${tripletId} not found`);
    }
    const fusionSignature = this.fusion.compute(state);
    const resilienceForecast = this.forecaster.update(state);
    const nextState = this.registry.updateState(tripletId, (current) => ({
      ...current,
      fusionSignature,
      resilienceForecast,
    }));
    this.metrics.record({
      type: 'fusion-updated',
      tripletId,
      at: Date.now(),
      attributes: { forecast: resilienceForecast },
    });
    return nextState;
  }

  private applyConsensus(
    tripletId: string,
    budget: number,
    actions: FeedbackAction[],
    anomalyCount: number,
  ): ConsensusResult {
    const consensus = this.consensus.merge(budget, actions);
    const enriched = consensus.actions.map((action) => ({
      ...action,
      alignmentToken: action.alignmentToken ?? this.fusion.compute(this.registry.getState(tripletId) as TripletState),
    }));

    this.registry.updateState(tripletId, (state) => ({
      ...state,
      intentBudget: consensus.remainingBudget,
      anomalyCount,
    }));

    this.metrics.record({
      type: 'consensus-formed',
      tripletId,
      at: Date.now(),
      attributes: { actions: enriched.length, budget: consensus.remainingBudget },
    });

    return { actions: enriched, remainingBudget: consensus.remainingBudget };
  }

  private prepareRecovery(
    state: TripletState,
    context: { cohesionScore: number; volatilityScore: number; entropyScore: number },
  ): RecoveryPlan {
    const plan = this.recovery.plan(state, context);
    this.metrics.record({
      type: 'recovery-prepared',
      tripletId: state.id,
      at: Date.now(),
      attributes: {
        readiness: plan.readiness,
        entropy: context.entropyScore,
        cohesion: context.cohesionScore,
        volatility: context.volatilityScore,
      },
    });
    return plan;
  }
}
