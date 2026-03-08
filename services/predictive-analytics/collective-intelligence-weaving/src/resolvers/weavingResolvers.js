"use strict";
/**
 * GraphQL Resolvers for Collective Intelligence Future Weaving
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.weavingResolvers = void 0;
const FutureWeaver_js_1 = require("../FutureWeaver.js");
const SignalFuser_js_1 = require("../algorithms/SignalFuser.js");
// Singleton weaver instance
let weaver = null;
function getWeaver() {
    if (!weaver) {
        weaver = (0, FutureWeaver_js_1.createFutureWeaver)();
    }
    return weaver;
}
exports.weavingResolvers = {
    Query: {
        getFutureFabric: (_parent, args) => {
            const w = getWeaver();
            const fabric = w.getFabricByDomain(args.domain);
            if (!fabric) {
                // Try to weave a new fabric
                const result = w.weaveFuture({
                    domains: [args.domain],
                    horizon: args.horizon || 24,
                });
                return result.fabric;
            }
            if (args.minConfidence &&
                fabric.overallConfidence < args.minConfidence) {
                throw new Error(`Fabric confidence ${fabric.overallConfidence} below threshold ${args.minConfidence}`);
            }
            return fabric;
        },
        getBraid: (_parent, args) => {
            const w = getWeaver();
            const braid = w.getBraid(args.braidId);
            if (!braid) {
                throw new Error(`Braid not found: ${args.braidId}`);
            }
            return braid;
        },
        getBraids: (_parent, args) => {
            const w = getWeaver();
            let braids = w.getBraidsByDomain(args.domain);
            if (args.offset) {
                braids = braids.slice(args.offset);
            }
            if (args.limit) {
                braids = braids.slice(0, args.limit);
            }
            return braids;
        },
        getTrustScores: (_parent, args) => {
            const w = getWeaver();
            let scores = w.getAllTrustScores();
            if (args.sourceType) {
                const sources = w.getAllSources();
                const sourceIds = sources
                    .filter((s) => s.type === args.sourceType)
                    .map((s) => s.id);
                scores = scores.filter((s) => sourceIds.includes(s.sourceId));
            }
            if (args.minScore !== undefined) {
                scores = scores.filter((s) => s.overallScore >= args.minScore);
            }
            return scores;
        },
        getSourceTrust: (_parent, args) => {
            const w = getWeaver();
            const score = w.getTrustScore(args.sourceId);
            if (!score) {
                throw new Error(`Trust score not found for source: ${args.sourceId}`);
            }
            return score;
        },
        getConflicts: (_parent, args) => {
            const w = getWeaver();
            const conflicts = w.getConflicts(args.domain);
            // Filter by divergence if specified
            return conflicts
                .filter((c) => {
                if (args.minDivergence && c.braid.coherence > 1 - args.minDivergence) {
                    return false;
                }
                if (args.unresolved && c.braid.conflicts.length > 0) {
                    return false;
                }
                return true;
            })
                .flatMap((c) => c.braid.conflicts);
        },
        getSources: (_parent, args) => {
            const w = getWeaver();
            let sources = w.getAllSources();
            if (args.type) {
                sources = sources.filter((s) => s.type === args.type);
            }
            if (args.minTrust !== undefined) {
                const scores = w.getAllTrustScores();
                const trustedIds = scores
                    .filter((s) => s.overallScore >= args.minTrust)
                    .map((s) => s.sourceId);
                sources = sources.filter((s) => trustedIds.includes(s.id));
            }
            return sources;
        },
        getDivergenceZones: (_parent, args) => {
            const w = getWeaver();
            const fabric = w.getFabric(args.fabricId);
            if (!fabric) {
                throw new Error(`Fabric not found: ${args.fabricId}`);
            }
            let zones = fabric.divergenceZones;
            if (args.minDivergence !== undefined) {
                zones = zones.filter((z) => z.divergenceScore >= args.minDivergence);
            }
            return zones;
        },
        getWeavingConfig: (_parent, _args) => {
            // Return current config - in production, would fetch from DB
            return {
                id: 'default',
                name: 'Default Configuration',
                fusionMethod: SignalFuser_js_1.FusionMethod.ENSEMBLE_VOTING,
                conflictThreshold: 0.3,
                minSourcesRequired: 1,
                trustDecayRate: 0.01,
                temporalWeight: 0.1,
            };
        },
    },
    Mutation: {
        registerSource: (_parent, args) => {
            const w = getWeaver();
            return w.registerSource(args.input);
        },
        submitSignal: (_parent, args) => {
            const w = getWeaver();
            return w.submitSignal(args.input);
        },
        resolveConflict: (_parent, args) => {
            // In production, would fetch conflict and resolve
            return {
                id: args.input.conflictId,
                conflictingSignalIds: [],
                resolvedValue: args.input.resolvedValue,
                resolutionMethod: args.input.method,
                confidence: 0.8,
                reasoning: args.input.reasoning || 'Manual resolution',
                resolvedAt: new Date(),
            };
        },
        weaveFuture: (_parent, args) => {
            const w = getWeaver();
            const request = {
                domains: args.input.domains,
                horizon: args.input.horizon,
                minSources: args.input.minSources,
                fusionMethod: args.input.fusionMethod,
            };
            const result = w.weaveFuture(request);
            return result.fabric;
        },
        updateTrust: (_parent, args) => {
            const w = getWeaver();
            return w.updateTrust(args.sourceId, args.adjustment, args.reason);
        },
        setWeavingConfig: (_parent, args) => {
            // In production, would persist to DB
            return {
                id: crypto.randomUUID(),
                ...args.input,
                trustDecayRate: args.input.trustDecayRate ?? 0.01,
                temporalWeight: args.input.temporalWeight ?? 0.1,
            };
        },
        deregisterSource: (_parent, args) => {
            const w = getWeaver();
            return w.deregisterSource(args.sourceId);
        },
        invalidateSignal: (_parent, args) => {
            const w = getWeaver();
            return w.invalidateSignal(args.signalId, args.reason);
        },
    },
    // Field resolvers
    IntelligenceSource: {
        lastSignal: (source) => source.lastSignal || null,
    },
    SignalBraid: {
        signals: (braid) => {
            const w = getWeaver();
            return braid.signalIds
                .map((id) => w.getSignal(id))
                .filter((s) => s !== undefined);
        },
    },
    PredictiveSignal: {
        source: (signal) => {
            const w = getWeaver();
            return w.getSource(signal.sourceId);
        },
    },
    TrustScore: {
        source: (score) => {
            const w = getWeaver();
            return w.getSource(score.sourceId);
        },
    },
};
exports.default = exports.weavingResolvers;
