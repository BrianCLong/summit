/**
 * Fabric Harmonizer Algorithm
 * Harmonizes multiple signal braids into a unified future fabric
 */

import { SignalBraid } from '../models/SignalBraid.js';
import { FutureFabric, FutureFabricFactory, DivergenceZone } from '../models/FutureFabric.js';
import { PredictiveSignal } from '../models/PredictiveSignal.js';
import { IntelligenceSource } from '../models/IntelligenceSource.js';
import { TrustScore } from '../models/TrustScore.js';
import { SignalFuser, FusionMethod, FusionConfig } from './SignalFuser.js';
import { ConflictResolver } from './ConflictResolver.js';

export interface HarmonizerConfig {
  fusionMethod: FusionMethod;
  conflictThreshold: number;
  minBraids: number;
  temporalWeight: number;
  domainPriorities: Map<string, number>;
}

export interface HarmonizationResult {
  fabric: FutureFabric;
  harmonizationQuality: number;
  processedBraids: number;
  resolvedConflicts: number;
  warnings: string[];
}

export class FabricHarmonizer {
  private fuser: SignalFuser;
  private conflictResolver: ConflictResolver;
  private config: HarmonizerConfig;

  constructor(config?: Partial<HarmonizerConfig>) {
    this.config = {
      fusionMethod: FusionMethod.ENSEMBLE_VOTING,
      conflictThreshold: 0.3,
      minBraids: 1,
      temporalWeight: 0.1,
      domainPriorities: new Map(),
      ...config,
    };

    this.fuser = new SignalFuser({
      method: this.config.fusionMethod,
      minSources: 1,
      conflictThreshold: this.config.conflictThreshold,
      temporalWeight: this.config.temporalWeight,
    });

    this.conflictResolver = new ConflictResolver({
      divergenceThreshold: this.config.conflictThreshold,
      requireExpertForHighConflict: true,
      highConflictThreshold: 0.7,
    });
  }

  harmonize(
    braids: SignalBraid[],
    signals: Map<string, PredictiveSignal>,
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
    horizonHours: number,
  ): HarmonizationResult {
    const warnings: string[] = [];

    if (braids.length < this.config.minBraids) {
      warnings.push(
        `Insufficient braids: ${braids.length} < ${this.config.minBraids}`,
      );
    }

    // Group signals by domain across all braids
    const domainSignals = new Map<string, PredictiveSignal[]>();
    for (const braid of braids) {
      for (const signalId of braid.signalIds) {
        const signal = signals.get(signalId);
        if (!signal) continue;

        const existing = domainSignals.get(signal.domain) || [];
        domainSignals.set(signal.domain, [...existing, signal]);
      }
    }

    // Harmonize each domain
    const harmonizedPrediction: Record<string, unknown> = {};
    let resolvedConflicts = 0;

    for (const [domain, dSignals] of domainSignals) {
      // Check for conflicts
      const conflictResult = this.conflictResolver.detectConflicts(dSignals);

      if (conflictResult.hasConflict) {
        // Resolve conflicts
        const resolution = this.conflictResolver.resolve(
          conflictResult.conflictingSignals,
          conflictResult.suggestedMethod,
          sources,
          trustScores,
        );
        harmonizedPrediction[domain] = resolution.resolvedValue;
        resolvedConflicts++;
      } else {
        // Fuse signals
        const fusionResult = this.fuser.fuse(dSignals, sources, trustScores);
        harmonizedPrediction[domain] = fusionResult.fusedPrediction;
      }
    }

    // Create the fabric
    const fabric = FutureFabricFactory.create(
      braids,
      harmonizedPrediction,
      horizonHours,
    );

    // Calculate harmonization quality
    const harmonizationQuality = this.calculateQuality(
      braids,
      fabric,
      resolvedConflicts,
    );

    return {
      fabric,
      harmonizationQuality,
      processedBraids: braids.length,
      resolvedConflicts,
      warnings,
    };
  }

