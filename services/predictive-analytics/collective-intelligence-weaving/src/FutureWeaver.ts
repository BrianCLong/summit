/**
 * Future Weaver - Core Engine
 * Orchestrates the collective intelligence future weaving system
 */

import { IntelligenceSource, IntelligenceSourceFactory, RegisterSourceInput } from './models/IntelligenceSource.js';
import { PredictiveSignal, PredictiveSignalFactory, SubmitSignalInput } from './models/PredictiveSignal.js';
import { SignalBraid, SignalBraidFactory } from './models/SignalBraid.js';
import { FutureFabric } from './models/FutureFabric.js';
import { TrustScore, TrustScoreFactory } from './models/TrustScore.js';
import { SignalFuser, FusionMethod, createFuser } from './algorithms/SignalFuser.js';
import { ConflictResolver, createConflictResolver } from './algorithms/ConflictResolver.js';
import { TrustCalculator, createTrustCalculator } from './algorithms/TrustCalculator.js';
import { FabricHarmonizer, createHarmonizer, HarmonizationResult } from './algorithms/FabricHarmonizer.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('FutureWeaver');

export interface WeaverConfig {
  fusionMethod: FusionMethod;
  conflictThreshold: number;
  minSourcesRequired: number;
  trustDecayRate: number;
  temporalWeight: number;
  defaultHorizonHours: number;
}

export interface WeaveRequest {
  domains: string[];
  horizon: number;
  minSources?: number;
  fusionMethod?: FusionMethod;
}

export class FutureWeaver {
  private sources: Map<string, IntelligenceSource> = new Map();
  private signals: Map<string, PredictiveSignal> = new Map();
  private braids: Map<string, SignalBraid> = new Map();
  private fabrics: Map<string, FutureFabric> = new Map();
  private trustScores: Map<string, TrustScore> = new Map();

  private fuser: SignalFuser;
  private conflictResolver: ConflictResolver;
  private trustCalculator: TrustCalculator;
  private harmonizer: FabricHarmonizer;

  private config: WeaverConfig;

  constructor(config?: Partial<WeaverConfig>) {
    this.config = {
      fusionMethod: FusionMethod.ENSEMBLE_VOTING,
      conflictThreshold: 0.3,
      minSourcesRequired: 1,
      trustDecayRate: 0.01,
      temporalWeight: 0.1,
      defaultHorizonHours: 24,
      ...config,
    };

    this.fuser = createFuser({
      method: this.config.fusionMethod,
      minSources: this.config.minSourcesRequired,
      conflictThreshold: this.config.conflictThreshold,
      temporalWeight: this.config.temporalWeight,
    });

    this.conflictResolver = createConflictResolver({
      divergenceThreshold: this.config.conflictThreshold,
    });

    this.trustCalculator = createTrustCalculator({
      decayRate: this.config.trustDecayRate,
    });

    this.harmonizer = createHarmonizer({
      fusionMethod: this.config.fusionMethod,
      conflictThreshold: this.config.conflictThreshold,
      temporalWeight: this.config.temporalWeight,
    });

    logger.info('FutureWeaver initialized', { config: this.config });
  }

  // Source Management
  registerSource(input: RegisterSourceInput): IntelligenceSource {
    const source = IntelligenceSourceFactory.create(input);
    this.sources.set(source.id, source);

    // Initialize trust score
    const trustScore = TrustScoreFactory.create(source.id, input.initialTrust);
    this.trustScores.set(source.id, trustScore);

    logger.info('Source registered', { sourceId: source.id, name: source.name });
    return source;
  }

  getSource(sourceId: string): IntelligenceSource | undefined {
    return this.sources.get(sourceId);
  }

  getAllSources(): IntelligenceSource[] {
    return [...this.sources.values()];
  }

  deregisterSource(sourceId: string): boolean {
    const deleted = this.sources.delete(sourceId);
    this.trustScores.delete(sourceId);
    logger.info('Source deregistered', { sourceId, success: deleted });
    return deleted;
  }

  // Signal Management
  submitSignal(input: SubmitSignalInput): PredictiveSignal {
    const source = this.sources.get(input.sourceId);
    if (!source) {
      throw new Error(`Source not found: ${input.sourceId}`);
    }

    const signal = PredictiveSignalFactory.create(input);
    this.signals.set(signal.id, signal);

    // Record in trust calculator
    this.trustCalculator.recordSignal(signal);

    // Update source last signal time
    source.lastSignal = new Date();
    this.sources.set(source.id, source);

    logger.debug('Signal submitted', {
      signalId: signal.id,
      sourceId: input.sourceId,
      domain: input.domain,
    });

    return signal;
  }

  getSignal(signalId: string): PredictiveSignal | undefined {
    return this.signals.get(signalId);
  }

  getSignalsByDomain(domain: string): PredictiveSignal[] {
    return [...this.signals.values()].filter(
      (s) => s.domain === domain && !PredictiveSignalFactory.isExpired(s),
    );
  }

  invalidateSignal(signalId: string, _reason: string): boolean {
    return this.signals.delete(signalId);
  }

