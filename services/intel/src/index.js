"use strict";
/**
 * IntelGraph SIGINT/MASINT Intelligence Fusion Service
 *
 * Provides spectrum analysis, sensor fusion, signature matching,
 * and intelligence correlation capabilities for the Summit platform.
 *
 * Features:
 * - SIGINT spectrum analysis with waveform decoding
 * - MASINT multi-sensor fusion with Kalman filtering
 * - Signature matching agents
 * - Pattern recognition and anomaly detection
 * - Neo4j entity correlation for edge-denied operations
 * - Redis-cached alerting with p95 < 2s latency
 * - OSINT/CTI integration
 * - ODNI intelligence gap tracking
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelFusionService = exports.logger = exports.OsintFusionEngine = exports.AlertCache = exports.Neo4jCorrelator = exports.PatternAgent = exports.SignatureMatcher = exports.SensorFusionEngine = exports.SpectrumAnalyzer = exports.WaveformDecoder = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Spectrum Analysis
var waveform_decoder_js_1 = require("./spectrum/waveform-decoder.js");
Object.defineProperty(exports, "WaveformDecoder", { enumerable: true, get: function () { return waveform_decoder_js_1.WaveformDecoder; } });
var spectrum_analyzer_js_1 = require("./spectrum/spectrum-analyzer.js");
Object.defineProperty(exports, "SpectrumAnalyzer", { enumerable: true, get: function () { return spectrum_analyzer_js_1.SpectrumAnalyzer; } });
// Sensor Fusion
var sensor_fusion_js_1 = require("./fusion/sensor-fusion.js");
Object.defineProperty(exports, "SensorFusionEngine", { enumerable: true, get: function () { return sensor_fusion_js_1.SensorFusionEngine; } });
// Agents
var signature_matcher_js_1 = require("./agents/signature-matcher.js");
Object.defineProperty(exports, "SignatureMatcher", { enumerable: true, get: function () { return signature_matcher_js_1.SignatureMatcher; } });
var pattern_agent_js_1 = require("./agents/pattern-agent.js");
Object.defineProperty(exports, "PatternAgent", { enumerable: true, get: function () { return pattern_agent_js_1.PatternAgent; } });
// Correlation
var neo4j_correlator_js_1 = require("./correlation/neo4j-correlator.js");
Object.defineProperty(exports, "Neo4jCorrelator", { enumerable: true, get: function () { return neo4j_correlator_js_1.Neo4jCorrelator; } });
// Cache
var alert_cache_js_1 = require("./cache/alert-cache.js");
Object.defineProperty(exports, "AlertCache", { enumerable: true, get: function () { return alert_cache_js_1.AlertCache; } });
// OSINT
var osint_fusion_js_1 = require("./osint/osint-fusion.js");
Object.defineProperty(exports, "OsintFusionEngine", { enumerable: true, get: function () { return osint_fusion_js_1.OsintFusionEngine; } });
// Utils
var logger_js_1 = require("./utils/logger.js");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_js_1.logger; } });
/**
 * IntelFusionService - Unified service orchestrating all intelligence components
 */
