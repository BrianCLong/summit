"use strict";
/**
 * Future Weaver - Core Engine
 * Orchestrates the collective intelligence future weaving system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FutureWeaver = void 0;
exports.createFutureWeaver = createFutureWeaver;
const IntelligenceSource_js_1 = require("./models/IntelligenceSource.js");
const PredictiveSignal_js_1 = require("./models/PredictiveSignal.js");
const SignalBraid_js_1 = require("./models/SignalBraid.js");
const TrustScore_js_1 = require("./models/TrustScore.js");
const SignalFuser_js_1 = require("./algorithms/SignalFuser.js");
const ConflictResolver_js_1 = require("./algorithms/ConflictResolver.js");
const TrustCalculator_js_1 = require("./algorithms/TrustCalculator.js");
const FabricHarmonizer_js_1 = require("./algorithms/FabricHarmonizer.js");
const logger_js_1 = require("./utils/logger.js");
const logger = (0, logger_js_1.createLogger)('FutureWeaver');
class FutureWeaver {
    sources = new Map();
    signals = new Map();
    braids = new Map();
    fabrics = new Map();
    trustScores = new Map();
    fuser;
    conflictResolver;
    trustCalculator;
    harmonizer;
    config;
    constructor(config) {
        this.config = {
            fusionMethod: SignalFuser_js_1.FusionMethod.ENSEMBLE_VOTING,
            conflictThreshold: 0.3,
            minSourcesRequired: 1,
            trustDecayRate: 0.01,
            temporalWeight: 0.1,
            defaultHorizonHours: 24,
            ...config,
        };
        this.fuser = (0, SignalFuser_js_1.createFuser)({
            method: this.config.fusionMethod,
            minSources: this.config.minSourcesRequired,
            conflictThreshold: this.config.conflictThreshold,
            temporalWeight: this.config.temporalWeight,
        });
        this.conflictResolver = (0, ConflictResolver_js_1.createConflictResolver)({
            divergenceThreshold: this.config.conflictThreshold,
        });
        this.trustCalculator = (0, TrustCalculator_js_1.createTrustCalculator)({
            decayRate: this.config.trustDecayRate,
        });
        this.harmonizer = (0, FabricHarmonizer_js_1.createHarmonizer)({
            fusionMethod: this.config.fusionMethod,
            conflictThreshold: this.config.conflictThreshold,
            temporalWeight: this.config.temporalWeight,
        });
        logger.info('FutureWeaver initialized', { config: this.config });
    }
    // Source Management
    registerSource(input) {
        const source = IntelligenceSource_js_1.IntelligenceSourceFactory.create(input);
        this.sources.set(source.id, source);
        // Initialize trust score
        const trustScore = TrustScore_js_1.TrustScoreFactory.create(source.id, input.initialTrust);
        this.trustScores.set(source.id, trustScore);
        logger.info('Source registered', { sourceId: source.id, name: source.name });
        return source;
    }
    getSource(sourceId) {
        return this.sources.get(sourceId);
    }
    getAllSources() {
        return [...this.sources.values()];
    }
    deregisterSource(sourceId) {
        const deleted = this.sources.delete(sourceId);
        this.trustScores.delete(sourceId);
        logger.info('Source deregistered', { sourceId, success: deleted });
        return deleted;
    }
    // Signal Management
    submitSignal(input) {
        const source = this.sources.get(input.sourceId);
        if (!source) {
            throw new Error(`Source not found: ${input.sourceId}`);
        }
        const signal = PredictiveSignal_js_1.PredictiveSignalFactory.create(input);
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
    getSignal(signalId) {
        return this.signals.get(signalId);
    }
    getSignalsByDomain(domain) {
        return [...this.signals.values()].filter((s) => s.domain === domain && !PredictiveSignal_js_1.PredictiveSignalFactory.isExpired(s));
    }
    invalidateSignal(signalId, _reason) {
        return this.signals.delete(signalId);
    }
    // Braid Management
    createBraid(signalIds) {
        const signals = signalIds
            .map((id) => this.signals.get(id))
            .filter((s) => s !== undefined);
        if (signals.length === 0) {
            throw new Error('No valid signals for braid creation');
        }
        const braid = SignalBraid_js_1.SignalBraidFactory.create(signals);
        this.braids.set(braid.id, braid);
        logger.debug('Braid created', {
            braidId: braid.id,
            signalCount: signals.length,
        });
        return braid;
    }
    getBraid(braidId) {
        return this.braids.get(braidId);
    }
    getBraidsByDomain(domain) {
        return [...this.braids.values()].filter((b) => b.domains.includes(domain));
    }
    // Trust Management
    getTrustScore(sourceId) {
        return this.trustScores.get(sourceId);
    }
    getAllTrustScores() {
        return [...this.trustScores.values()];
    }
    updateTrust(sourceId, adjustment, reason) {
        let score = this.trustScores.get(sourceId);
        if (!score) {
            score = TrustScore_js_1.TrustScoreFactory.create(sourceId);
        }
        score = TrustScore_js_1.TrustScoreFactory.manualAdjustment(score, adjustment, reason);
        this.trustScores.set(sourceId, score);
        logger.info('Trust updated', { sourceId, adjustment, reason });
        return score;
    }
    verifyPrediction(sourceId, signalId, actualValue, wasAccurate) {
        this.trustCalculator.verifyPrediction(sourceId, signalId, actualValue, wasAccurate);
        const score = this.trustCalculator.calculateTrustScore(sourceId, this.trustScores.get(sourceId));
        this.trustScores.set(sourceId, score);
        return score;
    }
    // Weaving
    weaveFuture(request) {
        logger.info('Weaving future', { domains: request.domains, horizon: request.horizon });
        // Collect signals for requested domains
        const relevantSignals = [];
        for (const domain of request.domains) {
            relevantSignals.push(...this.getSignalsByDomain(domain));
        }
        if (relevantSignals.length === 0) {
            throw new Error('No signals available for requested domains');
        }
        // Create braids from signals grouped by domain
        const domainGroups = new Map();
        for (const signal of relevantSignals) {
            const existing = domainGroups.get(signal.domain) || [];
            domainGroups.set(signal.domain, [...existing, signal]);
        }
        const braids = [];
        for (const [_domain, signals] of domainGroups) {
            if (signals.length > 0) {
                const braid = SignalBraid_js_1.SignalBraidFactory.create(signals);
                this.braids.set(braid.id, braid);
                braids.push(braid);
            }
        }
        // Harmonize braids into fabric
        const result = this.harmonizer.harmonize(braids, this.signals, this.sources, this.trustScores, request.horizon || this.config.defaultHorizonHours);
        // Store the fabric
        this.fabrics.set(result.fabric.id, result.fabric);
        logger.info('Future woven', {
            fabricId: result.fabric.id,
            domains: result.fabric.domains,
            confidence: result.fabric.overallConfidence,
        });
        return result;
    }
    getFabric(fabricId) {
        return this.fabrics.get(fabricId);
    }
    getFabricByDomain(domain) {
        return [...this.fabrics.values()]
            .filter((f) => f.domains.includes(domain))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    }
    // Conflict Resolution
    getConflicts(domain) {
        const braidsWithConflicts = [];
        for (const braid of this.braids.values()) {
            if (domain && !braid.domains.includes(domain))
                continue;
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
    getStatistics() {
        const activeSignals = [...this.signals.values()].filter((s) => !PredictiveSignal_js_1.PredictiveSignalFactory.isExpired(s)).length;
        const trustValues = [...this.trustScores.values()].map((t) => t.overallScore);
        const averageTrust = trustValues.length > 0
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
    cleanupExpiredSignals() {
        let removed = 0;
        for (const [id, signal] of this.signals) {
            if (PredictiveSignal_js_1.PredictiveSignalFactory.isExpired(signal)) {
                this.signals.delete(id);
                removed++;
            }
        }
        logger.info('Cleanup completed', { removedSignals: removed });
        return removed;
    }
}
exports.FutureWeaver = FutureWeaver;
function createFutureWeaver(config) {
    return new FutureWeaver(config);
}
