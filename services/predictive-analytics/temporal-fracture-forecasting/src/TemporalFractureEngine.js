"use strict";
/**
 * TemporalFractureEngine - Core engine for fracture detection and prediction
 *
 * Orchestrates the various algorithms to detect phase transitions,
 * analyze stability, predict fractures, and generate recovery plans.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporalFractureEngine = void 0;
const PhaseTransitionDetector_js_1 = require("./algorithms/PhaseTransitionDetector.js");
const StabilityAnalyzer_js_1 = require("./algorithms/StabilityAnalyzer.js");
const FracturePredictor_js_1 = require("./algorithms/FracturePredictor.js");
const RecoveryRecommender_js_1 = require("./algorithms/RecoveryRecommender.js");
const SystemPhase_js_1 = require("./models/SystemPhase.js");
class TemporalFractureEngine {
    phaseDetector;
    stabilityAnalyzer;
    fracturePredictor;
    recoveryRecommender;
    constructor() {
        this.phaseDetector = new PhaseTransitionDetector_js_1.PhaseTransitionDetector({
            windowSize: 30,
            threshold: 0.05,
        });
        this.stabilityAnalyzer = new StabilityAnalyzer_js_1.StabilityAnalyzer({
            embeddingDimension: 3,
            timeDelay: 1,
        });
        this.fracturePredictor = new FracturePredictor_js_1.FracturePredictor({
            simulationCount: 1000,
            horizonHours: 72,
        });
        this.recoveryRecommender = new RecoveryRecommender_js_1.RecoveryRecommender();
    }
    /**
     * Generate complete fracture map for a system
     */
    async generateFractureMap(systemId, metricsData) {
        // Step 1: Detect current phase
        const phaseTransitions = this.phaseDetector.detect(metricsData);
        const currentPhase = this.determineCurrentPhase(systemId, phaseTransitions, metricsData);
        // Step 2: Analyze stability
        const stabilityMetric = this.stabilityAnalyzer.analyze(metricsData);
        // Update phase with stability info
        currentPhase.stability = {
            ...stabilityMetric,
            systemId,
        };
        // Step 3: Predict fractures
        const predictedFractures = await this.fracturePredictor.predict(systemId, metricsData, currentPhase, stabilityMetric);
        // Step 4: Generate recovery plans for each fracture
        const recommendations = predictedFractures.map((fracture) => this.recoveryRecommender.generatePlan(fracture, currentPhase));
        return {
            systemId,
            currentPhase,
            stabilityScore: stabilityMetric.stabilityScore,
            predictedFractures,
            recommendations,
            lastUpdated: new Date(),
        };
    }
    /**
     * Predict fractures for a specific horizon
     */
    async predictFractures(systemId, metricsData, horizonHours, confidenceThreshold = 0.7) {
        const stabilityMetric = this.stabilityAnalyzer.analyze(metricsData);
        const phaseTransitions = this.phaseDetector.detect(metricsData);
        const currentPhase = this.determineCurrentPhase(systemId, phaseTransitions, metricsData);
        currentPhase.stability = {
            ...stabilityMetric,
            systemId,
        };
        const fractures = await this.fracturePredictor.predict(systemId, metricsData, currentPhase, stabilityMetric, horizonHours);
        // Filter by confidence threshold
        return fractures.filter((f) => f.confidence >= confidenceThreshold);
    }
    /**
     * Get current system stability
     */
    getSystemStability(metricsData) {
        return this.stabilityAnalyzer.analyze(metricsData);
    }
    /**
     * Generate recovery plan for a fracture point
     */
    generateRecoveryPlan(fracturePoint, currentPhase) {
        return this.recoveryRecommender.generatePlan(fracturePoint, currentPhase);
    }
    /**
     * Determine current phase from transitions and data
     */
    determineCurrentPhase(systemId, transitions, metricsData) {
        let currentPhase = SystemPhase_js_1.PhaseState.STABLE;
        let lastTransitionTime = metricsData[0]?.timestamp || new Date();
        if (transitions.length > 0) {
            const lastTransition = transitions[transitions.length - 1];
            currentPhase = lastTransition.toPhase;
            lastTransitionTime = lastTransition.timestamp;
        }
        const now = new Date();
        const duration = Math.floor((now.getTime() - lastTransitionTime.getTime()) / 1000);
        // Calculate trends from recent data
        const trends = this.calculateTrends(metricsData);
        return new SystemPhase_js_1.SystemPhaseModel({
            systemId,
            current: currentPhase,
            duration,
            stability: {
                timestamp: now,
                systemId,
                lyapunovExponent: 0,
                stabilityScore: 0.5,
                isStable: true,
            },
            trends,
            lastTransition: transitions.length > 0 ? transitions[transitions.length - 1] : undefined,
        });
    }
    /**
     * Calculate metric trends
     */
    calculateTrends(metricsData) {
        if (metricsData.length < 10)
            return [];
        const recentData = metricsData.slice(-20);
        const olderData = metricsData.slice(-40, -20);
        const recentMean = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
        const olderMean = olderData.reduce((sum, d) => sum + d.value, 0) / olderData.length;
        const percentChange = olderMean !== 0 ? ((recentMean - olderMean) / olderMean) * 100 : 0;
        let direction = 'stable';
        if (percentChange > 5)
            direction = 'up';
        else if (percentChange < -5)
            direction = 'down';
        return [
            {
                metric: 'value',
                direction,
                magnitude: Math.abs(percentChange),
                confidence: 0.8,
            },
        ];
    }
    /**
     * Monitor system continuously
     */
    async startMonitoring(systemId, metricsConfig, onFractureDetected) {
        // This would integrate with a real metrics source (TimescaleDB, Prometheus, etc.)
        // For now, return a cleanup function
        const interval = setInterval(async () => {
            // In real implementation:
            // 1. Fetch latest metrics from TimescaleDB
            // 2. Run fracture detection
            // 3. Call onFractureDetected if new fractures found
        }, metricsConfig.samplingIntervalSeconds * 1000);
        return () => clearInterval(interval);
    }
    /**
     * Validate metrics data
     */
    validateMetricsData(data) {
        if (!data || data.length === 0)
            return false;
        // Check for required fields
        return data.every((d) => d.timestamp instanceof Date &&
            !isNaN(d.timestamp.getTime()) &&
            typeof d.value === 'number' &&
            !isNaN(d.value));
    }
    /**
     * Get algorithm configuration
     */
    getConfiguration() {
        return {
            phaseDetection: {
                windowSize: 30,
                threshold: 0.05,
            },
            stabilityAnalysis: {
                embeddingDimension: 3,
                timeDelay: 1,
            },
            fracturePrediction: {
                simulationCount: 1000,
                horizonHours: 72,
            },
        };
    }
    /**
     * Update algorithm configuration
     */
    updateConfiguration(config) {
        // Allow dynamic configuration updates
        if (config.phaseDetection) {
            this.phaseDetector = new PhaseTransitionDetector_js_1.PhaseTransitionDetector(config.phaseDetection);
        }
        if (config.stabilityAnalysis) {
            this.stabilityAnalyzer = new StabilityAnalyzer_js_1.StabilityAnalyzer(config.stabilityAnalysis);
        }
        if (config.fracturePrediction) {
            this.fracturePredictor = new FracturePredictor_js_1.FracturePredictor(config.fracturePrediction);
        }
    }
}
exports.TemporalFractureEngine = TemporalFractureEngine;
