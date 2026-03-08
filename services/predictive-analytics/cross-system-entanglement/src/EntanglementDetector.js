"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntanglementDetector = void 0;
const pino_1 = __importDefault(require("pino"));
const SystemCoupling_js_1 = require("./models/SystemCoupling.js");
const LatentCouplingFinder_js_1 = require("./algorithms/LatentCouplingFinder.js");
const SynchronizationDetector_js_1 = require("./algorithms/SynchronizationDetector.js");
const RiskScorer_js_1 = require("./algorithms/RiskScorer.js");
const CrossDomainCorrelator_js_1 = require("./algorithms/CrossDomainCorrelator.js");
const logger = (0, pino_1.default)({ name: 'EntanglementDetector' });
/**
 * Main orchestrator for cross-system entanglement detection
 */
class EntanglementDetector {
    config;
    couplingFinder;
    syncDetector;
    riskScorer;
    crossDomainCorrelator;
    // In-memory stores (production would use Redis/persistent storage)
    signatures = new Map();
    couplings = new Map();
    syncEvents = [];
    riskScores = new Map();
    constructor(config = {}) {
        this.config = {
            observationWindowMs: config.observationWindowMs ?? 300000,
            minCouplingStrength: config.minCouplingStrength ?? 0.7,
            scanIntervalMs: config.scanIntervalMs ?? 60000,
            confidenceThreshold: config.confidenceThreshold ?? 0.95,
        };
        this.couplingFinder = new LatentCouplingFinder_js_1.LatentCouplingFinder({
            minCorrelation: this.config.minCouplingStrength,
            minConfidence: this.config.confidenceThreshold,
            observationWindow: this.config.observationWindowMs,
        });
        this.syncDetector = new SynchronizationDetector_js_1.SynchronizationDetector({
            syncThreshold: 0.7,
        });
        this.riskScorer = new RiskScorer_js_1.RiskScorer();
        this.crossDomainCorrelator = new CrossDomainCorrelator_js_1.CrossDomainCorrelator({
            minCorrelation: this.config.minCouplingStrength,
        });
        logger.info({ config: this.config }, 'EntanglementDetector initialized');
    }
    /**
     * Detect entanglements across specified systems
     */
    async detectEntanglements(timeSeriesData, systemEvents) {
        logger.info({ systemCount: timeSeriesData.length }, 'Starting entanglement detection');
        const detectedAt = new Date();
        // 1. Find latent couplings
        const newSignatures = await this.couplingFinder.findCouplings(timeSeriesData);
        // Store signatures
        for (const signature of newSignatures) {
            this.signatures.set(signature.id, signature);
        }
        // 2. Create system couplings from signatures
        const newCouplings = this.createCouplingsFromSignatures(newSignatures);
        for (const coupling of newCouplings) {
            this.couplings.set(coupling.id, coupling);
        }
        // 3. Detect synchronization events if event data provided
        if (systemEvents && systemEvents.length > 0) {
            const syncEvents = await this.syncDetector.detectSynchronization(systemEvents);
            this.syncEvents.push(...syncEvents);
        }
        // 4. Calculate risk scores
        const systemIds = timeSeriesData.map((ts) => ts.systemId);
        const allCouplings = Array.from(this.couplings.values());
        const riskScores = await this.riskScorer.calculateRiskScores(systemIds, allCouplings);
        for (const [systemId, riskScore] of riskScores) {
            this.riskScores.set(systemId, riskScore);
        }
        logger.info({
            signaturesFound: newSignatures.length,
            couplingsCreated: newCouplings.length,
            riskScoresCalculated: riskScores.size,
        }, 'Entanglement detection complete');
        return {
            signatures: newSignatures,
            couplings: newCouplings,
            systems: systemIds,
            detectedAt,
            observationWindowMs: this.config.observationWindowMs,
            totalSignatures: this.signatures.size,
            totalCouplings: this.couplings.size,
        };
    }
    /**
     * Discover cross-domain correlations
     */
    async discoverCrossDomainCorrelations(domainMetrics) {
        logger.info('Starting cross-domain correlation discovery');
        const signatures = await this.crossDomainCorrelator.discoverCorrelations(domainMetrics);
        // Store discovered signatures
        for (const signature of signatures) {
            this.signatures.set(signature.id, signature);
        }
        logger.info({ signaturesFound: signatures.length }, 'Cross-domain correlation discovery complete');
        return signatures;
    }
    /**
     * Get entanglement map for all systems
     */
    getEntanglementMap(includeWeak = false, domainFilter) {
        let signatures = Array.from(this.signatures.values());
        let couplings = Array.from(this.couplings.values());
        // Filter weak couplings if requested
        if (!includeWeak) {
            signatures = signatures.filter((s) => s.couplingStrength >= this.config.minCouplingStrength);
            couplings = couplings.filter((c) => c.strength >= this.config.minCouplingStrength);
        }
        // Apply domain filter if provided
        if (domainFilter && domainFilter.length > 0) {
            // This would require domain metadata - simplified for now
            // Production would filter based on actual domain assignments
        }
        const systems = new Set();
        for (const signature of signatures) {
            signature.systems.forEach((s) => systems.add(s));
        }
        return {
            signatures,
            couplings,
            systems: Array.from(systems),
            detectedAt: new Date(),
            observationWindowMs: this.config.observationWindowMs,
            totalSignatures: signatures.length,
            totalCouplings: couplings.length,
        };
    }
    /**
     * Get couplings for a specific system
     */
    getCouplings(systemId, minStrength = 0.5) {
        return Array.from(this.couplings.values()).filter((c) => (c.sourceSystem === systemId || c.targetSystem === systemId) &&
            c.strength >= minStrength);
    }
    /**
     * Get risk score for a system
     */
    getRiskScore(systemId) {
        return this.riskScores.get(systemId);
    }
    /**
     * Get all risk scores
     */
    getAllRiskScores(systemIds) {
        if (systemIds && systemIds.length > 0) {
            return systemIds
                .map((id) => this.riskScores.get(id))
                .filter((rs) => rs !== undefined);
        }
        return Array.from(this.riskScores.values());
    }
    /**
     * Get synchronization events
     */
    getSynchronizationEvents(startTime, endTime, systemIds, minScore = 0.7) {
        let events = [...this.syncEvents];
        // Filter by time range
        if (startTime) {
            events = events.filter((e) => e.timestamp >= startTime);
        }
        if (endTime) {
            events = events.filter((e) => e.timestamp <= endTime);
        }
        // Filter by systems
        if (systemIds && systemIds.length > 0) {
            events = events.filter((e) => e.systems.some((s) => systemIds.includes(s)));
        }
        // Filter by score
        events = events.filter((e) => e.synchronizationScore >= minScore);
        return events;
    }
    /**
     * Create system couplings from entanglement signatures
     */
    createCouplingsFromSignatures(signatures) {
        const couplings = [];
        for (const signature of signatures) {
            // For each pair of systems in the signature
            for (let i = 0; i < signature.systems.length; i++) {
                for (let j = i + 1; j < signature.systems.length; j++) {
                    const system1 = signature.systems[i];
                    const system2 = signature.systems[j];
                    const coupling = (0, SystemCoupling_js_1.createSystemCoupling)(system1, system2, 'BIDIRECTIONAL', // Default to bidirectional
                    signature.couplingStrength, 'MUTUAL', 'latent-coupling-finder', {
                        failureCorrelation: signature.couplingStrength * 0.8, // Estimate
                        latencyCorrelation: signature.couplingStrength * 0.7, // Estimate
                        throughputCorrelation: signature.couplingStrength * 0.6, // Estimate
                    });
                    couplings.push(coupling);
                }
            }
        }
        return couplings;
    }
    /**
     * Clear all entanglement data (for testing)
     */
    clearAll() {
        this.signatures.clear();
        this.couplings.clear();
        this.syncEvents = [];
        this.riskScores.clear();
        logger.info('All entanglement data cleared');
    }
    /**
     * Get statistics
     */
    getStatistics() {
        const couplings = Array.from(this.couplings.values());
        const avgStrength = couplings.length > 0
            ? couplings.reduce((sum, c) => sum + c.strength, 0) / couplings.length
            : 0;
        const highRiskCount = Array.from(this.riskScores.values()).filter((rs) => rs.overallRisk >= 0.7).length;
        return {
            signatureCount: this.signatures.size,
            couplingCount: this.couplings.size,
            syncEventCount: this.syncEvents.length,
            riskScoreCount: this.riskScores.size,
            averageCouplingStrength: avgStrength,
            highRiskSystemCount: highRiskCount,
        };
    }
}
exports.EntanglementDetector = EntanglementDetector;