  private calculateQuality(
    braids: SignalBraid[],
    fabric: FutureFabric,
    resolvedConflicts: number,
  ): number {
    // Quality factors:
    // 1. Average braid coherence
    const avgCoherence =
      braids.reduce((sum, b) => sum + b.coherence, 0) / braids.length;

    // 2. Domain coverage
    const domainCoverage = Math.min(1, fabric.domains.length / 5); // Normalize to 5 domains

    // 3. Conflict resolution rate
    const totalConflicts = braids.reduce(
      (sum, b) => sum + b.conflicts.length,
      0,
    );
    const resolutionRate =
      totalConflicts > 0 ? resolvedConflicts / (totalConflicts + resolvedConflicts) : 1;

    // 4. Divergence penalty
    const divergencePenalty =
      fabric.divergenceZones.reduce((sum, z) => sum + z.divergenceScore, 0) /
      Math.max(fabric.divergenceZones.length, 1);

    return (
      avgCoherence * 0.4 +
      domainCoverage * 0.2 +
      resolutionRate * 0.2 +
      (1 - divergencePenalty) * 0.2
    );
  }

  addDomainPriority(domain: string, priority: number): void {
    this.config.domainPriorities.set(domain, priority);
  }

  getDomainPriority(domain: string): number {
    return this.config.domainPriorities.get(domain) ?? 1.0;
  }

  reharmonize(
    fabric: FutureFabric,
    newBraids: SignalBraid[],
    signals: Map<string, PredictiveSignal>,
    sources: Map<string, IntelligenceSource>,
    trustScores: Map<string, TrustScore>,
  ): HarmonizationResult {
    // Get existing braids and combine with new
    const allBraidIds = new Set([...fabric.braidIds, ...newBraids.map((b) => b.id)]);
    const allBraids = newBraids; // In production, fetch existing braids by ID

    // Recalculate validity
    const remainingValidity =
      (fabric.validUntil.getTime() - Date.now()) / 3600000;

    return this.harmonize(
      allBraids,
      signals,
      sources,
      trustScores,
      Math.max(remainingValidity, 1),
    );
  }
}

export function createHarmonizer(
  config?: Partial<HarmonizerConfig>,
): FabricHarmonizer {
  return new FabricHarmonizer(config);
}

export function mergeFabrics(
  fabrics: FutureFabric[],
  strategy: 'latest' | 'highest_confidence' | 'merge' = 'merge',
): FutureFabric {
  if (fabrics.length === 0) {
    throw new Error('No fabrics to merge');
  }

  if (fabrics.length === 1) {
    return fabrics[0];
  }

  switch (strategy) {
    case 'latest':
      return fabrics.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

    case 'highest_confidence':
      return fabrics.sort((a, b) => b.overallConfidence - a.overallConfidence)[0];

    case 'merge':
    default:
      // Merge harmonized predictions
      const mergedPrediction: Record<string, unknown> = {};
      const mergedDomains = new Set<string>();
      const mergedDivergenceZones: DivergenceZone[] = [];

      for (const fabric of fabrics) {
        for (const domain of fabric.domains) {
          mergedDomains.add(domain);
        }
        Object.assign(mergedPrediction, fabric.harmonizedPrediction);
        mergedDivergenceZones.push(...fabric.divergenceZones);
      }

      const avgConfidence =
        fabrics.reduce((sum, f) => sum + f.overallConfidence, 0) /
        fabrics.length;

      const latestValidity = new Date(
        Math.max(...fabrics.map((f) => f.validUntil.getTime())),
      );

      return {
        id: crypto.randomUUID(),
        braidIds: fabrics.flatMap((f) => f.braidIds),
        harmonizedPrediction: mergedPrediction,
        overallConfidence: avgConfidence,
        consensusLevel:
          fabrics.reduce((sum, f) => sum + f.consensusLevel, 0) /
          fabrics.length,
        divergenceZones: mergedDivergenceZones,
        domains: [...mergedDomains],
        createdAt: new Date(),
        validUntil: latestValidity,
      };
  }
}
