"use strict";
/**
 * Fabric Harmonizer Algorithm
 * Harmonizes multiple signal braids into a unified future fabric
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FabricHarmonizer = void 0;
exports.createHarmonizer = createHarmonizer;
exports.mergeFabrics = mergeFabrics;
const FutureFabric_js_1 = require("../models/FutureFabric.js");
const SignalFuser_js_1 = require("./SignalFuser.js");
const ConflictResolver_js_1 = require("./ConflictResolver.js");
class FabricHarmonizer {
    fuser;
    conflictResolver;
    config;
    constructor(config) {
        this.config = {
            fusionMethod: SignalFuser_js_1.FusionMethod.ENSEMBLE_VOTING,
            conflictThreshold: 0.3,
            minBraids: 1,
            temporalWeight: 0.1,
            domainPriorities: new Map(),
            ...config,
        };
        this.fuser = new SignalFuser_js_1.SignalFuser({
            method: this.config.fusionMethod,
            minSources: 1,
            conflictThreshold: this.config.conflictThreshold,
            temporalWeight: this.config.temporalWeight,
        });
        this.conflictResolver = new ConflictResolver_js_1.ConflictResolver({
            divergenceThreshold: this.config.conflictThreshold,
            requireExpertForHighConflict: true,
            highConflictThreshold: 0.7,
        });
    }
    harmonize(braids, signals, sources, trustScores, horizonHours) {
        const warnings = [];
        if (braids.length < this.config.minBraids) {
            warnings.push(`Insufficient braids: ${braids.length} < ${this.config.minBraids}`);
        }
        // Group signals by domain across all braids
        const domainSignals = new Map();
        for (const braid of braids) {
            for (const signalId of braid.signalIds) {
                const signal = signals.get(signalId);
                if (!signal)
                    continue;
                const existing = domainSignals.get(signal.domain) || [];
                domainSignals.set(signal.domain, [...existing, signal]);
            }
        }
        // Harmonize each domain
        const harmonizedPrediction = {};
        let resolvedConflicts = 0;
        for (const [domain, dSignals] of domainSignals) {
            // Check for conflicts
            const conflictResult = this.conflictResolver.detectConflicts(dSignals);
            if (conflictResult.hasConflict) {
                // Resolve conflicts
                const resolution = this.conflictResolver.resolve(conflictResult.conflictingSignals, conflictResult.suggestedMethod, sources, trustScores);
                harmonizedPrediction[domain] = resolution.resolvedValue;
                resolvedConflicts++;
            }
            else {
                // Fuse signals
                const fusionResult = this.fuser.fuse(dSignals, sources, trustScores);
                harmonizedPrediction[domain] = fusionResult.fusedPrediction;
            }
        }
        // Create the fabric
        const fabric = FutureFabric_js_1.FutureFabricFactory.create(braids, harmonizedPrediction, horizonHours);
        // Calculate harmonization quality
        const harmonizationQuality = this.calculateQuality(braids, fabric, resolvedConflicts);
        return {
            fabric,
            harmonizationQuality,
            processedBraids: braids.length,
            resolvedConflicts,
            warnings,
        };
    }
    calculateQuality(braids, fabric, resolvedConflicts) {
        // Quality factors:
        // 1. Average braid coherence
        const avgCoherence = braids.reduce((sum, b) => sum + b.coherence, 0) / braids.length;
        // 2. Domain coverage
        const domainCoverage = Math.min(1, fabric.domains.length / 5); // Normalize to 5 domains
        // 3. Conflict resolution rate
        const totalConflicts = braids.reduce((sum, b) => sum + b.conflicts.length, 0);
        const resolutionRate = totalConflicts > 0 ? resolvedConflicts / (totalConflicts + resolvedConflicts) : 1;
        // 4. Divergence penalty
        const divergencePenalty = fabric.divergenceZones.reduce((sum, z) => sum + z.divergenceScore, 0) /
            Math.max(fabric.divergenceZones.length, 1);
        return (avgCoherence * 0.4 +
            domainCoverage * 0.2 +
            resolutionRate * 0.2 +
            (1 - divergencePenalty) * 0.2);
    }
    addDomainPriority(domain, priority) {
        this.config.domainPriorities.set(domain, priority);
    }
    getDomainPriority(domain) {
        return this.config.domainPriorities.get(domain) ?? 1.0;
    }
    reharmonize(fabric, newBraids, signals, sources, trustScores) {
        // Get existing braids and combine with new
        const allBraidIds = new Set([...fabric.braidIds, ...newBraids.map((b) => b.id)]);
        const allBraids = newBraids; // In production, fetch existing braids by ID
        // Recalculate validity
        const remainingValidity = (fabric.validUntil.getTime() - Date.now()) / 3600000;
        return this.harmonize(allBraids, signals, sources, trustScores, Math.max(remainingValidity, 1));
    }
}
exports.FabricHarmonizer = FabricHarmonizer;
function createHarmonizer(config) {
    return new FabricHarmonizer(config);
}
function mergeFabrics(fabrics, strategy = 'merge') {
    if (fabrics.length === 0) {
        throw new Error('No fabrics to merge');
    }
    if (fabrics.length === 1) {
        return fabrics[0];
    }
    switch (strategy) {
        case 'latest':
            return fabrics.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        case 'highest_confidence':
            return fabrics.sort((a, b) => b.overallConfidence - a.overallConfidence)[0];
        case 'merge':
        default:
            // Merge harmonized predictions
            const mergedPrediction = {};
            const mergedDomains = new Set();
            const mergedDivergenceZones = [];
            for (const fabric of fabrics) {
                for (const domain of fabric.domains) {
                    mergedDomains.add(domain);
                }
                Object.assign(mergedPrediction, fabric.harmonizedPrediction);
                mergedDivergenceZones.push(...fabric.divergenceZones);
            }
            const avgConfidence = fabrics.reduce((sum, f) => sum + f.overallConfidence, 0) /
                fabrics.length;
            const latestValidity = new Date(Math.max(...fabrics.map((f) => f.validUntil.getTime())));
            return {
                id: crypto.randomUUID(),
                braidIds: fabrics.flatMap((f) => f.braidIds),
                harmonizedPrediction: mergedPrediction,
                overallConfidence: avgConfidence,
                consensusLevel: fabrics.reduce((sum, f) => sum + f.consensusLevel, 0) /
                    fabrics.length,
                divergenceZones: mergedDivergenceZones,
                domains: [...mergedDomains],
                createdAt: new Date(),
                validUntil: latestValidity,
            };
    }
}