const spectrum_analyzer_js_2 = require("./spectrum/spectrum-analyzer.js");
const sensor_fusion_js_2 = require("./fusion/sensor-fusion.js");
const signature_matcher_js_2 = require("./agents/signature-matcher.js");
const pattern_agent_js_2 = require("./agents/pattern-agent.js");
const neo4j_correlator_js_2 = require("./correlation/neo4j-correlator.js");
const alert_cache_js_2 = require("./cache/alert-cache.js");
const osint_fusion_js_2 = require("./osint/osint-fusion.js");
const logger_js_2 = require("./utils/logger.js");
class IntelFusionService {
    spectrumAnalyzer;
    sensorFusion;
    signatureMatcher;
    patternAgent;
    correlator = null;
    alertCache = null;
    osintEngine = null;
    config;
    initialized = false;
    constructor(config = {}) {
        this.config = {
            tenantId: config.tenantId || 'default',
            enableNeo4j: config.enableNeo4j ?? true,
            enableRedis: config.enableRedis ?? true,
            enableOsint: config.enableOsint ?? true,
        };
        // Initialize core components
        this.spectrumAnalyzer = new spectrum_analyzer_js_2.SpectrumAnalyzer();
        this.sensorFusion = new sensor_fusion_js_2.SensorFusionEngine();
        this.signatureMatcher = new signature_matcher_js_2.SignatureMatcher();
        this.patternAgent = new pattern_agent_js_2.PatternAgent();
        // Wire up callbacks
        this.setupCallbacks();
    }
    /**
     * Initialize all services
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            // Initialize Neo4j correlator
            if (this.config.enableNeo4j) {
                this.correlator = new neo4j_correlator_js_2.Neo4jCorrelator();
                await this.correlator.connect();
                this.correlator.onAlert((alert) => this.handleAlert(alert));
            }
            // Initialize Redis alert cache
            if (this.config.enableRedis) {
                this.alertCache = new alert_cache_js_2.AlertCache();
                await this.alertCache.connect();
            }
            // Initialize OSINT engine
            if (this.config.enableOsint) {
                this.osintEngine = new osint_fusion_js_2.OsintFusionEngine();
                this.osintEngine.onAlert((alert) => this.handleAlert(alert));
            }
            this.initialized = true;
            logger_js_2.logger.info({ message: 'Intel fusion service initialized' });
        }
        catch (error) {
            logger_js_2.logger.error({
                message: 'Failed to initialize intel fusion service',
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Setup internal callbacks
     */
    setupCallbacks() {
        // Spectrum analyzer alerts
        this.spectrumAnalyzer.onAlert((alert) => this.handleAlert(alert));
        // Spectrum analyzer signature matching
        this.spectrumAnalyzer.onSignatureMatch((waveform) => this.signatureMatcher.matchWaveform(waveform));
        // Sensor fusion alerts
        this.sensorFusion.onAlert((alert) => this.handleAlert(alert));
        // Pattern agent alerts
        this.patternAgent.onAlert((alert) => this.handleAlert(alert));
    }
    /**
     * Handle alert from any component
     */
    async handleAlert(alert) {
        if (this.alertCache) {
            const { latencyMs } = await this.alertCache.publishAlert(alert);
            logger_js_2.logger.debug({
                message: 'Alert published',
                alertId: alert.id,
                type: alert.type,
                latencyMs,
            });
        }
    }
    /**
     * Process spectrum data
     */
    async processSpectrum(samples, sampleRate) {
        const signal = await this.spectrumAnalyzer.processSpectrum(samples, sampleRate);
        if (signal) {
            // Correlate with graph
            if (this.correlator) {
                await this.correlator.storeSignal(signal, this.config.tenantId);
                const correlations = await this.correlator.correlateSignal(signal, this.config.tenantId);
                await this.spectrumAnalyzer.correlateEntities(signal.id, correlations.map((c) => c.entityId));
            }
            // Pattern analysis
            await this.patternAgent.analyzeSignal(signal);
            // OSINT correlation
            if (this.osintEngine) {
                await this.osintEngine.correlateSignal(signal);
            }
        }
        return signal;
    }
    /**
     * Process sensor reading
     */
    async processSensorReading(reading) {
        const track = await this.sensorFusion.processSensorReading(reading);
        if (track) {
            // Correlate with graph
            if (this.correlator) {
                await this.correlator.storeTrack(track, this.config.tenantId);
                const correlations = await this.correlator.correlateTrack(track, this.config.tenantId);
                for (const corr of correlations) {
                    this.sensorFusion.associateEntity(track.id, corr.entityId);
                }
            }
            // Pattern analysis
            await this.patternAgent.analyzeTrack(track);
            // OSINT correlation
            if (this.osintEngine) {
                await this.osintEngine.correlateTrack(track);
            }
        }
        return track;
    }
    /**
     * Get active signals
     */
    getActiveSignals() {
        return this.spectrumAnalyzer.getActiveSignals();
    }
    /**
     * Get active tracks
     */
    getActiveTracks() {
        return this.sensorFusion.getTracks();
    }
    /**
     * Get recent alerts
     */
    async getRecentAlerts(limit = 100) {
        if (!this.alertCache) {
            return [];
        }
        return this.alertCache.getRecentAlerts(limit);
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            spectrum: this.spectrumAnalyzer.getStatistics(),
            fusion: this.sensorFusion.getStatistics(),
            signatures: this.signatureMatcher.getStatistics(),
            patterns: this.patternAgent.getPatterns().length,
            osint: this.osintEngine?.getStatistics(),
            alerts: this.alertCache?.getMetrics(),
            odniGaps: this.correlator?.getOdniGapStatus(),
        };
    }
    /**
     * Health check
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            initialized: this.initialized,
        };
        if (this.correlator) {
            health.neo4j = await this.correlator.healthCheck();
        }
        if (this.alertCache) {
            health.redis = await this.alertCache.healthCheck();
        }
        return health;
    }
    /**
     * Shutdown service
     */
    async shutdown() {
        if (this.correlator) {
            await this.correlator.close();
        }
        if (this.alertCache) {
            await this.alertCache.close();
        }
        this.initialized = false;
        logger_js_2.logger.info({ message: 'Intel fusion service shutdown' });
    }
}
exports.IntelFusionService = IntelFusionService;
exports.default = IntelFusionService;
