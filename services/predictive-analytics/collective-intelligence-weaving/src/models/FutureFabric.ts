/**
 * Future Fabric Model
 * Represents the unified predictive fabric woven from multiple signal braids
 */

import { SignalBraid } from './SignalBraid.js';

export interface DivergenceZone {
  id: string;
  domain: string;
  conflictingSourceIds: string[];
  divergenceScore: number;
  recommendedAction: string;
  detectedAt: Date;
}

export interface FutureFabric {
  id: string;
  braidIds: string[];
  harmonizedPrediction: Record<string, unknown>;
  overallConfidence: number;
  consensusLevel: number;
  divergenceZones: DivergenceZone[];
  domains: string[];
  createdAt: Date;
  validUntil: Date;
}

export class FutureFabricFactory {
  static create(
    braids: SignalBraid[],
    harmonizedPrediction: Record<string, unknown>,
    horizonHours: number,
  ): FutureFabric {
    const now = new Date();
    const allDomains = new Set<string>();
    let totalCoherence = 0;

    for (const braid of braids) {
      for (const domain of braid.domains) {
        allDomains.add(domain);
      }
      totalCoherence += braid.coherence;
    }

    const avgCoherence = braids.length > 0 ? totalCoherence / braids.length : 0;

    return {
      id: crypto.randomUUID(),
      braidIds: braids.map((b) => b.id),
      harmonizedPrediction,
      overallConfidence: FutureFabricFactory.calculateOverallConfidence(
        braids,
        avgCoherence,
      ),
      consensusLevel: avgCoherence,
      divergenceZones: FutureFabricFactory.detectDivergenceZones(braids),
      domains: [...allDomains],
      createdAt: now,
      validUntil: new Date(now.getTime() + horizonHours * 3600000),
    };
  }

  static calculateOverallConfidence(
    braids: SignalBraid[],
    avgCoherence: number,
  ): number {
    if (braids.length === 0) return 0;

    // Factor in number of sources, coherence, and conflict resolution
    const sourceMultiplier = Math.min(1, braids.length / 3); // Max benefit at 3+ braids
    const conflictPenalty =
      braids.reduce((sum, b) => sum + b.conflicts.length, 0) * 0.05;

    return Math.max(
      0,
      Math.min(1, avgCoherence * sourceMultiplier - conflictPenalty),
    );
  }

  static detectDivergenceZones(braids: SignalBraid[]): DivergenceZone[] {
    const zones: DivergenceZone[] = [];
    const domainBraids = new Map<string, SignalBraid[]>();

    // Group braids by domain
    for (const braid of braids) {
      for (const domain of braid.domains) {
        const existing = domainBraids.get(domain) || [];
        domainBraids.set(domain, [...existing, braid]);
      }
    }

    // Check each domain for divergence
    for (const [domain, dBraids] of domainBraids) {
      if (dBraids.length < 2) continue;

      // Calculate divergence as inverse of average coherence
      const avgCoherence =
        dBraids.reduce((sum, b) => sum + b.coherence, 0) / dBraids.length;

      if (avgCoherence < 0.5) {
        // Significant divergence
        const conflictingSources = new Set<string>();
        for (const braid of dBraids) {
          for (const conflict of braid.conflicts) {
            // Note: Would need signal lookup for source IDs
          }
        }

        zones.push({
          id: crypto.randomUUID(),
          domain,
          conflictingSourceIds: [...conflictingSources],
          divergenceScore: 1 - avgCoherence,
          recommendedAction: FutureFabricFactory.recommendAction(1 - avgCoherence),
          detectedAt: new Date(),
        });
      }
    }

    return zones;
  }

  static recommendAction(divergenceScore: number): string {
    if (divergenceScore >= 0.8) {
      return 'CRITICAL: Seek additional expert input before proceeding';
    }
    if (divergenceScore >= 0.6) {
      return 'HIGH: Review conflicting sources and apply domain authority';
    }
    if (divergenceScore >= 0.4) {
      return 'MEDIUM: Consider temporal weighting or Bayesian fusion';
    }
    return 'LOW: Standard trust-weighted averaging should suffice';
  }

  static isValid(fabric: FutureFabric): boolean {
    return new Date() < fabric.validUntil;
  }

  static getRemainingValidity(fabric: FutureFabric): number {
    return Math.max(0, fabric.validUntil.getTime() - Date.now());
  }

  static addDivergenceZone(
    fabric: FutureFabric,
    zone: DivergenceZone,
  ): FutureFabric {
    return {
      ...fabric,
      divergenceZones: [...fabric.divergenceZones, zone],
    };
  }
}

export function getHighestConfidencePrediction(
  fabric: FutureFabric,
  domain: string,
): unknown | null {
  const prediction = fabric.harmonizedPrediction[domain];
  return prediction ?? null;
}

export function getDomainConfidence(
  fabric: FutureFabric,
  domain: string,
): number {
  const divergenceZone = fabric.divergenceZones.find((z) => z.domain === domain);
  if (divergenceZone) {
    return Math.max(0, fabric.overallConfidence * (1 - divergenceZone.divergenceScore));
  }
  return fabric.overallConfidence;
}