  // Braid Management
  createBraid(signalIds: string[]): SignalBraid {
    const signals = signalIds
      .map((id) => this.signals.get(id))
      .filter((s): s is PredictiveSignal => s !== undefined);

    if (signals.length === 0) {
      throw new Error('No valid signals for braid creation');
    }

    const braid = SignalBraidFactory.create(signals);
    this.braids.set(braid.id, braid);

    logger.debug('Braid created', {
      braidId: braid.id,
      signalCount: signals.length,
    });

    return braid;
  }

  getBraid(braidId: string): SignalBraid | undefined {
    return this.braids.get(braidId);
  }

  getBraidsByDomain(domain: string): SignalBraid[] {
    return [...this.braids.values()].filter((b) =>
      b.domains.includes(domain),
    );
  }

  // Trust Management
  getTrustScore(sourceId: string): TrustScore | undefined {
    return this.trustScores.get(sourceId);
  }

  getAllTrustScores(): TrustScore[] {
    return [...this.trustScores.values()];
  }

  updateTrust(
    sourceId: string,
    adjustment: number,
    reason: string,
  ): TrustScore {
    let score = this.trustScores.get(sourceId);
    if (!score) {
      score = TrustScoreFactory.create(sourceId);
    }

    score = TrustScoreFactory.manualAdjustment(score, adjustment, reason);
    this.trustScores.set(sourceId, score);

    logger.info('Trust updated', { sourceId, adjustment, reason });
    return score;
  }

  verifyPrediction(
    sourceId: string,
    signalId: string,
    actualValue: unknown,
    wasAccurate: boolean,
  ): TrustScore {
    this.trustCalculator.verifyPrediction(
      sourceId,
      signalId,
      actualValue,
      wasAccurate,
    );

    const score = this.trustCalculator.calculateTrustScore(
      sourceId,
      this.trustScores.get(sourceId),
    );
    this.trustScores.set(sourceId, score);

    return score;
  }

  // Weaving
  weaveFuture(request: WeaveRequest): HarmonizationResult {
    logger.info('Weaving future', { domains: request.domains, horizon: request.horizon });

    // Collect signals for requested domains
    const relevantSignals: PredictiveSignal[] = [];
    for (const domain of request.domains) {
      relevantSignals.push(...this.getSignalsByDomain(domain));
    }

    if (relevantSignals.length === 0) {
      throw new Error('No signals available for requested domains');
    }

    // Create braids from signals grouped by domain
    const domainGroups = new Map<string, PredictiveSignal[]>();
    for (const signal of relevantSignals) {
      const existing = domainGroups.get(signal.domain) || [];
      domainGroups.set(signal.domain, [...existing, signal]);
    }

    const braids: SignalBraid[] = [];
    for (const [_domain, signals] of domainGroups) {
      if (signals.length > 0) {
        const braid = SignalBraidFactory.create(signals);
        this.braids.set(braid.id, braid);
        braids.push(braid);
      }
    }

    // Harmonize braids into fabric
    const result = this.harmonizer.harmonize(
      braids,
      this.signals,
      this.sources,
      this.trustScores,
      request.horizon || this.config.defaultHorizonHours,
    );

    // Store the fabric
    this.fabrics.set(result.fabric.id, result.fabric);

    logger.info('Future woven', {
      fabricId: result.fabric.id,
      domains: result.fabric.domains,
      confidence: result.fabric.overallConfidence,
    });

    return result;
  }

  getFabric(fabricId: string): FutureFabric | undefined {
    return this.fabrics.get(fabricId);
  }

  getFabricByDomain(domain: string): FutureFabric | undefined {
    return [...this.fabrics.values()]
      .filter((f) => f.domains.includes(domain))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  // Conflict Resolution
  getConflicts(domain?: string): Array<{ braid: SignalBraid; conflicts: number }> {
    const braidsWithConflicts: Array<{ braid: SignalBraid; conflicts: number }> = [];

    for (const braid of this.braids.values()) {
      if (domain && !braid.domains.includes(domain)) continue;
      if (braid.conflicts.length > 0 || braid.coherence < 0.5) {
        braidsWithConflicts.push({
          braid,
          conflicts: braid.conflicts.length || 1,
        });
      }
    }

    return braidsWithConflicts;
  }

  // Statistics
  getStatistics(): {
    sources: number;
    activeSignals: number;
    braids: number;
    fabrics: number;
    averageTrust: number;
  } {
    const activeSignals = [...this.signals.values()].filter(
      (s) => !PredictiveSignalFactory.isExpired(s),
    ).length;

    const trustValues = [...this.trustScores.values()].map(
      (t) => t.overallScore,
    );
    const averageTrust =
      trustValues.length > 0
        ? trustValues.reduce((a, b) => a + b, 0) / trustValues.length
        : 0;

    return {
      sources: this.sources.size,
      activeSignals,
      braids: this.braids.size,
      fabrics: this.fabrics.size,
      averageTrust,
    };
  }

  // Cleanup
  cleanupExpiredSignals(): number {
    let removed = 0;
    for (const [id, signal] of this.signals) {
      if (PredictiveSignalFactory.isExpired(signal)) {
        this.signals.delete(id);
        removed++;
      }
    }
    logger.info('Cleanup completed', { removedSignals: removed });
    return removed;
  }
}

export function createFutureWeaver(config?: Partial<WeaverConfig>): FutureWeaver {
  return new FutureWeaver(config);
}
