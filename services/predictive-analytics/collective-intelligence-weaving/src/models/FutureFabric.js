"use strict";
/**
 * Future Fabric Model
 * Represents the unified predictive fabric woven from multiple signal braids
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FutureFabricFactory = void 0;
exports.getHighestConfidencePrediction = getHighestConfidencePrediction;
exports.getDomainConfidence = getDomainConfidence;
class FutureFabricFactory {
    static create(braids, harmonizedPrediction, horizonHours) {
        const now = new Date();
        const allDomains = new Set();
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
            overallConfidence: FutureFabricFactory.calculateOverallConfidence(braids, avgCoherence),
            consensusLevel: avgCoherence,
            divergenceZones: FutureFabricFactory.detectDivergenceZones(braids),
            domains: [...allDomains],
            createdAt: now,
            validUntil: new Date(now.getTime() + horizonHours * 3600000),
        };
    }
    static calculateOverallConfidence(braids, avgCoherence) {
        if (braids.length === 0)
            return 0;
        // Factor in number of sources, coherence, and conflict resolution
        const sourceMultiplier = Math.min(1, braids.length / 3); // Max benefit at 3+ braids
        const conflictPenalty = braids.reduce((sum, b) => sum + b.conflicts.length, 0) * 0.05;
        return Math.max(0, Math.min(1, avgCoherence * sourceMultiplier - conflictPenalty));
    }
    static detectDivergenceZones(braids) {
        const zones = [];
        const domainBraids = new Map();
        // Group braids by domain
        for (const braid of braids) {
            for (const domain of braid.domains) {
                const existing = domainBraids.get(domain) || [];
                domainBraids.set(domain, [...existing, braid]);
            }
        }
        // Check each domain for divergence
        for (const [domain, dBraids] of domainBraids) {
            if (dBraids.length < 2)
                continue;
            // Calculate divergence as inverse of average coherence
            const avgCoherence = dBraids.reduce((sum, b) => sum + b.coherence, 0) / dBraids.length;
            if (avgCoherence < 0.5) {
                // Significant divergence
                const conflictingSources = new Set();
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
    static recommendAction(divergenceScore) {
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
    static isValid(fabric) {
        return new Date() < fabric.validUntil;
    }
    static getRemainingValidity(fabric) {
        return Math.max(0, fabric.validUntil.getTime() - Date.now());
    }
    static addDivergenceZone(fabric, zone) {
        return {
            ...fabric,
            divergenceZones: [...fabric.divergenceZones, zone],
        };
    }
}
exports.FutureFabricFactory = FutureFabricFactory;
function getHighestConfidencePrediction(fabric, domain) {
    const prediction = fabric.harmonizedPrediction[domain];
    return prediction ?? null;
}
function getDomainConfidence(fabric, domain) {
    const divergenceZone = fabric.divergenceZones.find((z) => z.domain === domain);
    if (divergenceZone) {
        return Math.max(0, fabric.overallConfidence * (1 - divergenceZone.divergenceScore));
    }
    return fabric.overallConfidence;
}
